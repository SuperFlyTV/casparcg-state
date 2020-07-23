import { InternalState } from '../stateObjectStorage'
import { State, LayerContentType, IMediaLayer, NextUp, IHtmlPageLayer, IInputLayer, IRouteLayer } from '../api'
import { getLayer, compareAttrs, setDefaultValue, getChannel, addContext, setTransition, calculatePlayAttributes, fixPlayCommandInput, time2Frames, addCommands } from '../util'
import { OptionsInterface, DiffCommands } from '../casparCGState'
import { AMCP } from 'casparcg-connection'
import _ = require('underscore')

export { diffBackground, resolveBackgroundState }

function diffBackground(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string
) {
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	let bgDiff = compareAttrs(
		newLayer.nextUp,
		oldLayer.nextUp,
		['content']
	)
	let noClear = false

	if (!bgDiff && newLayer.nextUp) {
		if (
			newLayer.nextUp.content ===
				LayerContentType.MEDIA ||
			newLayer.nextUp.content ===
				LayerContentType.INPUT ||
			newLayer.nextUp.content ===
				LayerContentType.HTMLPAGE ||
			newLayer.nextUp.content === LayerContentType.ROUTE
		) {
			let nl: IMediaLayer = newLayer.nextUp as any
			let ol: IMediaLayer = oldLayer.nextUp as any
			setDefaultValue([nl, ol], ['auto'], false)
			bgDiff = compareAttrs(nl, ol, [
				'auto',
				'channelLayout'
			])
		}

		if (
			!bgDiff &&
			newLayer.nextUp.content === LayerContentType.MEDIA
		) {
			let nl: IMediaLayer = newLayer.nextUp as IMediaLayer
			let ol: IMediaLayer = oldLayer.nextUp as IMediaLayer

			setDefaultValue(
				[nl, ol],
				['seek', 'length', 'inPoint'],
				0
			)

			bgDiff = compareAttrs(nl, ol, [
				'media',
				'seek',
				'length',
				'inPoint'
			])
		}

		if (
			!bgDiff &&
			newLayer.nextUp &&
			oldLayer.nextUp &&
			(typeof newLayer.nextUp.media !== 'string' ||
				typeof oldLayer.nextUp.media !== 'string')
		) {
			let nMedia = newLayer.nextUp.media
			let oMedia = oldLayer.nextUp.media

			bgDiff = compareAttrs(nMedia, oMedia, [
				'inTransition',
				'outTransition',
				'changeTransition'
			])
		}

		if (
			!bgDiff &&
			newLayer.nextUp &&
			'route' in newLayer.nextUp &&
			oldLayer.nextUp &&
			'route' in oldLayer.nextUp
		) {
			let nRoute = newLayer.nextUp.route
			let oRoute = oldLayer.nextUp.route

			bgDiff = compareAttrs(nRoute, oRoute, [
				'channel',
				'layer'
			])

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
) {
	const oldChannel = getChannel(oldState, channel)
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: []
	}

	let { bgDiff, noClear } = diffBackground(oldState, newState, channel, layer)
	if (forceDiff) bgDiff = 'Forced diff by foreground'

	if (bgDiff) {
		let options: OptionsInterface = {
			channel: newChannel.channelNo,
			layer: newLayer.layerNo,
			noClear: !!newLayer.noClear
		}
		if (newLayer.nextUp) {
			// make sure the layer is empty before trying to load something new
			// this prevents weird behaviour when files don't load correctly
			if (
				oldLayer.nextUp &&
				!(oldLayer.nextUp as IMediaLayer).clearOn404 &&
				!noClear
			) {
				addCommands(diffCmds, addContext(
					new AMCP.LoadbgCommand({
						channel: newChannel.channelNo,
						layer: newLayer.layerNo,
						clip: 'EMPTY'
					}),
					`Old nextUp was set, clear it first (${oldLayer.nextUp.media})`,
					newLayer
				))
			}

			setTransition(
				options,
				newChannel,
				newLayer,
				newLayer.nextUp.media,
				false,
				true
			)

			if (
				newLayer.nextUp.content ===
				LayerContentType.MEDIA
			) {
				const layer = newLayer.nextUp as IMediaLayer &
					NextUp

				const {
					inPointFrames,
					lengthFrames,
					seekFrames,
					looping,
					channelLayout
				} = calculatePlayAttributes(
					0,
					layer,
					newChannel,
					oldChannel
				)

				addCommands(diffCmds, addContext(
					new AMCP.LoadbgCommand(
						_.extend(
							options,
							fixPlayCommandInput({
								auto: layer.auto,
								clip: (
									newLayer.nextUp.media ||
									''
								).toString(),
								in: inPointFrames,
								seek: seekFrames,
								length:
									lengthFrames ||
									undefined,
								loop: !!looping,
								channelLayout: channelLayout,
								clearOn404:
									layer.clearOn404
							})
						)
					),
					`Nextup media (${newLayer.nextUp.media})`,
					newLayer
				))
			} else if (
				newLayer.nextUp.content ===
				LayerContentType.HTMLPAGE
			) {
				const layer = newLayer.nextUp as IHtmlPageLayer &
					NextUp
				addCommands(diffCmds, addContext(
					new AMCP.LoadHtmlPageBgCommand(
						_.extend(options, {
							auto: layer.auto,
							url: (
								newLayer.nextUp.media || ''
							).toString()
						})
					),
					`Nextup HTML (${newLayer.nextUp.media})`,
					newLayer
				))
			} else if (
				newLayer.nextUp.content ===
				LayerContentType.INPUT
			) {
				const layer = newLayer.nextUp as IInputLayer &
					NextUp
				addCommands(diffCmds, addContext(
					new AMCP.LoadDecklinkBgCommand(
						_.extend(options, {
							auto: layer.auto,
							device: layer.input.device,
							format: layer.input.format,
							filter: layer.filter,
							channelLayout:
								layer.input.channelLayout
						})
					),
					`Nextup Decklink (${layer.input.device})`,
					newLayer
				))
			} else if (
				newLayer.nextUp.content ===
				LayerContentType.ROUTE
			) {
				const layer = newLayer.nextUp as IRouteLayer &
					NextUp
				addCommands(diffCmds, addContext(
					new AMCP.LoadRouteBgCommand(
						_.extend(options, {
							route: layer.route,
							mode: layer.mode,
							channelLayout: layer.route
								? layer.route.channelLayout
								: undefined,
					framesDelay: layer.delay ? Math.floor(time2Frames(layer.delay, newChannel, oldChannel)) : undefined
						})
					),
					`Nextup Route (${layer.route})`,
					newLayer
				))
			}
		} else if (
			compareAttrs(oldLayer.nextUp, newLayer, [
				'media'
			])
		) {
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
		commands: diffCmds
	}
}
