import { getChannel, getLayer, compareAttrs, setDefaultValue, setTransition, getTimeSincePlay, calculatePlayAttributes, frames2Time, addContext, fixPlayCommandInput, time2Frames, addCommands } from '../util'
import { InternalState } from '../stateObjectStorage'
import { State, LayerContentType, IMediaLayer, ITemplateLayer, IHtmlPageLayer, IInputLayer, IRouteLayer, IRecordLayer, IFunctionLayer, NextUp, Transition, TransitionObject } from '../api'
import { OptionsInterface, IAMCPCommandVOWithContext, DiffCommands } from '../casparCGState'
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

	let diff = compareAttrs(newLayer, oldLayer, [
		'content'
	])

	if (!diff) {
		if (newLayer.content === LayerContentType.MEDIA) {
			let nl: IMediaLayer = newLayer as IMediaLayer
			let ol: IMediaLayer = oldLayer as IMediaLayer

			setDefaultValue(
				[nl, ol],
				['seek', 'length', 'inPoint', 'pauseTime'],
				0
			)
			setDefaultValue(
				[nl, ol],
				['looping', 'playing'],
				false
			)
			diff = compareAttrs(nl, ol, [
				'media',
				'playTime',
				'looping',
				'seek',
				'length',
				'inPoint',
				'pauseTime',
				'playing',
				'channelLayout'
			], minTimeSincePlay)
		} else if (
			newLayer.content === LayerContentType.TEMPLATE
		) {
			let nl: ITemplateLayer = newLayer as ITemplateLayer
			let ol: ITemplateLayer = oldLayer as ITemplateLayer

			setDefaultValue([nl, ol], ['templateType'], '')

			diff = compareAttrs(nl, ol, [
				'media',
				'templateType'
			])
		} else if (
			newLayer.content === LayerContentType.HTMLPAGE
		) {
			let nl: IHtmlPageLayer = newLayer as IHtmlPageLayer
			let ol: IHtmlPageLayer = oldLayer as IHtmlPageLayer

			setDefaultValue([nl, ol], ['media'], '')

			diff = compareAttrs(nl, ol, ['media'])
		} else if (
			newLayer.content === LayerContentType.INPUT
		) {
			let nl: IInputLayer = newLayer as IInputLayer
			let ol: IInputLayer = oldLayer as IInputLayer

			diff = compareAttrs(nl, ol, ['media'])

			setDefaultValue(
				[nl.input, ol.input],
				['device', 'format', 'channelLayout'],
				''
			)

			if (!diff) {
				diff = compareAttrs(nl.input, ol.input, [
					'device',
					'format'
				])
			}
		} else if (
			newLayer.content === LayerContentType.ROUTE
		) {
			let nl: IRouteLayer = newLayer as IRouteLayer
			let ol: IRouteLayer = oldLayer as IRouteLayer

			setDefaultValue(
				[nl.route, ol.route],
				['channel', 'layer'],
				0
			)

			diff = compareAttrs(nl.route, ol.route, [
				'channel',
				'layer',
				'channelLayout'
			])
			if (!diff) {
				diff = compareAttrs(nl, ol, ['delay'])
			}
		} else if (
			newLayer.content === LayerContentType.RECORD
		) {
			let nl: IRecordLayer = newLayer as IRecordLayer
			let ol: IRecordLayer = oldLayer as IRecordLayer

			setDefaultValue([nl, ol], ['encoderOptions'], '')

			diff = compareAttrs(nl, ol, [
				'media',
				'playTime',
				'encoderOptions'
			], minTimeSincePlay)
		} else if (
			newLayer.content === LayerContentType.FUNCTION
		) {
			let nl: IFunctionLayer = newLayer as IFunctionLayer
			let ol: IFunctionLayer = oldLayer as IFunctionLayer

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

			let options: OptionsInterface = {
				channel: newChannel.channelNo,
				layer: newLayer.layerNo,
				noClear: !!newLayer.noClear
			}

			setTransition(
				options,
				newChannel,
				oldLayer,
				newLayer.media,
				false
			)

			if (
				newLayer.content === LayerContentType.MEDIA &&
				newLayer.media
			) {
				let nl: IMediaLayer = newLayer as IMediaLayer
				let ol: IMediaLayer = oldLayer as IMediaLayer

				let timeSincePlay = getTimeSincePlay(
					nl,
					currentTime,
					minTimeSincePlay
				)

				let diffMediaFromBg = compareAttrs(
					nl,
					ol.nextUp,
					['media']
				)
				if (options.transition) {
					diffMediaFromBg = 'transition'
				} // transition changed, so we need to reset

				const oldUseLayer: IMediaLayer | NextUp =
					ol.nextUp && !diffMediaFromBg // current media is the one in background
						? ol.nextUp
						: ol

				let oldTimeSincePlay =
					ol.nextUp && !diffMediaFromBg
						? 0
						: getTimeSincePlay(ol, currentTime, minTimeSincePlay)

				const {
					inPointFrames,
					lengthFrames,
					seekFrames,
					looping,
					channelLayout
				} = calculatePlayAttributes(
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
					channelLayout: oldChannelLayout
				} = calculatePlayAttributes(
					oldTimeSincePlay,
					oldUseLayer,
					newChannel,
					oldChannel
				)

				if (nl.playing) {
					nl.pauseTime = 0

					const newMedia = compareAttrs(nl, ol, [
						'media'
					])
					const seekDiff = frames2Time(
						Math.abs(oldSeekFrames - seekFrames),
						newChannel,
						oldChannel
					)
					const seekIsSmall: boolean =
						seekDiff < minTimeSincePlay

					if (!newMedia && ol.pauseTime && seekIsSmall) {
						addCommands(diffCmds, addContext(
							new AMCP.ResumeCommand(options as any),
							`Seek is small (${seekDiff})`,
							nl
						))
					} else {
						let context: string = ''
						if (newMedia && diffMediaFromBg) {
							context = `Media diff from bg: ${newMedia} (${diffMediaFromBg})`
						}
						if (
							(inPointFrames || 0) !==
							(oldInPointFrames || 0)
						) {
							context = `Inpoints diff (${inPointFrames}, ${oldInPointFrames})`
						} // temporary, until CALL IN command works satisfactory in CasparCG
						if (
							(lengthFrames || 0) !==
							(oldLengthFrames || 0)
						) {
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
						if (context) {
							context += ` (${diff})`

							addCommands(diffCmds, addContext(
								new AMCP.PlayCommand(
									fixPlayCommandInput(
										_.extend(options, {
											clip: (
												nl.media || ''
											).toString(),
											in: inPointFrames,
											seek: seekFrames,
											length:
												lengthFrames ||
												undefined,
											loop: !!nl.looping,
											channelLayout:
												nl.channelLayout,
											clearOn404:
												nl.clearOn404
										})
									)
								),
								context,
								nl
							))
							bgCleared = true
						} else if (!diffMediaFromBg) {
							addCommands(diffCmds, addContext(
								new AMCP.PlayCommand({
									...options
								}),
								`No Media diff from bg (${nl.media})`,
								nl
							))
							bgCleared = true
						} else {
							addCommands(diffCmds, addContext(
								new AMCP.ResumeCommand(
									options as any
								),
								`Resume otherwise (${diff})`,
								nl
							))
							if (
								oldSeekFrames !== seekFrames &&
								!nl.looping
							) {
								addCommands(diffCmds, addContext(
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
								addCommands(diffCmds, addContext(
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
							if (
								ol.channelLayout !==
								nl.channelLayout
							) {
								addCommands(diffCmds, addContext(
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
					let context: string = ''
					if (_.isNull(timeSincePlay)) {
						context = `TimeSincePlay is null (${diff})`
					}
					if (
						nl.pauseTime &&
						timeSincePlay! > minTimeSincePlay
					) {
						context = `pauseTime is set (${diff})`
					}
					if (
						context &&
						!compareAttrs(nl, ol, ['media'])
					) {
						addCommands(diffCmds, addContext(
							new AMCP.PauseCommand(
								_.extend(options, {
									pauseTime: nl.pauseTime
								})
							),
							context,
							nl
						))
					} else {
						if (diffMediaFromBg) {
							addCommands(diffCmds, addContext(
								new AMCP.LoadCommand(
									_.extend(options, {
										clip: (
											nl.media || ''
										).toString(),
										seek: seekFrames,
										length:
											lengthFrames ||
											undefined,
										loop: !!nl.looping,

										pauseTime: nl.pauseTime,
										channelLayout:
											nl.channelLayout,
										clearOn404: nl.clearOn404
									})
								),
								`Load / Pause otherwise (${diff})`,
								nl
							))
						} else {
							addCommands(diffCmds, addContext(
								new AMCP.LoadCommand({
									...options
								}),
								`No Media diff from bg (${nl.media})`,
								nl
							))
						}
						bgCleared = true
					}
				}
			} else if (
				newLayer.content === LayerContentType.TEMPLATE &&
				newLayer.media !== null
			) {
				let nl: ITemplateLayer = newLayer as ITemplateLayer
				// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

				addCommands(diffCmds, addContext(
					new AMCP.CGAddCommand(
						_.extend(options, {
							templateName: (
								nl.media || ''
							).toString(),
							flashLayer: 1,
							playOnLoad: nl.playing,
							data: nl.templateData || undefined,

							cgStop: nl.cgStop,
							templateType: nl.templateType
						})
					),
					`Add Template (${diff})`,
					nl
				))
				bgCleared = true
			} else if (
				newLayer.content === LayerContentType.HTMLPAGE &&
				newLayer.media !== null
			) {
				let nl: IHtmlPageLayer = newLayer as IHtmlPageLayer
				// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

				addCommands(diffCmds, addContext(
					new AMCP.PlayHtmlPageCommand(
						_.extend(options, {
							url: (nl.media || '').toString()
						})
					),
					`Add HTML page (${diff})`,
					nl
				))
				bgCleared = true
			} else if (
				newLayer.content === LayerContentType.INPUT &&
				newLayer.media !== null
			) {
				let nl: IInputLayer = newLayer as IInputLayer
				// let ol: CasparCG.IInputLayer = oldLayer as CasparCG.IInputLayer

				let inputType: string =
					(nl.input &&
						nl.media &&
						(nl.media || '').toString()) ||
					'decklink'
				let device: number | null =
					nl.input && nl.input.device
				let format: string | null =
					(nl.input && nl.input.format) || null
				let channelLayout: string | null =
					(nl.input && nl.input.channelLayout) || null

				if (inputType === 'decklink') {
					_.extend(options, {
						device: device,
						format: format || undefined,
						filter: nl.filter,
						channelLayout: channelLayout || undefined
					})

					addCommands(diffCmds, addContext(
						new AMCP.PlayDecklinkCommand(
							options as any
						),
						`Add decklink (${diff})`,
						nl
					))
					bgCleared = true
				}
			} else if (
				newLayer.content === LayerContentType.ROUTE
			) {
				let nl: IRouteLayer = newLayer as IRouteLayer
				let olNext: IRouteLayer = oldLayer.nextUp as any

				if (nl.route) {
					let routeChannel: number = nl.route.channel
					let routeLayer: number | null =
						nl.route.layer || null
					let mode = nl.mode
					let framesDelay: number | undefined = nl.delay ? Math.floor(time2Frames(nl.delay, newChannel, oldChannel)) : undefined
					let diffMediaFromBg =
						!olNext || !olNext.route
							? true
							: !(
									nl.route.channel ===
										olNext.route.channel &&
									nl.route.layer ===
										olNext.route.layer &&
									nl.delay === olNext.delay
							  )

					if (diffMediaFromBg) {
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
								(routeLayer
									? '-' + routeLayer
									: '') +
								(mode ? ' ' + mode : '') +
								(framesDelay
									? ' FRAMES_DELAY ' + framesDelay
									: '') +
								(options.transition
									? ' ' +
									  new Transition()
											.fromCommand(
										{
											_objectParams: options
										},
												oldChannel.fps
											)
											.getString(
												oldChannel.fps
											)
									: ''),
							customCommand: 'route'
						})

						// cmd = new AMCP.CustomCommand(options as any)

						addCommands(diffCmds, addContext(
							new AMCP.PlayRouteCommand(
								_.extend(options, {
									route: nl.route,
									mode,
									channelLayout:
										nl.route.channelLayout,
									framesDelay
								})
							),
							`Route: diffMediaFromBg (${diff})`,
							nl
						))
					} else {
						addCommands(diffCmds, addContext(
							new AMCP.PlayCommand({ ...options }),
							`Route: no diffMediaFromBg (${diff})`,
							nl
						))
					}
					bgCleared = true
				}
			} else if (
				newLayer.content === LayerContentType.RECORD &&
				newLayer.media !== null
			) {
				let nl: IRecordLayer = newLayer as IRecordLayer
				// let ol: CasparCG.IRecordLayer = oldLayer as CasparCG.IRecordLayer

				let media: any = nl.media
				let encoderOptions: any = nl.encoderOptions || ''
				let playTime: any = nl.playTime

				_.extend(options, {
					media: media, // file name
					encoderOptions: encoderOptions,
					playTime: playTime,

					command:
						'ADD ' +
						options.channel +
						' FILE ' +
						media +
						' ' +
						encoderOptions,

					customCommand: 'add file'
				})

				addCommands(diffCmds, addContext(
					new AMCP.CustomCommand(options as any),
					`Record (${diff})`,
					nl
				))
				bgCleared = true // just to be sure
			} else if (
				newLayer.content === LayerContentType.FUNCTION
			) {
				let nl: IFunctionLayer = newLayer as IFunctionLayer
				// let ol: CasparCG.IFunctionLayer = oldLayer as CasparCG.IFunctionLayer
				if (nl.media && nl.executeFcn) {
					let cmd: IAMCPCommandVOWithContext = {
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
					cmd = addContext(
						cmd as any,
						`Function (${diff})`,
						nl
					)
					addCommands(diffCmds, cmd)
				}
			} else {
				// oldLayer had content, newLayer had no content, newLayer has a nextup
				if (
					oldLayer.content === LayerContentType.MEDIA ||
					oldLayer.content === LayerContentType.INPUT ||
					oldLayer.content ===
						LayerContentType.HTMLPAGE ||
					oldLayer.content === LayerContentType.ROUTE
					// || oldLayer.content === CasparCG.LayerContentType.MEDIA ???
				) {
					if (
						_.isObject(oldLayer.media) &&
						(oldLayer.media as TransitionObject)
							.outTransition
					) {
						addCommands(diffCmds, addContext(
							new AMCP.PlayCommand({
								channel: oldChannel.channelNo,
								layer: oldLayer.layerNo,
								clip: 'empty',
								...new Transition(
									(oldLayer.media as TransitionObject).outTransition
								).getOptions(oldChannel.fps)
							}),
							`No new content, but old outTransition (${newLayer.content})`,
							oldLayer
						))
						bgCleared = true
					} else {
						addCommands(diffCmds, addContext(
							new AMCP.StopCommand(options as any),
							`No new content (${newLayer.content})`,
							oldLayer
						))
					}
				} else if (
					oldLayer.content === LayerContentType.TEMPLATE
				) {
					let ol = oldLayer as ITemplateLayer
					if (ol.cgStop) {
						addCommands(diffCmds, addContext(
							new AMCP.CGStopCommand({
								...(options as any),
								flashLayer: 1
							}),
							`No new content, but old cgCgStop (${newLayer.content})`,
							oldLayer
						))
					} else {
						addCommands(diffCmds, addContext(
							new AMCP.ClearCommand(options as any),
							`No new content (${newLayer.content})`,
							oldLayer
						))
						bgCleared = true
					}
				} else if (
					oldLayer.content === LayerContentType.RECORD
				) {
					addCommands(diffCmds, addContext(
						new AMCP.CustomCommand({
							layer: oldLayer.layerNo,
							channel: oldChannel.channelNo,
							command:
								'REMOVE ' +
								oldChannel.channelNo +
								' FILE',
							customCommand: 'remove file'
						}),
						`No new content (${newLayer.content})`,
						oldLayer
					))
				}
			}
		} else if (newLayer.content === LayerContentType.TEMPLATE) {
			let nl: ITemplateLayer = newLayer as ITemplateLayer
			let ol: ITemplateLayer = oldLayer as ITemplateLayer

			diff = compareAttrs(nl, ol, ['templateData'])

			if (diff) {
				// Updated things:
				let options: any = {}
				options.channel = newChannel.channelNo
				options.layer = nl.layerNo

				if (nl.content === LayerContentType.TEMPLATE) {
					addCommands(diffCmds, addContext(
						new AMCP.CGUpdateCommand(
							_.extend(options, {
								flashLayer: 1,
								data: nl.templateData || undefined
							})
						),
						`Updated templateData`,
						newLayer
					))
				}
			}
		}
	}

	return {
		commands: diffCmds,
		bgCleared
	}
}