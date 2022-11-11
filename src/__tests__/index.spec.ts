import { AMCPCommand, Commands } from 'casparcg-connection'
import { literal } from '../lib/util'

import {
	CasparCGState,
	// DiffCommands,
	// DiffCommandGroups,
	State,
	MediaLayer,
	LayerContentType,
	Channel,
	EmptyLayer,
	RecordLayer,
	// FunctionLayer,
	Mixer,
} from '../'
import { getCasparCGState, initState, getDiff, initStateMS, stripContext } from './util'

// function initState0 (s: CasparCGState, time: number) {
// 	s.initStateFromChannelInfo([{
// 		videoMode: 'PAL',
// 		fps: 50
// 	}], time)
// }
// function applyCommands (c: CGState, cc: DiffCommandGroups) {

// 	let commands: Array<{
// 		cmd: CommandNS.IAMCPCommandVO,
// 		additionalLayerState?: InternalLayer
// 	}> = []

// 	_.each(cc, (c: DiffCommands) => {
// 		_.each(c.cmds, (cmd) => {
// 			commands.push({
// 				cmd: cmd,
// 				additionalLayerState: c.additionalLayerState
// 			})
// 		})
// 	})
// 	c.ccgState.applyCommands(commands, c.time)
// }
test('get version', () => {
	const c = getCasparCGState()
	initState(c)

	expect(c.ccgState.version).toMatch(/\d+-\d+-\d+ \d+:\d+\d/)
})
// test('get & set state', () => {
// 	let c = getCasparCGState()
// 	initState(c)

// 	// initialize:

// 	// Make some test commands:
// 	let myTestPlayCommand = new AMCP.PlayCommand({
// 		channel: 1,
// 		layer: 10,
// 		clip: 'AMB'
// 	})
// 	c.ccgState.applyCommands([{
// 		cmd: myTestPlayCommand.serialize()
// 	}], c.time)

// 	let myState0 = c.ccgState.getState()

// 	let ccgState1 = new CasparCGState()
// 	initState0(ccgState1, c.time)

// 	let ccgStateInitialized = new CasparCGState()
// 	initState0(ccgStateInitialized, c.time)

// 	let unInitializedState = {}

// 	ccgState1.setState(myState0)
// 	expect(c.ccgState.getState()).toEqual(ccgState1.getState())
// 	expect(c.ccgState.getState()).not.toEqual(ccgStateInitialized.getState())
// 	expect(c.ccgState.getState()).not.toEqual(unInitializedState)

// 	// Clear the state, but keep the initialization info
// 	c.ccgState.softClearState()

// 	expect(c.ccgState.getState()).toEqual(ccgStateInitialized.getState())
// 	expect(c.ccgState.getState()).not.toEqual(ccgState1.getState())
// 	expect(c.ccgState.getState()).not.toEqual(unInitializedState)

// 	// Clear the state completely
// 	c.ccgState.clearState()
// 	expect(() => {
// 		c.ccgState.getState()
// 	}).toThrowError()
// })

test('Record to a file', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: RecordLayer = {
		id: 'rec0',
		content: LayerContentType.RECORD,
		layerNo: 10,
		media: 'OUTPUT.mp4',
		playing: true,
		encoderOptions: '--fastdecode',
		playTime: -4000,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Add,
			params: {
				channel: 1,
				consumer: 'FILE',
				parameters: 'OUTPUT.mp4 --fastdecode',
			},
		})
	)

	// Start a new recording:
	c.time = 1010 // Advance the time
	layer10.playTime = c.time

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Add,
			params: {
				channel: 1,
				consumer: 'FILE',
				parameters: 'OUTPUT.mp4 --fastdecode',
			},
		})
	)

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Remove,
			params: {
				channel: 1,
				consumer: 'FILE',
			},
		})
	)
})
// test('Run a function', () => {
// 	const c = getCasparCGState()
// 	initState(c)

// 	let cc: ReturnType<typeof getDiff>

// 	// Play a template file:

// 	const layer10: FunctionLayer = {
// 		id: 'fcn0',
// 		content: LayerContentType.FUNCTION,
// 		layerNo: 10,
// 		media: 'myFunction',
// 		executeFcn: 'myFunction', // name of function to execute
// 		executeData: 'my cool data',
// 		playTime: 995
// 	}
// 	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
// 	const targetState: State = { channels: { '1': channel1 } }

// 	cc = getDiff(c, targetState)
// 	expect(cc).toHaveLength(1)
// 	expect(cc[0].cmds).toHaveLength(1)
// 	expect(cc[0].cmds[0]).toMatchObject({
// 		_commandName: 'executeFunction',
// 		channel: 1,
// 		layer: 10,
// 		functionName: 'myFunction',
// 		functionData: 'my cool data'
// 	})

// 	// Remove the layer
// 	delete channel1.layers['10']

// 	cc = getDiff(c, targetState)
// 	expect(cc).toHaveLength(0)
// })
// test('Apply commands before init', () => {
// 	let c = getCasparCGState()
// 	initState(c)
// 	let cc: ReturnType<typeof getDiff>

// 	// Play a video file:

// 	let layer10: IMediaLayer = {
// 		id: 'l0',
// 		content: LayerContentType.MEDIA,
// 		layerNo: 10,
// 		media: 'AMB',
// 		playing: true,
// 		playTime: 1000,
// 		seek: 0
// 	}
// 	let channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
// 	let targetState: State = { channels: { '1': channel1 } }
// 	// cc = getDiff(c, targetState)

// 	cc = c.ccgState.getDiff(targetState, c.time)

// 	let c2 = getCasparCGState()

// 	// Apply commands before init
// 	applyCommands(c2, cc)

// 	initState(c2)

// 	// Then resolve state, it should generate no commands:
// 	cc = getDiff(c2, targetState)
// 	expect(cc).toHaveLength(1)
// 	expect(cc[0].cmds).toHaveLength(0)
// })

test('Bundle commands', () => {
	const c = getCasparCGState()
	c.ccgState.initStateFromChannelInfo(
		[
			{
				videoMode: 'PAL',
				fps: 50,
			},
			{
				videoMode: 'PAL',
				fps: 50,
			},
		],
		c.time
	)

	let cc: ReturnType<typeof getDiff>

	// Play two a video files

	const layer110: MediaLayer = {
		id: 'l110',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer110 } }
	const layer210: MediaLayer = {
		id: 'l210',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB2',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel2: Channel = { channelNo: 2, layers: { '10': layer210 } }
	const targetState: State = { channels: { '1': channel1, '2': channel2 } }

	cc = getDiff(c, targetState)
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
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 2,
				layer: 10,
				clip: 'AMB2',
				loop: false,
				seek: 0,
			},
		})
	)

	// change the perspective of video1, and the saturation of video 2 at the same time
	const mixer110: Mixer = {
		perspective: {
			topLeftX: 0.3,
			topLeftY: 0.3,
			topRightX: 1,
			topRightY: 0,
			bottomRightX: 1,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1,
		},
		bundleWithCommands: 1234,
	}
	layer110.mixer = mixer110

	const mixer210: Mixer = {
		saturation: 0.5,
		bundleWithCommands: 1234,
	}
	layer210.mixer = mixer210
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(3)
	expect(cc[0].cmds).toHaveLength(0)
	expect(cc[1].cmds).toHaveLength(0)
	expect(cc[2].cmds).toHaveLength(4)
	expect(stripContext(cc[2].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerPerspective,
			params: {
				channel: 1,
				layer: 10,
				topLeftX: 0.3,
				topLeftY: 0.3,
				topRightX: 1,
				topRightY: 0,
				bottomRightX: 1,
				bottomRightY: 1,
				bottomLeftX: 0,
				bottomLeftY: 1,
				defer: true,
				// bundleWithCommands: 1234
			},
		})
	),
		expect(stripContext(cc[2].cmds[1])).toEqual(
			literal<AMCPCommand>({
				command: Commands.MixerSaturation,
				params: {
					channel: 2,
					layer: 10,
					value: 0.5,
					defer: true,
					// bundleWithCommands: 1234
				},
			})
		),
		expect(stripContext(cc[2].cmds[2])).toEqual(
			literal<AMCPCommand>({
				command: Commands.MixerCommit,
				params: {
					channel: 1,
				},
			})
		)
	expect(stripContext(cc[2].cmds[3])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerCommit,
			params: {
				channel: 2,
			},
		})
	)
})

test('Prioritize commands', () => {
	const c = getCasparCGState()
	initState(c)

	// Load a video file (paused):
	const layer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.MEDIA,
			media: 'AMB',
			auto: false,
		},
	}
	const channel1: Channel = { channelNo: 1, fps: 50, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	let cmds = CasparCGState.diffStatesOrderedCommands(c.ccgState.getState(), targetState, c.time)

	expect(cmds).toHaveLength(1)
	expect(stripContext(cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Loadbg,
			params: {
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				// noClear: false,
				loop: false,
				seek: 0,
			},
		})
	)

	let oldState = JSON.parse(JSON.stringify(targetState))
	// First loadbg another video:
	const layer8: EmptyLayer = {
		id: 'l8',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 8,
		nextUp: {
			id: 'n0',
			content: LayerContentType.MEDIA,
			media: 'AMB',
			auto: false,
		},
	}
	channel1.layers['8'] = layer8
	// Then play a new video:
	const layer9: MediaLayer = {
		id: 'l9',
		content: LayerContentType.MEDIA,
		layerNo: 9,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	channel1.layers['9'] = layer9
	// Start playing the preloaded video:
	channel1.layers['10'] = {
		id: 'l1',
		content: LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10,
	}
	cmds = CasparCGState.diffStatesOrderedCommands(oldState, targetState, c.time)
	// Note that the order should be reversed: first play 1-10, then play 1-9 amb, then loadbg 1-8 amb
	expect(cmds).toHaveLength(3)
	expect(stripContext(cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
	expect(stripContext(cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 9,
				clip: 'AMB',
				loop: false,
				seek: 0,
			},
		})
	)
	expect(stripContext(cmds[2])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Loadbg,
			params: {
				channel: 1,
				layer: 8,
				auto: false,
				clip: 'AMB',
				// noClear: false,
				loop: false,
				seek: 0,
			},
		})
	)

	// Remove the video
	oldState = JSON.parse(JSON.stringify(targetState))
	delete channel1.layers['10']

	cmds = CasparCGState.diffStatesOrderedCommands(oldState, targetState, c.time)
	expect(cmds).toHaveLength(1)
	expect(stripContext(cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
