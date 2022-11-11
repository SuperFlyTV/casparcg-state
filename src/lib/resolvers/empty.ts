import { getChannel, getLayer, addContext, compareAttrs, addCommands, literal } from '../util'
import { InternalState } from '../stateObjectStorage'
import { State, LayerContentType, Transition, TemplateLayer } from '../api'
import { AMCPCommandWithContext, DiffCommands } from '../casparCGState'
import { AMCPCommand, Commands } from 'casparcg-connection'
import _ = require('underscore')

export { resolveEmptyState }

function resolveEmptyState(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string
): { commands: DiffCommands } {
	const oldChannel = getChannel(oldState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: [],
	}

	if (
		!newLayer.content &&
		oldLayer.content !== LayerContentType.NOTHING &&
		!newLayer.nextUp // if there is a nextup, we should do a stop, not a clear
	) {
		if (oldLayer.noClear) {
			// hack: don't do the clear command:
		} else {
			let noCommand = false
			let cmd: AMCPCommandWithContext | null = null

			if (oldLayer.content === LayerContentType.RECORD) {
				cmd = addContext(
					literal<AMCPCommand>({
						command: Commands.Remove,
						params: {
							channel: oldChannel.channelNo,
							consumer: 'FILE',
						},
					}),
					`Old was recording`,
					oldLayer
				)
			} else if (typeof oldLayer.media === 'object' && oldLayer.media !== null) {
				if (oldLayer.media.outTransition) {
					cmd = addContext(
						literal<AMCPCommand>({
							command: Commands.Play,
							params: {
								channel: oldChannel.channelNo,
								layer: oldLayer.layerNo,
								clip: 'empty',
								...new Transition(oldLayer.media.outTransition).getOptions(oldChannel.fps),
							},
						}),
						`Old was media and has outTransition`,
						oldLayer
					)
				}
			}

			if (!cmd) {
				if (oldLayer.content === LayerContentType.TEMPLATE) {
					const ol: TemplateLayer = oldLayer as TemplateLayer

					if (ol.cgStop) {
						cmd = addContext(
							literal<AMCPCommand>({
								command: Commands.CgStop,
								params: {
									channel: oldChannel.channelNo,
									layer: oldLayer.layerNo,
									cgLayer: 1,
								},
							}),
							`Old was template and had cgStop`,
							oldLayer
						)
					}
				}
			}
			if (oldLayer.content === LayerContentType.FUNCTION) {
				// Functions only trigger action when they start, no action on end
				// send nothing
				noCommand = true
			} else if (
				oldLayer.content === LayerContentType.MEDIA &&
				oldLayer.media &&
				oldLayer.media.valueOf() + '' === 'empty'
			) {
				// the old layer is an empty, thats essentially something that is cleared
				// (or an out transition)
				// send nothing then
				noCommand = true
			}

			if (!noCommand) {
				if (!cmd) {
					// ClearCommand:
					cmd = addContext(
						literal<AMCPCommand>({
							command: Commands.Clear,
							params: {
								channel: oldChannel.channelNo,
								layer: oldLayer.layerNo,
							},
						}),
						`Clear old stuff`,
						oldLayer
					)
				}

				if (cmd) {
					addCommands(diffCmds, cmd)
				}
			}

			if (oldLayer.mixer && !_.isEmpty(oldLayer.mixer)) {
				// reset the mixer because otherwise we lose info about the state it is in. (Should the lib user want to keep them, they should use an empty layer)
				addCommands(
					diffCmds,
					addContext(
						literal<AMCPCommand>({
							command: Commands.MixerClear,
							params: {
								channel: oldChannel.channelNo,
								layer: oldLayer.layerNo,
							},
						}),
						`Clear mixer after clearing foreground`,
						oldLayer
					)
				)
			}
		}
	}
	if (oldLayer.nextUp && !newLayer.nextUp && compareAttrs<any>(oldLayer.nextUp, newLayer, ['media'])) {
		const prevClearCommand = _.find(diffCmds.cmds, (cmd) => {
			return cmd.command === Commands.Clear
		})
		if (!prevClearCommand) {
			// if ClearCommand is run, it clears bg too

			addCommands(
				diffCmds,
				addContext(
					literal<AMCPCommand>({
						command: Commands.Loadbg,
						params: {
							channel: oldChannel.channelNo,
							layer: oldLayer.layerNo,
							clip: 'EMPTY',
						},
					}),
					`Clear only old nextUp`,
					oldLayer
				)
			)
		}
	}

	return { commands: diffCmds }
}
