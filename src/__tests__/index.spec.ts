import * as _ from 'underscore'
import { AMCP } from 'casparcg-connection'

import {
	CasparCG,
	CasparCGState
} from '../index'

function getCasparCGState () {
	let time = 1000
	let currentTime = jest.fn(() => {
		return time
	})
	let logging = false
	let externalLog = (...args) => {
		if (logging) {
			console.log.apply(this, args)
		}
	}
	return {
		set time (t) {
			time = t
		},
		get time () {
			return time
		},
		set log (t) {
			logging = t
		},
		ccgState: new CasparCGState({
			currentTime: currentTime,
			externalLog: externalLog
		})
	}
}
function initState (s: CasparCGState) {
	s.initStateFromChannelInfo([{
		videoMode: 'PAL',
		fps: 50
	}])
}
function getDiff (c, targetState: CasparCG.State, loggingAfter?: boolean) {

	let cc = c.ccgState.getDiff(targetState)

	if (loggingAfter) c.log = true
	applyCommands(c.ccgState, cc)

	// after applying, test again vs same state, no new commands should be generated:

	let cc2 = c.ccgState.getDiff(targetState)
	expect(cc2.length).toBeLessThanOrEqual(2)
	if (cc2.length === 1) expect(cc2[0].cmds).toHaveLength(0)
	if (cc2.length === 2) expect(cc2[1].cmds).toHaveLength(0)

	if (loggingAfter) c.log = false
	return cc
}
function applyCommands (s: CasparCGState, cc: any) {

	let commands: any = []

	_.each(cc, (c: any) => {
		_.each(c.cmds, (cmd) => {
			commands.push({
				cmd: cmd,
				additionalLayerState: c.additionalLayerState
			})
		})
	})
	s.applyCommands(commands)
}
function fixCommand (c, options?: any) {
	options = options || {}
	if (
		c instanceof AMCP.PlayCommand ||
		c instanceof AMCP.LoadCommand ||
		c instanceof AMCP.PauseCommand ||
		c instanceof AMCP.CGAddCommand ||
		c instanceof AMCP.PlayDecklinkCommand ||
		c instanceof AMCP.PlayHtmlPageCommand
	) {
		c['_objectParams'].noClear = !!options.noClear
	}
	_.each(options, (val, key) => {
		c['_objectParams'][key] = val
	})
	return c
}
test('get version', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	expect(c.ccgState.version).toMatch(/\d+-\d+-\d+ \d+:\d+\d/)
})
test('get & set state', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	// initialize:

	// Make some test commands:
	let myTestPlayCommand = new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB'
	})
	c.ccgState.applyCommands([{
		cmd: myTestPlayCommand.serialize()
	}])

	let myState0 = c.ccgState.getState()

	let ccgState1 = new CasparCGState()
	initState(ccgState1)

	let ccgStateInitialized = new CasparCGState()
	initState(ccgStateInitialized)

	let unInitializedState = {}

	ccgState1.setState(myState0)
	expect(c.ccgState.getState()).toEqual(ccgState1.getState())
	expect(c.ccgState.getState()).not.toEqual(ccgStateInitialized.getState())
	expect(c.ccgState.getState()).not.toEqual(unInitializedState)

	// Clear the state, but keep the initialization info
	c.ccgState.softClearState()

	expect(c.ccgState.getState()).toEqual(ccgStateInitialized.getState())
	expect(c.ccgState.getState()).not.toEqual(ccgState1.getState())
	expect(c.ccgState.getState()).not.toEqual(unInitializedState)

	// Clear the state completely
	c.ccgState.clearState()
	expect(() => {
		c.ccgState.getState()
	}).toThrowError()
})
test('bad initializations', () => {

	expect(() => {
		// @ts-ignore: Bad currentTime
		let ccgState = new CasparCGState({
			currentTime: () => {
				// Nothing
			}
		})
	}).toThrowError(/currentTime/i)

	expect(() => {
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			videoMode: 'PAL'
		}])
	}).toThrowError(/missing.*fps/i)
	expect(() => {
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			fps: 50
		}])
	}).toThrowError(/missing.*videoMode/i)
	expect(() => {
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			videoMode: 'PAL',
			fps: -1 // bad fps
		}])
	}).toThrowError(/fps/i)
})
test('Play a video, then stop it', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any
	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB2',
		loop: false,
		seek: 0
	})).serialize())

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play a video, pause & resume it', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 995 // 5 s ago
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 5 * 50
	})).serialize())

	// Pause the video
	c.time = 1010 // Advance the time
	layer10.pauseTime = 1010
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PauseCommand({
		channel: 1,
		layer: 10,
		pauseTime: 1010
	})).serialize())

	// Resume playing:
	c.time = 1020 // Advance the time
	layer10.playing = true
	// it was paused for 10 seconds:
	layer10.playTime = c.time - (layer10.pauseTime - layer10.playTime)
	layer10.pauseTime = 0

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Load a video, then play it', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: false,
		playTime: 1000,
		pauseTime: 1000
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.LoadCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0,
		pauseTime: 1000
	})).serialize())

	// Start playing it:
	layer10.playing = true
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Play a looping video, pause & resume it', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 990, // 10 s ago
		looping: true
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: true,
		seek: 0 // no seeking, due to seeking not supported on looping video (this is by design)
	})).serialize())

	// Pause the video
	c.time = 1005 // Advance the time
	layer10.pauseTime = 1005
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PauseCommand({
		channel: 1,
		layer: 10,
		pauseTime: 1005
	})).serialize())

	// Resume playing:
	c.time = 1010 // Advance the time
	layer10.playing = true
	layer10.pauseTime = 0
	layer10.playTime = c.time

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play a template, update the data & cgstop', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.ITemplateLayer = {
		content: CasparCG.LayerContentType.TEMPLATE,
		layerNo: 10,
		media: 'myTemplate',
		playing: true,
		templateType: 'html',
		templateData: 'myData',
		cgStop: true,
		playTime: 990 // 10s ago
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.CGAddCommand({
		channel: 1,
		layer: 10,
		templateName: 'myTemplate',
		templateType: 'html',
		cgStop: true,
		data: 'myData',
		flashLayer: 1,
		playOnLoad: true
	})).serialize())

	// Update the data:
	layer10.templateData = 'new data'

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.CGUpdateCommand({
		channel: 1,
		layer: 10,
		data: 'new data',
		flashLayer: 1
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.CGStopCommand({
		channel: 1,
		layer: 10,
		flashLayer: 1
	})).serialize())
})
test('Play an html-page', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IHtmlPageLayer = {
		content: CasparCG.LayerContentType.HTMLPAGE,
		layerNo: 10,
		media: 'http://superfly.tv',
		playing: true,
		playTime: 990 // 10s ago
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayHtmlPageCommand({
		channel: 1,
		layer: 10,
		url: 'http://superfly.tv'
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play an input', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IInputLayer = {
		content: CasparCG.LayerContentType.INPUT,
		layerNo: 10,
		playing: true,
		media: 'decklink',
		input: {
			device: 1,
			format: '720p5000',
			channelLayout: 'stereo'
		},

		playTime: null
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayDecklinkCommand({
		channel: 1,
		layer: 10,
		channelLayout: 'stereo',
		device: 1,
		format: '720p5000'
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play a Route', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IRouteLayer = {
		content: CasparCG.LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15
		},
		playTime: null // playtime is null because it is irrelevant
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://2-15')

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Record to a file', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IRecordLayer = {
		content: CasparCG.LayerContentType.RECORD,
		layerNo: 10,
		media: 'OUTPUT.mp4',
		playing: true,
		encoderOptions: '--fastdecode',
		playTime: 995
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]._objectParams.command).toEqual('ADD 1 FILE OUTPUT.mp4 --fastdecode')

	// Start a new recording:
	c.time = 1010 // Advance the time
	layer10.playTime = c.time

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]._objectParams.command).toEqual('ADD 1 FILE OUTPUT.mp4 --fastdecode')

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]._objectParams.command).toEqual('REMOVE 1 FILE')

})
test('Run a function', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IFunctionLayer = {
		content: CasparCG.LayerContentType.FUNCTION,
		layerNo: 10,
		media: 'myFunction',
		executeFcn: 'myFunction', // name of function to execute
		executeData: 'my cool data',
		playTime: 995
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toMatchObject({
		_commandName: 'executeFunction',
		channel: 1,
		layer: 10,
		functionName: 'myFunction',
		functionData: 'my cool data'
	})

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(0)

})
test('Play a video, then add mixer attributes', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState, true)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())

	// Rotate the video:
	let mixer0: CasparCG.Mixer = {
		rotation: 90
	}
	layer10.mixer = mixer0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerRotationCommand({
		channel: 1,
		layer: 10,
		rotation: 90
	})).serialize())

	// set master volume:
	let layerMinus1: CasparCG.ILayerBase = {
		content: CasparCG.LayerContentType.NOTHING,
		layerNo: -1
	}
	channel1.layers['-1'] = layerMinus1
	layerMinus1.mixer = {
		mastervolume: 0.5
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(1)
	expect(cc[1].cmds[0]).toEqual(fixCommand(new AMCP.MixerMastervolumeCommand({
		channel: 1,
		layer: -1,
		mastervolume: 0.5
	})).serialize())

	// scale & move the video:
	delete mixer0.rotation
	mixer0.fill = {
		x: 0.5,
		y: 0.5,
		xScale: 0.5,
		yScale: 0.5
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerFillCommand({
		channel: 1,
		layer: 10,
		x: 0.5,
		y: 0.5,
		xScale: 0.5,
		yScale: 0.5
	})).serialize())
	expect(cc[0].cmds[1]).toEqual(fixCommand(new AMCP.MixerRotationCommand({
		channel: 1,
		layer: 10,
		rotation: 0
	}),{ _defaultOptions: true }).serialize())

	// move the video, with animation:
	mixer0.fill.x = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerFillCommand({
		channel: 1,
		layer: 10,
		x: 0,
		y: 0.5,
		xScale: 0.5,
		yScale: 0.5
	})).serialize())

	// fade down opacity a bit:
	mixer0.opacity = 0.62
	mixer0.inTransition = {
		duration: 1
	}
	mixer0.outTransition = {
		duration: 0.5
	}
	// increase brightness
	mixer0.brightness = 2

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(cc[0].cmds[1]).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
		channel: 1,
		layer: 10,
		opacity: 0.62,
		transition: 'mix',
		transitionDuration: 50,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	})).serialize())
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerBrightnessCommand({
		channel: 1,
		layer: 10,
		brightness: 2,
		transition: 'mix',
		transitionDuration: 50,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	})).serialize())

	// fade down opacity fully:
	mixer0.opacity = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
		channel: 1,
		layer: 10,
		opacity: 0,
		transition: 'mix',
		transitionDuration: 50,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	})).serialize())

	// reset / fade up opacity again (fade due to previous outTransition)
	delete mixer0.opacity
	// reset brightness as well
	delete mixer0.brightness
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(cc[0].cmds[1]).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
		channel: 1,
		layer: 10,
		opacity: 1,
		transition: 'mix',
		transitionDuration: 25,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	}),{ _defaultOptions: true }).serialize())
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.MixerBrightnessCommand({
		channel: 1,
		layer: 10,
		brightness: 1,
		transition: 'mix',
		transitionDuration: 25,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	}),{ _defaultOptions: true }).serialize())

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(1)
	expect(cc[1].cmds[0]).toEqual(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	}).serialize())

	// Play a new video (without no mixer attributes)

	layer10 = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	channel1.layers['10'] = layer10

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())
	expect(cc[0].cmds[1]).toEqual(fixCommand(new AMCP.MixerFillCommand({
		channel: 1,
		layer: 10,
		x: 0,
		y: 0,
		xScale: 1,
		yScale: 1
	}),{ _defaultOptions: true }).serialize())
})
test('Play a video with transition, then stop it with transition', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: new CasparCG.TransitionObject('AMB', {
			inTransition: new CasparCG.Transition('mix', 1),
			outTransition: new CasparCG.Transition('mix', 1)

		}),
		playing: true,
		playTime: 1000
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0,
		transition: 'mix',
		transitionDirection: 'right',
		transitionDuration: 50,
		transitionEasing: 'linear'
	})).serialize())

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'empty',
		transition: 'mix',
		transitionDirection: 'right',
		transitionDuration: 50,
		transitionEasing: 'linear'
	}).serialize())
})
test('Play a Route with transition, then stop it with transition', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a Route:
	let layer10: CasparCG.IRouteLayer = {
		content: CasparCG.LayerContentType.ROUTE,
		layerNo: 10,
		media: new CasparCG.TransitionObject('route', {
			inTransition: new CasparCG.Transition('mix', 0.5),
			outTransition: new CasparCG.Transition('mix', 1)
		}),
		route: {
			channel: 3
		},
		playing: true,
		playTime: null
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://3 mix 25 linear')

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'empty',
		transition: 'mix',
		transitionDirection: 'right',
		transitionDuration: 50,
		transitionEasing: 'linear'
	}).serialize())
})
test('Play a Decklink-input with transition, then stop it with transition', () => {
	let c = getCasparCGState()
	initState(c.ccgState)

	let cc: any

	// Play a video file:
	let layer10: CasparCG.IInputLayer = {
		content: CasparCG.LayerContentType.INPUT,
		layerNo: 10,
		media: new CasparCG.TransitionObject('decklink', {
			inTransition: new CasparCG.Transition('mix', 0.5),
			outTransition: new CasparCG.Transition('mix', 1)
		}),
		input: {
			device: 1,
			format: '720p5000'
			// channelLayout: 'stereo'
		},
		playing: true,
		playTime: null
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayDecklinkCommand({
		channel: 1,
		layer: 10,
		channelLayout: null,
		device: 1,
		format: '720p5000',
		transition: 'mix',
		transitionDirection: 'right',
		transitionDuration: 25,
		transitionEasing: 'linear'
	})).serialize())

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'empty',
		transition: 'mix',
		transitionDirection: 'right',
		transitionDuration: 50,
		transitionEasing: 'linear'
	}).serialize())
})
test('Apply commands before init', () => {
	let c = getCasparCGState()
	initState(c.ccgState)
	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	// cc = getDiff(c, targetState)

	cc = c.ccgState.getDiff(targetState)

	let c2 = getCasparCGState()

	// Apply commands before init
	applyCommands(c2.ccgState, cc)

	initState(c2.ccgState)

	// Then resolve state, it should generate no commands:
	cc = getDiff(c2, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(0)
})

test('Bundle commands', () => {
	let c = getCasparCGState()
	c.ccgState.initStateFromChannelInfo([{
		videoMode: 'PAL',
		fps: 50
	},{
		videoMode: 'PAL',
		fps: 50
	}])

	let cc: any

	// Play two a video files

	let layer110: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer110 } }
	let layer210: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB2',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel2: CasparCG.Channel = { channelNo: 2, layers: { '10': layer210 } }
	let targetState: CasparCG.State = { channels: { '1': channel1, '2': channel2 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())
	expect(cc[1].cmds).toHaveLength(1)
	expect(cc[1].cmds[0]).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 2,
		layer: 10,
		clip: 'AMB2',
		loop: false,
		seek: 0
	})).serialize())

	// change the perspective of video1, and the saturation of video 2 at the same time
	let mixer110: CasparCG.Mixer = {
		perspective: {
			topLeftX: 0.3,
			topLeftY: 0.3,
			topRightX: 1,
			topRightY: 0,
			bottomRightX: 1,
			bottomRightY: 1,
			bottomLeftX: 0,
			bottomLeftY: 1
		},
		bundleWithCommands: 1234
	}
	layer110.mixer = mixer110

	let mixer210: CasparCG.Mixer = {
		saturation: 0.5,
		bundleWithCommands: 1234
	}
	layer210.mixer = mixer210
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(3)
	expect(cc[0].cmds).toHaveLength(0)
	expect(cc[1].cmds).toHaveLength(0)
	expect(cc[2].cmds).toHaveLength(4)
	expect(cc[2].cmds[0]).toEqual(fixCommand(new AMCP.MixerPerspectiveCommand({
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
		bundleWithCommands: 1234
	})).serialize()),
	expect(cc[2].cmds[1]).toEqual(fixCommand(new AMCP.MixerSaturationCommand({
		channel: 2,
		layer: 10,
		saturation: 0.5,
		defer: true,
		bundleWithCommands: 1234
	})).serialize()),
	expect(cc[2].cmds[2]).toEqual(fixCommand(new AMCP.MixerCommitCommand({
		channel: 1
	})).serialize())
	expect(cc[2].cmds[3]).toEqual(fixCommand(new AMCP.MixerCommitCommand({
		channel: 2
	})).serialize())
})
