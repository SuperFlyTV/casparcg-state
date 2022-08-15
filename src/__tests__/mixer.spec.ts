import { CGState, getCasparCGState, initState, getDiff, stripContext } from './util'
import { State, MediaLayer, EmptyLayer, Channel, LayerContentType, LayerBase, AMCPCommandWithContext } from '../'
import { InternalLayer } from '../lib/stateObjectStorage'
import { AMCPCommand, Commands, Enum } from 'casparcg-connection'
import { Mixer } from '../lib/mixer'
import { literal } from '../lib/util'

describe('MixerCommands', () => {
	let c: CGState
	let cc: {
		cmds: AMCPCommandWithContext[]
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
			seek: 0,
		}
		layerMinus1 = {
			id: 'l1',
			content: LayerContentType.NOTHING,
			playing: false,
			layerNo: -1,
		}
		channel1 = { channelNo: 1, layers: { '10': layer10, '-1': layerMinus1 } }

		targetState = { channels: { '1': channel1 } }
		cc = getDiff(c, targetState, false)
		test('A play command to be generated', () => {
			expect(cc).toHaveLength(2)
			expect(cc[0].cmds).toHaveLength(1)
			expect(stripContext(cc[0].cmds[0])).toEqual(
				literal<AMCPCommand>({
					command: Commands.Play,
					params: {
						channel: 1,
						layer: 10,
						clip: 'AMB',
						loop: false,
						seek: 0,
					},
				})
			)
			expect(cc[1].cmds).toHaveLength(0)
		})
	})
	test('Mixer Anchor', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ anchor: { x: 100, y: 132 } },
			literal<AMCPCommand>({
				command: Commands.MixerAnchor,
				params: {
					channel: 1,
					layer: 10,
					x: 100,
					y: 132,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerAnchor,
				params: {
					channel: 1,
					layer: 10,
					x: 0,
					y: 0,
				},
			})
		)
	})
	test('Mixer Blend', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ blendmode: Enum.BlendMode.ColorBurn },
			literal<AMCPCommand>({
				command: Commands.MixerBlend,
				params: {
					channel: 1,
					layer: 10,
					value: Enum.BlendMode.ColorBurn,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerBlend,
				params: {
					channel: 1,
					layer: 10,
					value: Enum.BlendMode.Normal,
				},
			})
		)
	})
	test('Mixer Brightness', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ brightness: 1.5 },
			literal<AMCPCommand>({
				command: Commands.MixerBrightness,
				params: {
					channel: 1,
					layer: 10,
					value: 1.5,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerBrightness,
				params: {
					channel: 1,
					layer: 10,
					value: 1,
				},
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
					enable: true,
					targetHue: 0.3,
					hueWidth: 0.4,
					minSaturation: 0.5,
					minBrightness: 0.6,
					softness: 0.7,
					spillSuppress: 0.8,
					spillSuppressSaturation: 0.9,
					showMask: false,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerChroma,
				params: {
					channel: 1,
					layer: 10,
					enable: true,
					targetHue: 0.3,
					hueWidth: 0.4,
					minSaturation: 0.5,
					minBrightness: 0.6,
					softness: 0.7,
					spillSuppress: 0.8,
					spillSuppressSaturation: 0.9,
					showMask: false,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerChroma,
				params: {
					channel: 1,
					layer: 10,
					enable: false,
					targetHue: 0,
					hueWidth: 0,
					minSaturation: 0,
					minBrightness: 0,
					softness: 0,
					spillSuppress: 0,
					spillSuppressSaturation: 0,
					showMask: false,
				},
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
					height: 0.25,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerClip,
				params: {
					channel: 1,
					layer: 10,
					x: 0.5,
					y: 0.5,
					width: 0.25,
					height: 0.25,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerClip,
				params: {
					channel: 1,
					layer: 10,
					x: 0,
					y: 0,
					width: 1,
					height: 1,
				},
			})
		)
	})
	test('Mixer Contrast', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ contrast: 1.5 },
			literal<AMCPCommand>({
				command: Commands.MixerContrast,
				params: {
					channel: 1,
					layer: 10,
					value: 1.5,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerContrast,
				params: {
					channel: 1,
					layer: 10,
					value: 1,
				},
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
					bottom: 0.34,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerCrop,
				params: {
					channel: 1,
					layer: 10,
					left: 0.25,
					top: 0.25,
					right: 0.33,
					bottom: 0.34,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerCrop,
				params: {
					channel: 1,
					layer: 10,
					left: 0,
					top: 0,
					right: 0,
					bottom: 0,
				},
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
					yScale: 0.85,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerFill,
				params: {
					channel: 1,
					layer: 10,
					x: 0.1,
					y: 0.2,
					xScale: 0.9,
					yScale: 0.85,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerFill,
				params: {
					channel: 1,
					layer: 10,
					x: 0,
					y: 0,
					xScale: 1,
					yScale: 1,
				},
			})
		)
	})
	test('Mixer Keyer', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ keyer: true },
			literal<AMCPCommand>({
				command: Commands.MixerKeyer,
				params: {
					channel: 1,
					layer: 10,
					keyer: true,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerKeyer,
				params: {
					channel: 1,
					layer: 10,
					keyer: false,
				},
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
					maxOutput: 0.99,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerLevels,
				params: {
					channel: 1,
					layer: 10,
					minInput: 0.1,
					maxInput: 0.9,
					gamma: 1.1,
					minOutput: 0.2,
					maxOutput: 0.99,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerLevels,
				params: {
					channel: 1,
					layer: 10,
					minInput: 0,
					maxInput: 1,
					gamma: 1,
					minOutput: 0,
					maxOutput: 1,
				},
			})
		)
	})
	test('Mixer Mastervolume', () => {
		testMixerEffect(
			c,
			targetState,
			layerMinus1,
			{ mastervolume: 0.9 },
			literal<AMCPCommand>({
				command: Commands.MixerMastervolume,
				params: {
					channel: 1,
					value: 0.9,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerMastervolume,
				params: {
					channel: 1,
					value: 1,
				},
			})
		)
	})
	test('Mixer Opacity', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ opacity: 0.9 },
			literal<AMCPCommand>({
				command: Commands.MixerOpacity,
				params: {
					channel: 1,
					layer: 10,
					value: 0.9,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerOpacity,
				params: {
					channel: 1,
					layer: 10,
					value: 1,
				},
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
					bottomLeftY: 1.01,
				},
			},
			literal<AMCPCommand>({
				command: Commands.MixerPerspective,
				params: {
					channel: 1,
					layer: 10,
					topLeftX: 0.1,
					topLeftY: 0.05,
					topRightX: 1.1,
					topRightY: 0.2,
					bottomRightX: 1.2,
					bottomRightY: 0.9,
					bottomLeftX: 0.12,
					bottomLeftY: 1.01,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerPerspective,
				params: {
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
				},
			})
		)
	})
	test('Mixer Rotation', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ rotation: 16 },
			literal<AMCPCommand>({
				command: Commands.MixerRotation,
				params: {
					channel: 1,
					layer: 10,
					value: 16,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerRotation,
				params: {
					channel: 1,
					layer: 10,
					value: 0,
				},
			})
		)
	})
	test('Mixer Saturation', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ saturation: 0.5 },
			literal<AMCPCommand>({
				command: Commands.MixerSaturation,
				params: {
					channel: 1,
					layer: 10,
					value: 0.5,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerSaturation,
				params: {
					channel: 1,
					layer: 10,
					value: 1,
				},
			})
		)
	})
	test('Mixer StraightAlphaOutput', () => {
		testMixerEffect(
			c,
			targetState,
			layerMinus1,
			{ straightAlpha: true },
			literal<AMCPCommand>({
				command: Commands.MixerStraightAlphaOutput,
				params: {
					channel: 1,
					value: true,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerStraightAlphaOutput,
				params: {
					channel: 1,
					value: false,
				},
			})
		)
	})
	test('Mixer Volume', () => {
		testMixerEffect(
			c,
			targetState,
			layer10,
			{ volume: 0.45 },
			literal<AMCPCommand>({
				command: Commands.MixerVolume,
				params: {
					channel: 1,
					layer: 10,
					value: 0.45,
				},
			}),
			literal<AMCPCommand>({
				command: Commands.MixerVolume,
				params: {
					channel: 1,
					layer: 10,
					value: 1,
				},
			})
		)
	})
	// test('Mixer Other transition type', () => {
	// 	testMixerEffect(
	// 		c,
	// 		targetState,
	// 		layer10,
	// 		{
	// 			changeTransition: {
	// 				type: 'other',
	// 				customOptions: {
	// 					blob0: 'data-blob',
	// 					blob1: { test: 'this is another blob' }
	// 				}
	// 			},
	// 			volume: 0.48
	// 		},
	// 		literal<AMCPCommand>({command: Commands.MixerVolume, params: {
	// 			channel: 1,
	// 			layer: 10,
	// 			volume: 0.48,
	// 			transition: 'other',
	// 			transitionDirection: 'right', // default value
	// 			transitionDuration: 0, // default
	// 			transitionEasing: 'linear', // default value

	// 			// Thie customOptions data is passed through into the command:
	// 			customOptions: {
	// 				blob0: 'data-blob',
	// 				blob1: { test: 'this is another blob' }
	// 			}
	// 		}}),
	// 		literal<AMCPCommand>({command: Commands.MixerVolume, params: {
	// 			channel: 1,
	// 			layer: 10,
	// 			volume: 1,
	// 			_defaultOptions: true
	// 		}})
	// 	)
	// })
})

function testMixerEffect(
	c: CGState,
	targetState: State,
	layer: LayerBase,
	mixer: Mixer,
	cmd0: AMCPCommand,
	cmd1: AMCPCommand
): void {
	// apply mixer effect
	layer.mixer = mixer
	let cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	if (layer.layerNo !== -1) {
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(cc[0].cmds[0])).toEqual(cmd0)
		expect(cc[1].cmds).toHaveLength(0) // the layer -1
		// reset mixer effect:
		layer.mixer = {}
		cc = getDiff(c, targetState)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(cc[0].cmds[0])).toEqual(cmd1)
		expect(cc[1].cmds).toHaveLength(0) // the layer -1
	} else {
		expect(cc[0].cmds).toHaveLength(0) // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(cmd0)
		// reset mixer effect:
		layer.mixer = {}
		cc = getDiff(c, targetState)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(0) // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(cmd1)
	}
}
