import { InternalState } from '../stateObjectStorage'
import {
	State,
	LayerContentType,
	MediaLayer,
	NextUp,
	InputLayer,
	RouteLayer,
	TransitionObject,
	NextUpMedia,
} from '../api'
import {
	getLayer,
	compareAttrs,
	setDefaultValue,
	getChannel,
	addContext,
	setTransition,
	calculatePlayAttributes,
	fixPlayCommandInput,
	time2FramesChannel,
	addCommands,
	literal,
} from '../util'
import { OptionsInterface, DiffCommands } from '../casparCGState'
import { AMCPCommand, Commands, LoadbgRouteCommand } from 'casparcg-connection'
// import _ = require('underscore')
import { RouteMode } from 'casparcg-connection/dist/enums'

export { diffBackground, resolveBackgroundState }

function diffBackground(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string
): { bgDiff: string | null; noClear: boolean } {
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	let bgDiff = compareAttrs(newLayer.nextUp, oldLayer.nextUp, ['content'])
	let noClear = false

	if (!bgDiff && newLayer.nextUp) {
		if (
			newLayer.nextUp.content === LayerContentType.MEDIA ||
			newLayer.nextUp.content === LayerContentType.INPUT ||
			newLayer.nextUp.content === LayerContentType.HTMLPAGE ||
			newLayer.nextUp.content === LayerContentType.ROUTE
		) {
			const nl: NextUpMedia = newLayer.nextUp as any
			const ol: NextUpMedia = oldLayer.nextUp as any
			setDefaultValue([nl, ol], ['auto'], false)
			bgDiff = compareAttrs(nl, ol, ['auto', 'channelLayout'])
		}

		if (!bgDiff && newLayer.nextUp.content === LayerContentType.MEDIA) {
			const nl: MediaLayer = newLayer.nextUp as MediaLayer
			const ol: MediaLayer = oldLayer.nextUp as MediaLayer

			setDefaultValue([nl, ol], ['seek', 'length', 'inPoint'], 0)

			bgDiff = compareAttrs(nl, ol, ['media', 'seek', 'length', 'inPoint', 'afilter', 'vfilter'])
		}

		if (!bgDiff && newLayer.nextUp.content === LayerContentType.ROUTE) {
			const nl: RouteLayer = newLayer.nextUp as RouteLayer
			const ol: RouteLayer = oldLayer.nextUp as RouteLayer
			bgDiff = compareAttrs(nl, ol, ['delay', 'mode', 'afilter', 'vfilter'])
		}

		if (!bgDiff && newLayer.nextUp.content === LayerContentType.INPUT) {
			const nl: InputLayer = newLayer.nextUp as InputLayer
			const ol: InputLayer = oldLayer.nextUp as InputLayer
			bgDiff = compareAttrs(nl, ol, ['afilter', 'vfilter'])
		}

		if (
			!bgDiff &&
			newLayer.nextUp &&
			oldLayer.nextUp &&
			(typeof newLayer.nextUp.media !== 'string' || typeof oldLayer.nextUp.media !== 'string')
		) {
			const nMedia = newLayer.nextUp.media as TransitionObject | undefined
			const oMedia = oldLayer.nextUp.media as TransitionObject | undefined

			bgDiff = compareAttrs(nMedia, oMedia, ['inTransition', 'outTransition', 'changeTransition'])
		}

		if (!bgDiff && newLayer.nextUp && 'route' in newLayer.nextUp && oldLayer.nextUp && 'route' in oldLayer.nextUp) {
			const nRoute = newLayer.nextUp.route
			const oRoute = oldLayer.nextUp.route

			bgDiff = compareAttrs(nRoute, oRoute, ['channel', 'layer'])

			if (bgDiff) noClear = true
		}
	}

	return { bgDiff, noClear }
}
function resolveBackgroundState(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string,
	forceDiff = false
): {
	commands: DiffCommands
} {
	const oldChannel = getChannel(oldState, channel)
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: [],
	}

	const diff = diffBackground(oldState, newState, channel, layer)
	let bgDiff = diff.bgDiff
	const noClear = diff.noClear
	if (forceDiff) bgDiff = 'Forced diff by foreground'

	if (bgDiff) {
		const options: OptionsInterface = {
			channel: newChannel.channelNo,
			layer: newLayer.layerNo,
		}
		if (newLayer.nextUp) {
			// make sure the layer is empty before trying to load something new
			// this prevents weird behaviour when files don't load correctly
			if (oldLayer.nextUp && !(oldLayer.nextUp as MediaLayer).clearOn404 && !noClear) {
				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.Loadbg,
							params: {
								channel: newChannel.channelNo,
								layer: newLayer.layerNo,
								clip: 'EMPTY',
							},
						}),
						`Old nextUp was set, clear it first (${oldLayer.nextUp.media})`,
						newLayer
					)
				)
			}

			setTransition(options, newChannel, newLayer, newLayer.nextUp.media, false, true)

			if (newLayer.nextUp.content === LayerContentType.MEDIA) {
				const layer = newLayer.nextUp as MediaLayer & NextUp

				const {
					inPointFrames,
					lengthFrames,
					seekFrames,
					looping,
					// channelLayout
				} = calculatePlayAttributes(0, layer, newChannel, oldChannel)

				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.Loadbg,
							params: fixPlayCommandInput({
								...options,
								auto: layer.auto,
								clip: (newLayer.nextUp.media || '').toString(),
								in: inPointFrames,
								seek: seekFrames,
								length: lengthFrames || undefined,
								loop: !!looping,
								// channelLayout: channelLayout,
								clearOn404: layer.clearOn404,
								aFilter: layer.afilter,
								vFilter: layer.vfilter,
							}),
						}),
						`Nextup media (${newLayer.nextUp.media})`,
						newLayer
					)
				)
			} else if (newLayer.nextUp.content === LayerContentType.HTMLPAGE) {
				// const layer = newLayer.nextUp as HtmlPageLayer & NextUp
				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.LoadbgHtml,
							params: {
								...options,
								url: (newLayer.nextUp.media || '').toString(),
							},
						}),
						`Nextup HTML (${newLayer.nextUp.media})`,
						newLayer
					)
				)
			} else if (newLayer.nextUp.content === LayerContentType.INPUT) {
				const layer = newLayer.nextUp as InputLayer & NextUp
				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.LoadbgDecklink,
							params: {
								...options,
								device: layer.input.device,
								// format: layer.input.format,
								// filter: layer.filter,
								// channelLayout: layer.input.channelLayout,
								aFilter: layer.afilter,
								vFilter: layer.vfilter,
							},
						}),
						`Nextup Decklink (${layer.input.device})`,
						newLayer
					)
				)
			} else if (newLayer.nextUp.content === LayerContentType.ROUTE) {
				const layer = newLayer.nextUp as RouteLayer & NextUp
				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.LoadbgRoute,
							params: {
								...options,

								route: layer.route as LoadbgRouteCommand['params']['route'],
								mode: layer.mode as RouteMode,
								// channelLayout: layer.route ? layer.route.channelLayout : undefined,
								framesDelay: layer.delay
									? Math.floor(time2FramesChannel(layer.delay, newChannel, oldChannel))
									: undefined,
								aFilter: layer.afilter,
								vFilter: layer.vfilter,
							},
						}),
						`Nextup Route (${layer.route})`,
						newLayer
					)
				)
			}
			// } else if (compareAttrs(oldLayer.nextUp, newLayer, ['media'])) {
			// this.log('REMOVE BG')
			// console.log('REMOVE BG', oldLayer.nextUp, newLayer)
			// additionalCmds.push(new AMCP.LoadbgCommand({
			// 	channel: newChannel.channelNo,
			// 	layer: newLayer.layerNo,
			// 	clip: 'EMPTY'
			// }))
		}
	}

	return {
		commands: diffCmds,
	}
}
