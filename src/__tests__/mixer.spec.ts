import { CGState, getCasparCGState, initState, getDiff, stripContext, fixCommand } from './util'
import {
	AMCPCommandVOWithContext,
	State,
	MediaLayer,
	EmptyLayer,
	Channel,
	LayerContentType,
	LayerBase
} from '../'
import { InternalLayer } from '../lib/stateObjectStorage'
import { AMCP, Command as CommandNS, Enum as CCGEnum } from 'casparcg-connection'
import { Mixer } from '../lib/mixer'

describe('MixerCommands', () => {
	let c: CGState
	let cc: {
		cmds: AMCPCommandVOWithContext[]
		additionalLayerState?: InternalLayer
	}[]
	let targetState: State
	let layer10: MediaLayer
	let layerMinus1: EmptyLayer
	let channel1: Channel
	beforeAll(() => {
		c = getCasparCGState()
		initState(c)

		// Play a video file:

		layer10 = {
			id: 'l0',
			content: LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			playing: true,
			playTime: 1000,
			seek: 0
		}
		layerMinus1 = {
			id: 'l1',
			content: LayerContentType.NOTHING,
			playing: false,
			layerNo: -1
		}
		channel1 = { channelNo: 1, layers: { '10': layer10, '-1': layerMinus1 } }

		targetState = { channels: { '1': channel1 } }
		cc = getDiff(c, targetState, false)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(stripContext(cc[0].cmds[0]))).toEqual(
			fixCommand(
				new AMCP.PlayCommand({
					channel: 1,
					layer: 10,
					clip: 'AMB',
					loop: false,
					seek: 0
				})
			).serialize()
		)
		expect(cc[1].cmds).toHaveLength(0)
	})
	test('Mixer Anchor', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ anchor: { x: 100, y: 132 } },
			new AMCP.MixerAnchorCommand({
				channel: 1,
				layer: 10,
				x: 100,
				y: 132
			}),
			new AMCP.MixerAnchorCommand({
				channel: 1,
				layer: 10,
				x: 0,
				y: 0,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Blend', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ blendmode: CCGEnum.BlendMode.COLOR_BURN },
			new AMCP.MixerBlendCommand({
				channel: 1,
				layer: 10,
				blendmode: CCGEnum.BlendMode.COLOR_BURN
			}),
			new AMCP.MixerBlendCommand({
				channel: 1,
				layer: 10,
				blendmode: CCGEnum.BlendMode.NORMAL,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Brightness', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ brightness: 1.5 },
			new AMCP.MixerBrightnessCommand({
				channel: 1,
				layer: 10,
				brightness: 1.5
			}),
			new AMCP.MixerBrightnessCommand({
				channel: 1,
				layer: 10,
				brightness: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Chroma', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				chroma: {
					keyer: CCGEnum.Chroma.BLUE,
					threshold: 0.5,
					softness: 0.2,
					spill: 0.1
				}
			},
			new AMCP.MixerChromaCommand({
				channel: 1,
				layer: 10,
				keyer: CCGEnum.Chroma.BLUE,
				threshold: 0.5,
				softness: 0.2,
				spill: 0.1
			}),
			new AMCP.MixerChromaCommand({
				channel: 1,
				layer: 10,
				keyer: CCGEnum.Chroma.NONE,
				threshold: 0,
				softness: 0,
				spill: 0,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Clip', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				clip: {
					x: 0.5,
					y: 0.5,
					width: 0.25,
					height: 0.25
				}
			},
			new AMCP.MixerClipCommand({
				channel: 1,
				layer: 10,
				x: 0.5,
				y: 0.5,
				width: 0.25,
				height: 0.25
			}),
			new AMCP.MixerClipCommand({
				channel: 1,
				layer: 10,
				x: 0,
				y: 0,
				width: 1,
				height: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Contrast', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ contrast: 1.5 },
			new AMCP.MixerContrastCommand({
				channel: 1,
				layer: 10,
				contrast: 1.5
			}),
			new AMCP.MixerContrastCommand({
				channel: 1,
				layer: 10,
				contrast: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Crop', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				crop: {
					left: 0.25,
					top: 0.25,
					right: 0.33,
					bottom: 0.34
				}
			},
			new AMCP.MixerCropCommand({
				channel: 1,
				layer: 10,
				left: 0.25,
				top: 0.25,
				right: 0.33,
				bottom: 0.34
			}),
			new AMCP.MixerCropCommand({
				channel: 1,
				layer: 10,
				left: 0,
				top: 0,
				right: 0,
				bottom: 0,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Fill', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				fill: {
					x: 0.1,
					y: 0.2,
					xScale: 0.9,
					yScale: 0.85
				}
			},
			new AMCP.MixerFillCommand({
				channel: 1,
				layer: 10,
				x: 0.1,
				y: 0.2,
				xScale: 0.9,
				yScale: 0.85
			}),
			new AMCP.MixerFillCommand({
				channel: 1,
				layer: 10,
				x: 0,
				y: 0,
				xScale: 1,
				yScale: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Keyer', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ keyer: true },
			new AMCP.MixerKeyerCommand({
				channel: 1,
				layer: 10,
				keyer: true
			}),
			new AMCP.MixerKeyerCommand({
				channel: 1,
				layer: 10,
				keyer: false,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Levels', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				levels: {
					minInput: 0.1,
					maxInput: 0.9,
					gamma: 1.1,
					minOutput: 0.2,
					maxOutput: 0.99
				}
			},
			new AMCP.MixerLevelsCommand({
				channel: 1,
				layer: 10,
				minInput: 0.1,
				maxInput: 0.9,
				gamma: 1.1,
				minOutput: 0.2,
				maxOutput: 0.99
			}),
			new AMCP.MixerLevelsCommand({
				channel: 1,
				layer: 10,
				minInput: 0,
				maxInput: 1,
				gamma: 1,
				minOutput: 0,
				maxOutput: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Mastervolume', () => {
		testMixerEffect(
			c,
			targetState,
			layerMinus1,
			{ mastervolume: 0.9 },
			new AMCP.MixerMastervolumeCommand({
				channel: 1,
				mastervolume: 0.9
			}),
			new AMCP.MixerMastervolumeCommand({
				channel: 1,
				mastervolume: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Opacity', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ opacity: 0.9 },
			new AMCP.MixerOpacityCommand({
				channel: 1,
				layer: 10,
				opacity: 0.9
			}),
			new AMCP.MixerOpacityCommand({
				channel: 1,
				layer: 10,
				opacity: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Perspective', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{
				perspective: {
					topLeftX: 0.1,
					topLeftY: 0.05,
					topRightX: 1.1,
					topRightY: 0.2,
					bottomRightX: 1.2,
					bottomRightY: 0.9,
					bottomLeftX: 0.12,
					bottomLeftY: 1.01
				}
			},
			new AMCP.MixerPerspectiveCommand({
				channel: 1,
				layer: 10,
				topLeftX: 0.1,
				topLeftY: 0.05,
				topRightX: 1.1,
				topRightY: 0.2,
				bottomRightX: 1.2,
				bottomRightY: 0.9,
				bottomLeftX: 0.12,
				bottomLeftY: 1.01
			}),
			new AMCP.MixerPerspectiveCommand({
				channel: 1,
				layer: 10,
				topLeftX: 0,
				topLeftY: 0,
				topRightX: 1,
				topRightY: 0,
				bottomRightX: 1,
				bottomRightY: 1,
				bottomLeftX: 0,
				bottomLeftY: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Rotation', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ rotation: 16 },
			new AMCP.MixerRotationCommand({
				channel: 1,
				layer: 10,
				rotation: 16
			}),
			new AMCP.MixerRotationCommand({
				channel: 1,
				layer: 10,
				rotation: 0,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Saturation', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ saturation: 0.5 },
			new AMCP.MixerSaturationCommand({
				channel: 1,
				layer: 10,
				saturation: 0.5
			}),
			new AMCP.MixerSaturationCommand({
				channel: 1,
				layer: 10,
				saturation: 1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer StraightAlphaOutput', () => {
		testMixerEffect(
			c,
			targetState,
			layerMinus1,
			{ straightAlpha: true },
			new AMCP.MixerStraightAlphaOutputCommand({
				channel: 1,
				// eslint-disable-next-line
				straight_alpha_output: true
			}),
			new AMCP.MixerStraightAlphaOutputCommand({
				channel: 1,
				// eslint-disable-next-line
				straight_alpha_output: false,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Volume', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ volume: 0.45 },
			new AMCP.MixerVolumeCommand({
				channel: 1,
				layer: 10,
				volume: 0.45
			}),
			new AMCP.MixerVolumeCommand({
				channel: 1,
				layer: 10,
				volume: 1,
				_defaultOptions: true
			})
		)
	})
})

function testMixerEffect(
	c: CGState,
	targetState: State,
	layer: LayerBase,
	mixer: Mixer,
	cmd0: CommandNS.IAMCPCommand,
	cmd1: CommandNS.IAMCPCommand
) {
	// apply mixer effect
	layer.mixer = mixer
	let cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	if (layer.layerNo !== -1) {
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(cmd0).serialize())
		expect(cc[1].cmds).toHaveLength(0) // the layer -1
		// reset mixer effect:
		layer.mixer = {}
		cc = getDiff(c, targetState)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(cmd1).serialize())
		expect(cc[1].cmds).toHaveLength(0) // the layer -1
	} else {
		expect(cc[0].cmds).toHaveLength(0) // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(cmd0).serialize())
		// reset mixer effect:
		layer.mixer = {}
		cc = getDiff(c, targetState)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(0) // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(cmd1).serialize())
	}
}
