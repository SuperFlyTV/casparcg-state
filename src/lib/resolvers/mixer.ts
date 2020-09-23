import { InternalState } from '../stateObjectStorage'
import { State } from '../api'
import { AMCPCommandWithContext, DiffCommands } from '../casparCGState'
import { Mixer } from '../mixer'
import {
	compareMixerValues,
	setTransition,
	addContext,
	getChannel,
	getLayer,
	addCommands
} from '../util'
import _ = require('underscore')
import { Command as CommandNS, AMCP } from 'casparcg-connection'

export function resolveMixerState(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string
) {
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: []
	}
	const bundledCmds: {
		[bundleGroup: string]: Array<AMCPCommandWithContext>
	} = {}

	if (!newLayer.mixer) newLayer.mixer = new Mixer()
	if (!oldLayer.mixer) oldLayer.mixer = new Mixer()

	const pushMixerCommand = (attr: string, Command: any, subValue?: Array<string> | string) => {
		const diff = compareMixerValues(
			newLayer,
			oldLayer,
			attr,
			_.isArray(subValue) ? subValue : undefined
		)
		if (diff) {
			const options: any = {}
			options.channel = newChannel.channelNo
			if (newLayer.layerNo !== -1) {
				options.layer = newLayer.layerNo
			}

			let o: any = Mixer.getValue((newLayer.mixer || {})[attr])
			if (newLayer.mixer && _.has(newLayer.mixer, attr) && !_.isUndefined(o)) {
				setTransition(options, newChannel, oldLayer, newLayer.mixer, false)
			} else {
				setTransition(options, newChannel, oldLayer, newLayer.mixer, true)
				o = Mixer.getDefaultValues(attr)
				options._defaultOptions = true // this is used in ApplyCommands to set state to "default", and not use the mixer values
			}
			if (_.isArray(subValue)) {
				_.each(subValue, (sv) => {
					options[sv] = o[sv]
				})
			} else if (_.isString(subValue)) {
				if (_.isObject(o) && o._transition) {
					options[subValue] = o._value
				} else {
					options[subValue] = o
				}
			}
			if (newLayer && newLayer.mixer && newLayer.mixer.bundleWithCommands) {
				options['bundleWithCommands'] = newLayer.mixer.bundleWithCommands
				const key = newLayer.mixer.bundleWithCommands + ''
				if (!bundledCmds[key]) bundledCmds[key] = []

				options['defer'] = true

				bundledCmds[key].push(
					addContext(new Command(options) as CommandNS.IAMCPCommand, `Bundle: ${diff}`, newLayer)
				)
			} else {
				addCommands(
					diffCmds,
					addContext(
						new Command(options) as CommandNS.IAMCPCommand,
						`Mixer: ${diff}`,
						newLayer || oldLayer
					)
				)
			}
		}
	}

	pushMixerCommand('anchor', AMCP.MixerAnchorCommand, ['x', 'y'])
	pushMixerCommand('blendmode', AMCP.MixerBlendCommand, 'blendmode')
	pushMixerCommand('brightness', AMCP.MixerBrightnessCommand, 'brightness')
	pushMixerCommand('chroma', AMCP.MixerChromaCommand, ['keyer', 'threshold', 'softness', 'spill'])
	pushMixerCommand('clip', AMCP.MixerClipCommand, ['x', 'y', 'width', 'height'])
	pushMixerCommand('contrast', AMCP.MixerContrastCommand, 'contrast')
	pushMixerCommand('crop', AMCP.MixerCropCommand, ['left', 'top', 'right', 'bottom'])
	pushMixerCommand('fill', AMCP.MixerFillCommand, ['x', 'y', 'xScale', 'yScale'])
	// grid
	pushMixerCommand('keyer', AMCP.MixerKeyerCommand, 'keyer')
	pushMixerCommand('levels', AMCP.MixerLevelsCommand, [
		'minInput',
		'maxInput',
		'gamma',
		'minOutput',
		'maxOutput'
	])
	if (newLayer.layerNo === -1) {
		pushMixerCommand('mastervolume', AMCP.MixerMastervolumeCommand, 'mastervolume')
	}
	// mipmap
	pushMixerCommand('opacity', AMCP.MixerOpacityCommand, 'opacity')
	pushMixerCommand('perspective', AMCP.MixerPerspectiveCommand, [
		'topLeftX',
		'topLeftY',
		'topRightX',
		'topRightY',
		'bottomRightX',
		'bottomRightY',
		'bottomLeftX',
		'bottomLeftY'
	])
	pushMixerCommand('rotation', AMCP.MixerRotationCommand, 'rotation')
	pushMixerCommand('saturation', AMCP.MixerSaturationCommand, 'saturation')
	if (newLayer.layerNo === -1) {
		pushMixerCommand('straightAlpha', AMCP.MixerStraightAlphaOutputCommand, 'straight_alpha_output')
	}
	pushMixerCommand('volume', AMCP.MixerVolumeCommand, 'volume')

	return { commands: diffCmds, bundledCmds }
}
