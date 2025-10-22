import {
	getChannel,
	getLayer,
	compareAttrs,
	setDefaultValue,
	setTransition,
	getTimeSincePlay,
	calculatePlayAttributes,
	frames2TimeChannel,
	addContext,
	fixPlayCommandInput,
	time2FramesChannel,
	addCommands,
	literal,
} from '../util'
import { InternalState } from '../stateObjectStorage'
import {
	State,
	LayerContentType,
	MediaLayer,
	TemplateLayer,
	HtmlPageLayer,
	InputLayer,
	RouteLayer,
	RecordLayer,
	FunctionLayer,
	NextUp,
	Transition,
	MediaLayerBase,
} from '../api'
import { OptionsInterface, DiffCommands } from '../casparCGState'
import { AMCPCommand, CallCommand, Commands, PlayCommand, ResumeCommand } from 'casparcg-connection'
import _ = require('underscore')
import { RouteMode } from 'casparcg-connection/dist/enums'

export { resolveForegroundState, diffForeground }

function diffForeground(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string,
	minTimeSincePlay: number
): string | null {
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	let diff = compareAttrs(newLayer, oldLayer, ['content'])

	if (!diff) {
		if (newLayer.content === LayerContentType.MEDIA) {
			const nl: MediaLayer = newLayer as MediaLayer
			const ol: MediaLayer = oldLayer as MediaLayer

			setDefaultValue([nl, ol], ['seek', 'length', 'inPoint', 'pauseTime'], 0)
			setDefaultValue([nl, ol], ['looping', 'playing'], false)

			const attrs: Array<keyof MediaLayer> = [
				'media',
				// 'playTime',
				'looping',
				'seek',
				'length',
				'inPoint',
				'pauseTime',
				'playing',
				'channelLayout',
				'vfilter',
				'afilter',
			]
			// Only diff playTime if the new state cares about the value
			if (nl.playTime !== null) attrs.push('playTime')

			diff = compareAttrs(nl, ol, attrs, minTimeSincePlay)
		} else if (newLayer.content === LayerContentType.TEMPLATE) {
			const nl: TemplateLayer = newLayer as TemplateLayer
			const ol: TemplateLayer = oldLayer as TemplateLayer

			setDefaultValue([nl, ol], ['templateType'], '')

			diff = compareAttrs(nl, ol, ['media', 'templateType'])
		} else if (newLayer.content === LayerContentType.HTMLPAGE) {
			const nl: HtmlPageLayer = newLayer as HtmlPageLayer
			const ol: HtmlPageLayer = oldLayer as HtmlPageLayer

			setDefaultValue([nl, ol], ['media'], '')

			diff = compareAttrs(nl, ol, ['media'])
		} else if (newLayer.content === LayerContentType.INPUT) {
			const nl: InputLayer = newLayer as InputLayer
			const ol: InputLayer = oldLayer as InputLayer

			diff = compareAttrs(nl, ol, ['media'])

			setDefaultValue([nl.input, ol.input], ['device', 'format', 'channelLayout'], '')

			if (!diff) {
				diff = compareAttrs(nl.input, ol.input, ['device', 'format'])
			}
		} else if (newLayer.content === LayerContentType.ROUTE) {
			const nl: RouteLayer = newLayer as RouteLayer
			const ol: RouteLayer = oldLayer as RouteLayer

			diff = compareAttrs(nl, ol, [])

			setDefaultValue([nl.route, ol.route], ['channel', 'layer'], 0)

			diff = compareAttrs(nl.route, ol.route, ['channel', 'layer', 'channelLayout'])
			if (!diff) {
				diff = compareAttrs(nl, ol, ['delay', 'mode'])
			}
		} else if (newLayer.content === LayerContentType.RECORD) {
			const nl: RecordLayer = newLayer as RecordLayer
			const ol: RecordLayer = oldLayer as RecordLayer

			setDefaultValue([nl, ol], ['encoderOptions'], '')

			diff = compareAttrs(nl, ol, ['media', 'playTime', 'encoderOptions'], minTimeSincePlay)
		} else if (newLayer.content === LayerContentType.FUNCTION) {
			const nl: FunctionLayer = newLayer as FunctionLayer
			const ol: FunctionLayer = oldLayer as FunctionLayer

			diff = compareAttrs(nl, ol, ['media'])
		}
	}

	return diff
}

function resolveForegroundState(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string,
	currentTime: number,
	minTimeSincePlay: number
): { commands: DiffCommands; bgCleared: boolean } {
	const oldChannel = getChannel(oldState, channel)
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: [],
	}
	let bgCleared = false

	if (newLayer) {
		let diff = diffForeground(oldState, newState, channel, layer, minTimeSincePlay)

		if (diff) {
			// Added things:

			const options: OptionsInterface = {
				channel: newChannel.channelNo,
				layer: newLayer.layerNo,
			}

			setTransition(options, newChannel, oldLayer, newLayer.media, false)

			if (newLayer.content === LayerContentType.MEDIA && newLayer.media) {
				const nl: MediaLayer = newLayer as MediaLayer
				const ol: MediaLayer = oldLayer as MediaLayer

				const timeSincePlay = getTimeSincePlay(nl, currentTime, minTimeSincePlay)

				let diffMediaFromBg = compareAttrs<MediaLayerBase>(nl, ol.nextUp, ['media'])
				if (options.transition) {
					diffMediaFromBg = 'transition'
				} // transition changed, so we need to reset

				const oldUseLayer: MediaLayer | NextUp =
					ol.nextUp && !diffMediaFromBg // current media is the one in background
						? ol.nextUp
						: ol

				const oldTimeSincePlay = ol.nextUp && !diffMediaFromBg ? 0 : getTimeSincePlay(ol, currentTime, minTimeSincePlay)

				const { inPointFrames, lengthFrames, seekFrames, looping, channelLayout } = calculatePlayAttributes(
					timeSincePlay,
					nl,
					newChannel,
					oldChannel
				)

				const {
					inPointFrames: oldInPointFrames,
					lengthFrames: oldLengthFrames,
					seekFrames: oldSeekFrames,
					looping: oldLooping,
					channelLayout: oldChannelLayout,
				} = calculatePlayAttributes(oldTimeSincePlay, oldUseLayer, newChannel, oldChannel)

				if (nl.playing) {
					nl.pauseTime = 0

					const newMedia = compareAttrs(nl, ol, ['media'])
					const seekDiff = frames2TimeChannel(Math.abs(oldSeekFrames - seekFrames), newChannel, oldChannel)

					const seekIsSmall: boolean = seekDiff < minTimeSincePlay

					if (!newMedia && ol.pauseTime && seekIsSmall) {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Resume,
									params: {
										...options,
									},
								}),
								`Seek is small (${seekDiff})`,
								nl
							)
						)
					} else {
						let context = ''
						if (newMedia && diffMediaFromBg) {
							context = `Media diff from bg: ${newMedia} (${diffMediaFromBg})`
						}
						if ((inPointFrames || 0) !== (oldInPointFrames || 0)) {
							context = `Inpoints diff (${inPointFrames}, ${oldInPointFrames})`
						} // temporary, until CALL IN command works satisfactory in CasparCG
						if ((lengthFrames || 0) !== (oldLengthFrames || 0)) {
							context = `Length diff (${lengthFrames}, ${lengthFrames})`
						} // temporary, until CALL LENGTH command works satisfactory in CasparCG
						if (!seekIsSmall) {
							context = `Seek diff is large (${seekDiff})`
						}
						if (looping !== oldLooping) {
							context = `Looping diff (${looping}, ${oldLooping})`
						} // temporary, until CALL LOOP works satisfactory in CasparCG
						if (channelLayout !== oldChannelLayout) {
							context = `ChannelLayout diff (${channelLayout}, ${oldChannelLayout})`
						} // temporary, until CallCommand with channelLayout is implemented in ccg-conn (& casparcg?)
						if (oldUseLayer.content !== LayerContentType.MEDIA || oldUseLayer.afilter !== nl.afilter) {
							context = `AFilter diff ("${ol.afilter}", "${nl.afilter}")`
						}
						if (oldUseLayer.content !== LayerContentType.MEDIA || oldUseLayer.vfilter !== nl.vfilter) {
							context = `VFilter diff ("${ol.vfilter}", "${nl.vfilter}")`
						}
						if (context) {
							context += ` (${diff})`

							addCommands(
								diffCmds,
								addContext(
									literal<PlayCommand>({
										command: Commands.Play,
										params: fixPlayCommandInput({
											...options,
											clip: (nl.media || '').toString(),
											inPoint: inPointFrames,
											seek: seekFrames,
											length: lengthFrames || undefined,
											loop: !!nl.looping,
											channelLayout: nl.channelLayout,
											clearOn404: nl.clearOn404,
											aFilter: nl.afilter,
											vFilter: nl.vfilter,
										}),
									}),
									context,
									nl
								)
							)
							bgCleared = true
						} else if (!diffMediaFromBg) {
							addCommands(
								diffCmds,
								addContext(
									literal<PlayCommand>({
										command: Commands.Play,
										params: { ...options },
									}),
									`No Media diff from bg (${nl.media})`,
									nl
								)
							)
							bgCleared = true
						} else {
							addCommands(
								diffCmds,
								addContext(
									literal<ResumeCommand>({ command: Commands.Resume, params: { ...options } }),
									`Resume otherwise (${diff})`,
									nl
								)
							)
							if (oldSeekFrames !== seekFrames && !nl.looping) {
								addCommands(
									diffCmds,
									addContext(
										literal<CallCommand>({
											command: Commands.Call,
											params: { ...options, param: 'SEEK', value: seekFrames },
										}),
										`Seek diff (${seekFrames}, ${oldSeekFrames})`,
										nl
									)
								)
							}
							if (ol.looping !== nl.looping) {
								addCommands(
									diffCmds,
									addContext(
										literal<CallCommand>({
											command: Commands.Call,
											params: { ...options, param: 'LOOP', value: nl.looping ? 1 : 0 },
										}),
										`Loop diff (${nl.looping}, ${ol.looping})`,
										nl
									)
								)
							}
							if (ol.channelLayout !== nl.channelLayout) {
								addCommands(
									diffCmds,
									addContext(
										{
											command: Commands.Call,
											params: {
												...options,
												param: 'channelLayout',
												value: nl.channelLayout + '',
											},
										},
										`ChannelLayout diff (${nl.channelLayout}, ${ol.channelLayout})`,
										nl
									)
								)
							}
						}
					}
				} else {
					let context = ''
					if (_.isNull(timeSincePlay)) {
						context = `TimeSincePlay is null (${diff})`
					}
					if (nl.pauseTime && timeSincePlay! > minTimeSincePlay) {
						context = `pauseTime is set (${diff})`
					}
					if (context && !compareAttrs(nl, ol, ['media'])) {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Pause,
									params: {
										...options,
										// todo: missing param - where is this used?
										// pauseTime: nl.pauseTime
									},
								}),
								context,
								nl
							)
						)
					} else {
						if (diffMediaFromBg) {
							addCommands(
								diffCmds,
								addContext(
									literal<AMCPCommand>({
										command: Commands.Load,
										params: {
											...options,
											clip: (nl.media || '').toString(),
											inPoint: inPointFrames,
											seek: seekFrames,
											length: lengthFrames || undefined,
											loop: !!nl.looping,

											// todo - missing params
											// pauseTime: nl.pauseTime,
											channelLayout: nl.channelLayout,
											clearOn404: nl.clearOn404,

											aFilter: nl.afilter,
											vFilter: nl.vfilter,
										},
									}),
									`Load / Pause otherwise (${diff})`,
									nl
								)
							)
						} else {
							addCommands(
								diffCmds,
								addContext(
									literal<AMCPCommand>({
										command: Commands.Load,
										params: {
											...options,

											aFilter: nl.afilter,
											vFilter: nl.vfilter,
										},
									}),
									`No Media diff from bg (${nl.media})`,
									nl
								)
							)
						}
						bgCleared = true
					}
				}
			} else if (newLayer.content === LayerContentType.TEMPLATE && newLayer.media !== null) {
				const nl: TemplateLayer = newLayer as TemplateLayer
				// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.CgAdd,
							params: {
								...options,

								template: (nl.media || '').toString(),
								cgLayer: 1,
								playOnLoad: nl.playing,
								data: nl.templateData || undefined,

								// cgStop: nl.cgStop,
								// templateType: nl.templateType
							},
						}),
						`Add Template (${diff})`,
						nl
					)
				)
				bgCleared = true
			} else if (newLayer.content === LayerContentType.HTMLPAGE && newLayer.media !== null) {
				const nl: HtmlPageLayer = newLayer as HtmlPageLayer
				// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.PlayHtml,
							params: {
								...options,
								url: (nl.media || '').toString(),
							},
						}),
						`Add HTML page (${diff})`,
						nl
					)
				)
				bgCleared = true
			} else if (newLayer.content === LayerContentType.INPUT && newLayer.media !== null) {
				const nl: InputLayer = newLayer as InputLayer
				// let ol: CasparCG.IInputLayer = oldLayer as CasparCG.IInputLayer

				const inputType: string = (nl.input && nl.media && (nl.media || '').toString()) || 'decklink'
				const device: number | null = nl.input && nl.input.device
				const format: string | null = (nl.input && nl.input.format) || null
				console.log('format', format)
				const channelLayout: string | null = (nl.input && nl.input.channelLayout) || null

				if (inputType === 'decklink') {
					addCommands(
						diffCmds,
						addContext(
							literal<AMCPCommand>({
								command: Commands.PlayDecklink,
								params: {
									...options,
									device: device,
									format: format || undefined,
									// filter: nl.filter,
									channelLayout: channelLayout || undefined,
									aFilter: nl.afilter,
									vFilter: nl.vfilter,
								},
							}),
							`Add decklink (${diff})`,
							nl
						)
					)
					bgCleared = true
				}
			} else if (newLayer.content === LayerContentType.ROUTE) {
				const nl: RouteLayer = newLayer as RouteLayer
				const olNext: RouteLayer = oldLayer.nextUp as any

				if (nl.route) {
					// const routeChannel: number = nl.route.channel
					// const routeLayer: number | null = nl.route.layer || null
					const mode = nl.mode
					const framesDelay: number | undefined = nl.delay
						? Math.floor(time2FramesChannel(nl.delay, newChannel, oldChannel))
						: undefined
					const diffMediaFromBg =
						!olNext ||
						!olNext.route ||
						!(
							nl.route.channel === olNext.route.channel &&
							nl.route.layer === olNext.route.layer &&
							nl.delay === olNext.delay
						)

					if (diffMediaFromBg) {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.PlayRoute,
									params: {
										...options,

										route: {
											channel: nl.route.channel,
											layer: nl.route.layer === null ? undefined : nl.route.layer, // todo - replace with "?? undefined"
										},
										mode: mode as RouteMode,
										framesDelay,

										aFilter: nl.afilter,
										vFilter: nl.vfilter,
									},
								}),
								`Route: diffMediaFromBg (${diff})`,
								nl
							)
						)
					} else {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Play,
									params: {
										...options,
									},
								}),
								`Route: no diffMediaFromBg (${diff})`,
								nl
							)
						)
					}
					bgCleared = true
				}
			} else if (newLayer.content === LayerContentType.RECORD && newLayer.media !== null) {
				const nl: RecordLayer = newLayer as RecordLayer
				// let ol: CasparCG.IRecordLayer = oldLayer as CasparCG.IRecordLayer

				const media: any = nl.media
				const encoderOptions: any = nl.encoderOptions || ''
				// const playTime: any = nl.playTime

				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.Add,
							params: {
								channel: options.channel,
								consumer: 'FILE',
								parameters: media + ' ' + encoderOptions,
								// playTime
							},
						}),
						`Record (${diff})`,
						nl
					)
				)
				bgCleared = true // just to be sure
			} else if (newLayer.content === LayerContentType.FUNCTION) {
				// const nl: FunctionLayer = newLayer as FunctionLayer
				// let ol: CasparCG.IFunctionLayer = oldLayer as CasparCG.IFunctionLayer
				// if (nl.media && nl.executeFcn) {
				// 	let cmd: AMCPCommandVOWithContext = {
				// 		channel: options.channel,
				// 		layer: options.layer,
				// 		_commandName: 'executeFunction',
				// 		// @ts-ignore special: nl.media used for diffing
				// 		media: nl.media,
				// 		externalFunction: true
				// 	}
				// 	if (nl.executeFcn === 'special_osc') {
				// 		cmd = _.extend(cmd, {
				// 			specialFunction: 'osc',
				// 			oscDevice: nl.oscDevice,
				// 			message: nl.inMessage
				// 		})
				// 	} else {
				// 		cmd = _.extend(cmd, {
				// 			functionName: nl.executeFcn,
				// 			functionData: nl.executeData,
				// 			functionLayer: nl
				// 		})
				// 	}
				// 	cmd = addContext(cmd as any, `Function (${diff})`, nl)
				// 	addCommands(diffCmds, cmd)
				// }
			} else {
				// oldLayer had content, newLayer had no content, newLayer has a nextup
				if (
					oldLayer.content === LayerContentType.MEDIA ||
					oldLayer.content === LayerContentType.INPUT ||
					oldLayer.content === LayerContentType.HTMLPAGE ||
					oldLayer.content === LayerContentType.ROUTE
					// || oldLayer.content === CasparCG.LayerContentType.MEDIA ???
				) {
					if (_.isObject(oldLayer.media) && oldLayer.media.outTransition) {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Play,
									params: {
										channel: oldChannel.channelNo,
										layer: oldLayer.layerNo,
										clip: 'empty',
										...new Transition(oldLayer.media.outTransition).getOptions(oldChannel.fps),
									},
								}),
								`No new content, but old outTransition (${newLayer.content})`,
								oldLayer
							)
						)
						bgCleared = true
					} else {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Stop,
									params: {
										...options,
									},
								}),
								`No new content (${newLayer.content})`,
								oldLayer
							)
						)
					}
				} else if (oldLayer.content === LayerContentType.TEMPLATE) {
					const ol = oldLayer as TemplateLayer
					if (ol.cgStop) {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.CgStop,
									params: {
										...options,
										cgLayer: 1,
									},
								}),
								`No new content, but old cgCgStop (${newLayer.content})`,
								oldLayer
							)
						)
					} else {
						addCommands(
							diffCmds,
							addContext(
								literal<AMCPCommand>({
									command: Commands.Clear,
									params: { ...options },
								}),
								`No new content (${newLayer.content})`,
								oldLayer
							)
						)
						bgCleared = true
					}
				} else if (oldLayer.content === LayerContentType.RECORD) {
					addCommands(
						diffCmds,
						addContext(
							literal<AMCPCommand>({
								command: Commands.Remove,
								params: {
									channel: oldChannel.channelNo,
									consumer: 'FILE',
								},
							}),
							`No new content (${newLayer.content})`,
							oldLayer
						)
					)
				}
			}
		} else if (newLayer.content === LayerContentType.TEMPLATE) {
			const nl: TemplateLayer = newLayer as TemplateLayer
			const ol: TemplateLayer = oldLayer as TemplateLayer

			diff = compareAttrs(nl, ol, ['templateData'])

			if (diff) {
				// Updated things:
				const options: any = {}
				options.channel = newChannel.channelNo
				options.layer = nl.layerNo

				if (nl.content === LayerContentType.TEMPLATE) {
					addCommands(
						diffCmds,
						addContext(
							literal<AMCPCommand>({
								command: Commands.CgUpdate,
								params: {
									...options,
									cgLayer: 1,
									data: nl.templateData,
								},
							}),
							`Updated templateData`,
							newLayer
						)
					)
				}
			}
		}
	}

	return {
		commands: diffCmds,
		bgCleared,
	}
}
