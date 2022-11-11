import { InternalState } from '../stateObjectStorage'
import { State } from '../api'
import { AMCPCommandWithContext, DiffCommands } from '../casparCGState'
import { Mixer } from '../mixer'
import { compareMixerValues, addContext, getChannel, getLayer, addCommands, setMixerTransition } from '../util'
import _ = require('underscore')
import {
	AMCPCommand,
	Commands,
	MixerAnchorCommand,
	MixerBlendCommand,
	MixerBrightnessCommand,
	MixerChromaCommand,
	MixerClipCommand,
	MixerContrastCommand,
	MixerCropCommand,
	MixerFillCommand,
	MixerKeyerCommand,
	MixerLevelsCommand,
	MixerMastervolumeCommand,
	MixerOpacityCommand,
	MixerPerspectiveCommand,
	MixerRotationCommand,
	MixerSaturationCommand,
	MixerStraightAlphaOutputCommand,
	MixerVolumeCommand,
} from 'casparcg-connection'

export function resolveMixerState(
	oldState: InternalState,
	newState: State,
	channel: string,
	layer: string
): { commands: DiffCommands; bundledCmds: Record<string, Array<AMCPCommandWithContext>> } {
	const newChannel = getChannel(newState, channel)
	const oldLayer = getLayer(oldState, channel, layer)
	const newLayer = getLayer(newState, channel, layer)

	const diffCmds: DiffCommands = {
		cmds: [],
	}
	const bundledCmds: {
		[bundleGroup: string]: Array<AMCPCommandWithContext>
	} = {}

	if (!newLayer.mixer) newLayer.mixer = new Mixer()
	if (!oldLayer.mixer) oldLayer.mixer = new Mixer()

	const pushMixerCommand = <T extends AMCPCommand>(
		attr: string,
		command: T['command'],
		subValue?: Array<keyof T['params']> | keyof T['params']
	): void => {
		const diff = compareMixerValues(newLayer, oldLayer, attr, _.isArray(subValue) ? (subValue as string[]) : undefined)
		if (diff) {
			const options: any = {}
			options.channel = newChannel.channelNo
			if (newLayer.layerNo !== -1) {
				options.layer = newLayer.layerNo
			}

			let o: any = Mixer.getValue((newLayer.mixer || {})[attr])
			if (newLayer.mixer && _.has(newLayer.mixer, attr) && !_.isUndefined(o)) {
				setMixerTransition(options, newChannel, oldLayer, newLayer.mixer, false)
			} else {
				setMixerTransition(options, newChannel, oldLayer, newLayer.mixer, true)
				o = Mixer.getDefaultValues(attr)
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
				// options['bundleWithCommands'] = newLayer.mixer.bundleWithCommands
				const key = newLayer.mixer.bundleWithCommands + ''
				if (!bundledCmds[key]) bundledCmds[key] = []

				options['defer'] = true

				bundledCmds[key].push(addContext({ command, params: options } as T, `Bundle: ${diff}`, newLayer))
			} else {
				addCommands(diffCmds, addContext({ command, params: options } as T, `Mixer: ${diff}`, newLayer || oldLayer))
			}
		}
	}

	pushMixerCommand<MixerAnchorCommand>('anchor', Commands.MixerAnchor, ['x', 'y'])
	pushMixerCommand<MixerBlendCommand>('blendmode', Commands.MixerBlend, 'value')
	pushMixerCommand<MixerBrightnessCommand>('brightness', Commands.MixerBrightness, 'value')
	pushMixerCommand<MixerChromaCommand>('chroma', Commands.MixerChroma, [
		'enable',
		'targetHue',
		'hueWidth',
		'minSaturation',
		'minBrightness',
		'softness',
		'spillSuppress',
		'spillSuppressSaturation',
		'showMask',
	])
	pushMixerCommand<MixerClipCommand>('clip', Commands.MixerClip, ['x', 'y', 'width', 'height'])
	pushMixerCommand<MixerContrastCommand>('contrast', Commands.MixerContrast, 'value')
	pushMixerCommand<MixerCropCommand>('crop', Commands.MixerCrop, ['left', 'top', 'right', 'bottom'])
	pushMixerCommand<MixerFillCommand>('fill', Commands.MixerFill, ['x', 'y', 'xScale', 'yScale'])
	// grid
	pushMixerCommand<MixerKeyerCommand>('keyer', Commands.MixerKeyer, 'keyer')
	pushMixerCommand<MixerLevelsCommand>('levels', Commands.MixerLevels, [
		'minInput',
		'maxInput',
		'gamma',
		'minOutput',
		'maxOutput',
	])
	if (newLayer.layerNo === -1) {
		pushMixerCommand<MixerMastervolumeCommand>('mastervolume', Commands.MixerMastervolume, 'value')
	}
	// mipmap
	pushMixerCommand<MixerOpacityCommand>('opacity', Commands.MixerOpacity, 'value')
	pushMixerCommand<MixerPerspectiveCommand>('perspective', Commands.MixerPerspective, [
		'topLeftX',
		'topLeftY',
		'topRightX',
		'topRightY',
		'bottomRightX',
		'bottomRightY',
		'bottomLeftX',
		'bottomLeftY',
	])
	pushMixerCommand<MixerRotationCommand>('rotation', Commands.MixerRotation, 'value')
	pushMixerCommand<MixerSaturationCommand>('saturation', Commands.MixerSaturation, 'value')
	if (newLayer.layerNo === -1) {
		pushMixerCommand<MixerStraightAlphaOutputCommand>('straightAlpha', Commands.MixerStraightAlphaOutput, 'value')
	}
	pushMixerCommand<MixerVolumeCommand>('volume', Commands.MixerVolume, 'value')

	return { commands: diffCmds, bundledCmds }
}
