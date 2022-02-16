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
	addCommands
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
	TransitionObject,
	MediaLayerBase
} from '../api'
import { OptionsInterface, AMCPCommandVOWithContext, DiffCommands } from '../casparCGState'
import { AMCP } from 'casparcg-connection'
import _ = require('underscore')

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
				'afilter'
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

			diff = compareAttrs(nl, ol, ['media', 'filter', 'vfilter', 'afilter'])

			setDefaultValue([nl.input, ol.input], ['device', 'format', 'channelLayout'], '')

			if (!diff) {
				diff = compareAttrs(nl.input, ol.input, ['device', 'format'])
			}
		} else if (newLayer.content === LayerContentType.ROUTE) {
			const nl: RouteLayer = newLayer as RouteLayer
			const ol: RouteLayer = oldLayer as RouteLayer

			diff = compareAttrs(nl, ol, ['vfilter', 'afilter'])

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
) {
	const oldChannel = getChannel(oldState, channel)
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: []
	}
	let bgCleared = false

	if (newLayer) {
		let diff = diffForeground(oldState, newState, channel, layer, minTimeSincePlay)

		if (diff) {
			// Added things:

			const options: OptionsInterface = {
				channel: newChannel.channelNo,
				layer: newLayer.layerNo,
				noClear: !!newLayer.noClear
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

				const oldTimeSincePlay =
					ol.nextUp && !diffMediaFromBg ? 0 : getTimeSincePlay(ol, currentTime, minTimeSincePlay)

				const {
					inPointFrames,
					lengthFrames,
					seekFrames,
					looping,
					channelLayout
				} = calculatePlayAttributes(timeSincePlay, nl, newChannel, oldChannel)

				const {
					inPointFrames: oldInPointFrames,
					lengthFrames: oldLengthFrames,
					seekFrames: oldSeekFrames,
					looping: oldLooping,
					channelLayout: oldChannelLayout
				} = calculatePlayAttributes(oldTimeSincePlay, oldUseLayer, newChannel, oldChannel)

				if (nl.playing) {
					nl.pauseTime = 0

					const newMedia = compareAttrs(nl, ol, ['media'])
					const seekDiff = frames2TimeChannel(
						Math.abs(oldSeekFrames - seekFrames),
						newChannel,
						oldChannel
					)

					const seekIsSmall: boolean = seekDiff < minTimeSincePlay

					if (!newMedia && ol.pauseTime && seekIsSmall) {
						addCommands(
							diffCmds,
							addContext(new AMCP.ResumeCommand(options as any), `Seek is small (${seekDiff})`, nl)
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
						if (ol.afilter !== nl.afilter) {
							context = `AFilter diff ("${ol.afilter}", "${nl.afilter}")`
						}
						if (ol.vfilter !== nl.vfilter) {
							context = `VFilter diff ("${ol.vfilter}", "${nl.vfilter}")`
						}
						if (context) {
							context += ` (${diff})`

							addCommands(
								diffCmds,
								addContext(
									new AMCP.PlayCommand(
										fixPlayCommandInput(
											_.extend(options, {
												clip: (nl.media || '').toString(),
												in: inPointFrames,
												seek: seekFrames,
												length: lengthFrames || undefined,
												loop: !!nl.looping,
												channelLayout: nl.channelLayout,
												clearOn404: nl.clearOn404,
												afilter: nl.afilter,
												vfilter: nl.vfilter
											})
										)
									),
									context,
									nl
								)
							)
							bgCleared = true
						} else if (!diffMediaFromBg) {
							addCommands(
								diffCmds,
								addContext(
									new AMCP.PlayCommand({
										...options
									}),
									`No Media diff from bg (${nl.media})`,
									nl
								)
							)
							bgCleared = true
						} else {
							addCommands(
								diffCmds,
								addContext(new AMCP.ResumeCommand(options as any), `Resume otherwise (${diff})`, nl)
							)
							if (oldSeekFrames !== seekFrames && !nl.looping) {
								addCommands(
									diffCmds,
									addContext(
										new AMCP.CallCommand(
											_.extend(options, {
												seek: seekFrames
											})
										),
										`Seek diff (${seekFrames}, ${oldSeekFrames})`,
										nl
									)
								)
							}
							if (ol.looping !== nl.looping) {
								addCommands(
									diffCmds,
									addContext(
										new AMCP.CallCommand(
											_.extend(options, {
												loop: !!nl.looping
											})
										),
										`Loop diff (${nl.looping}, ${ol.looping})`,
										nl
									)
								)
							}
							if (ol.channelLayout !== nl.channelLayout) {
								addCommands(
									diffCmds,
									addContext(
										new AMCP.CallCommand(
											_.extend(options, {
												channelLayout: !!nl.channelLayout
											})
										),
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
								new AMCP.PauseCommand(
									_.extend(options, {
										pauseTime: nl.pauseTime
									})
								),
								context,
								nl
							)
						)
					} else {
						if (diffMediaFromBg) {
							addCommands(
								diffCmds,
								addContext(
									new AMCP.LoadCommand(
										_.extend(options, {
											clip: (nl.media || '').toString(),
											seek: seekFrames,
											length: lengthFrames || undefined,
											loop: !!nl.looping,

											pauseTime: nl.pauseTime,
											channelLayout: nl.channelLayout,
											clearOn404: nl.clearOn404,

											afilter: nl.afilter,
											vfilter: nl.vfilter
										})
									),
									`Load / Pause otherwise (${diff})`,
									nl
								)
							)
						} else {
							addCommands(
								diffCmds,
								addContext(
									new AMCP.LoadCommand({
										...options,

										afilter: nl.afilter,
										vfilter: nl.vfilter
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
						new AMCP.CGAddCommand(
							_.extend(options, {
								templateName: (nl.media || '').toString(),
								flashLayer: 1,
								playOnLoad: nl.playing,
								data: nl.templateData || undefined,

								cgStop: nl.cgStop,
								templateType: nl.templateType
							})
						),
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
						new AMCP.PlayHtmlPageCommand(
							_.extend(options, {
								url: (nl.media || '').toString()
							})
						),
						`Add HTML page (${diff})`,
						nl
					)
				)
				bgCleared = true
			} else if (newLayer.content === LayerContentType.INPUT && newLayer.media !== null) {
				const nl: InputLayer = newLayer as InputLayer
				// let ol: CasparCG.IInputLayer = oldLayer as CasparCG.IInputLayer

				const inputType: string =
					(nl.input && nl.media && (nl.media || '').toString()) || 'decklink'
				const device: number | null = nl.input && nl.input.device
				const format: string | null = (nl.input && nl.input.format) || null
				const channelLayout: string | null = (nl.input && nl.input.channelLayout) || null

				if (inputType === 'decklink') {
					_.extend(options, {
						device: device,
						format: format || undefined,
						filter: nl.filter,
						channelLayout: channelLayout || undefined,
						afilter: nl.afilter,
						vfilter: nl.vfilter
					})

					addCommands(
						diffCmds,
						addContext(new AMCP.PlayDecklinkCommand(options as any), `Add decklink (${diff})`, nl)
					)
					bgCleared = true
				}
			} else if (newLayer.content === LayerContentType.ROUTE) {
				const nl: RouteLayer = newLayer as RouteLayer
				const olNext: RouteLayer = oldLayer.nextUp as any

				if (nl.route) {
					const routeChannel: number = nl.route.channel
					const routeLayer: number | null = nl.route.layer || null
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
						const transition = options.transition
							? ` ${new Transition()
									.fromCommand(
										{
											_objectParams: options
										},
										oldChannel.fps
									)
									.getString(oldChannel.fps)}`
							: ''

						_.extend(options, {
							routeChannel: routeChannel,
							routeLayer: routeLayer,

							command:
								'PLAY ' +
								options.channel +
								'-' +
								options.layer +
								' route://' +
								routeChannel +
								(routeLayer ? '-' + routeLayer : '') +
								(mode ? ' ' + mode : '') +
								(framesDelay ? ' FRAMES_DELAY ' + framesDelay : '') +
								transition,
							customCommand: 'route'
						})

						// cmd = new AMCP.CustomCommand(options as any)

						addCommands(
							diffCmds,
							addContext(
								new AMCP.PlayRouteCommand(
									_.extend(options, {
										route: nl.route,
										mode,
										channelLayout: nl.route.channelLayout,
										framesDelay,
										afilter: nl.afilter,
										vfilter: nl.vfilter
									})
								),
								`Route: diffMediaFromBg (${diff})`,
								nl
							)
						)
					} else {
						addCommands(
							diffCmds,
							addContext(
								new AMCP.PlayCommand({ ...options }),
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
				const playTime: any = nl.playTime

				_.extend(options, {
					media: media, // file name
					encoderOptions: encoderOptions,
					playTime: playTime,

					command: 'ADD ' + options.channel + ' FILE ' + media + ' ' + encoderOptions,

					customCommand: 'add file'
				})

				addCommands(
					diffCmds,
					addContext(new AMCP.CustomCommand(options as any), `Record (${diff})`, nl)
				)
				bgCleared = true // just to be sure
			} else if (newLayer.content === LayerContentType.FUNCTION) {
				const nl: FunctionLayer = newLayer as FunctionLayer
				// let ol: CasparCG.IFunctionLayer = oldLayer as CasparCG.IFunctionLayer
				if (nl.media && nl.executeFcn) {
					let cmd: AMCPCommandVOWithContext = {
						channel: options.channel,
						layer: options.layer,
						_commandName: 'executeFunction',
						// @ts-ignore special: nl.media used for diffing
						media: nl.media,
						externalFunction: true
					}

					if (nl.executeFcn === 'special_osc') {
						cmd = _.extend(cmd, {
							specialFunction: 'osc',
							oscDevice: nl.oscDevice,
							message: nl.inMessage
						})
					} else {
						cmd = _.extend(cmd, {
							functionName: nl.executeFcn,
							functionData: nl.executeData,
							functionLayer: nl
						})
					}
					cmd = addContext(cmd as any, `Function (${diff})`, nl)
					addCommands(diffCmds, cmd)
				}
			} else {
				// oldLayer had content, newLayer had no content, newLayer has a nextup
				if (
					oldLayer.content === LayerContentType.MEDIA ||
					oldLayer.content === LayerContentType.INPUT ||
					oldLayer.content === LayerContentType.HTMLPAGE ||
					oldLayer.content === LayerContentType.ROUTE
					// || oldLayer.content === CasparCG.LayerContentType.MEDIA ???
				) {
					if (_.isObject(oldLayer.media) && (oldLayer.media as TransitionObject).outTransition) {
						addCommands(
							diffCmds,
							addContext(
								new AMCP.PlayCommand({
									channel: oldChannel.channelNo,
									layer: oldLayer.layerNo,
									clip: 'empty',
									...new Transition((oldLayer.media as TransitionObject).outTransition).getOptions(
										oldChannel.fps
									)
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
								new AMCP.StopCommand(options as any),
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
								new AMCP.CGStopCommand({
									...(options as any),
									flashLayer: 1
								}),
								`No new content, but old cgCgStop (${newLayer.content})`,
								oldLayer
							)
						)
					} else {
						addCommands(
							diffCmds,
							addContext(
								new AMCP.ClearCommand(options as any),
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
							new AMCP.CustomCommand({
								layer: oldLayer.layerNo,
								channel: oldChannel.channelNo,
								command: 'REMOVE ' + oldChannel.channelNo + ' FILE',
								customCommand: 'remove file'
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
							new AMCP.CGUpdateCommand(
								_.extend(options, {
									flashLayer: 1,
									data: nl.templateData || undefined
								})
							),
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
		bgCleared
	}
}
