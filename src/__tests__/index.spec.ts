import * as _ from 'underscore'
import { AMCP, Enum as CCG_Enum, Command as CommandNS } from 'casparcg-connection'

import {
	CasparCG,
	CasparCGState,
	DiffCommands,
	DiffCommandGroups,
	IAMCPCommandVOWithContext
} from '../index'
import { CasparCGFull as CF } from '../lib/interfaces'

interface CGState {
	time: number
	log: boolean
	ccgState: CasparCGState
}
function getCasparCGState (): CGState {
	let time = 1000
	let logging: boolean = false
	let externalLog = (...args: any[]) => {
		if (logging) {
			console.log(...args)
		}
	}
	return {
		set time (t) {
			time = t
		},
		get time () {
			return time
		},
		set log (t: boolean) {
			logging = t
		},
		ccgState: new CasparCGState({
			externalLog: externalLog
		})
	}
}
function initState (c: CGState) {
	c.ccgState.initStateFromChannelInfo([{
		videoMode: 'PAL',
		fps: 50
	}], c.time)
}
function initState0 (s: CasparCGState, time: number) {
	s.initStateFromChannelInfo([{
		videoMode: 'PAL',
		fps: 50
	}], time)
}
function initStateMS (c: CGState) {
	c.ccgState.initStateFromChannelInfo([{
		videoMode: 'PAL',
		fps: 50 / 1000
	}], c.time)
}
function getDiff (c: CGState, targetState: CasparCG.State, loggingAfter?: boolean) {

	let cc = c.ccgState.getDiff(targetState, c.time)

	if (loggingAfter) c.log = true
	applyCommands(c, cc)

	// after applying, test again vs same state, no new commands should be generated:
	// console.log('second try')
	let cc2 = c.ccgState.getDiff(targetState, c.time)
	expect(cc2.length).toBeLessThanOrEqual(2)
	if (cc2.length === 1) expect(cc2[0].cmds).toHaveLength(0)
	if (cc2.length === 2) expect(cc2[1].cmds).toHaveLength(0)

	if (loggingAfter) c.log = false
	return cc
}
function applyCommands (c: CGState, cc: DiffCommandGroups) {

	let commands: Array<{
		cmd: CommandNS.IAMCPCommandVO,
		additionalLayerState?: CF.Layer
	}> = []

	_.each(cc, (c: DiffCommands) => {
		_.each(c.cmds, (cmd) => {
			commands.push({
				cmd: cmd,
				additionalLayerState: c.additionalLayerState
			})
		})
	})
	c.ccgState.applyCommands(commands, c.time)
}
function stripContext (c: any) {
	return _.omit(c, 'context')
}
function fixCommand (c: any, options?: any) {
	options = options || {}
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.PlayCommand) c._objectParams.noClear = !!options.noClear
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.LoadCommand) c._objectParams.noClear = !!options.noClear
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.PauseCommand) c._objectParams.noClear = !!options.noClear
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.CGAddCommand) c._objectParams.noClear = !!options.noClear
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.PlayDecklinkCommand) c._objectParams.noClear = !!options.noClear
	// @ts-ignore access _objectParams
	if (c instanceof AMCP.PlayHtmlPageCommand) c._objectParams.noClear = !!options.noClear

	_.each(options, (val, key) => {
		c['_objectParams'][key] = val
	})
	return c
}
test('get version', () => {
	let c = getCasparCGState()
	initState(c)

	expect(c.ccgState.version).toMatch(/\d+-\d+-\d+ \d+:\d+\d/)
})
test('get & set state', () => {
	let c = getCasparCGState()
	initState(c)

	// initialize:

	// Make some test commands:
	let myTestPlayCommand = new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB'
	})
	c.ccgState.applyCommands([{
		cmd: myTestPlayCommand.serialize()
	}], c.time)

	let myState0 = c.ccgState.getState()

	let ccgState1 = new CasparCGState()
	initState0(ccgState1, c.time)

	let ccgStateInitialized = new CasparCGState()
	initState0(ccgStateInitialized, c.time)

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
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			videoMode: 'PAL'
		}], 1000)
	}).toThrowError(/missing.*fps/i)
	expect(() => {
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			fps: 50
		}], 1000)
	}).toThrowError(/missing.*videoMode/i)
	expect(() => {
		let ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo([{
			videoMode: 'PAL',
			fps: -1 // bad fps
		}], 1000)
	}).toThrowError(/fps/i)
})
test('Play a video, then stop it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any
	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
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
	expect(stripContext(stripContext(cc[0].cmds[0]))).toEqual(fixCommand(new AMCP.PlayCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play a video with the right channelLayout, then stop it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any
	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		channelLayout: 'TEST_LAYOUT',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		channelLayout: 'TEST_LAYOUT',
		seek: 0
	})).serialize())

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB2',
		loop: false,
		channelLayout: 'TEST_LAYOUT',
		seek: 0
	})).serialize())

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play a video, pause & resume it', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -4000 // 5 s ago
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 5 * 50
	})).serialize())

	// Pause the video
	c.time = 11000 // Advance the time 10s, to 11s
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PauseCommand({
		channel: 1,
		layer: 10,
		pauseTime: 11000
	})).serialize())
	// The video is now paused at 11s = 550

	// Resume playing:
	c.time = 15000 // Advance the time 4s, to 15s
	layer10.playing = true
	// it was paused for 10 seconds:
	layer10.playTime = c.time - (layer10.pauseTime - (layer10.playTime || 0))
	delete layer10.pauseTime

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ResumeCommand({
		channel: 1,
		layer: 10,
		noClear: false
	})).serialize())
})

test('Load a video, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ResumeCommand({
		channel: 1,
		layer: 10,
		noClear: false
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a video, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a video, then remove it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Remove the nextup
	let layer10noNext = _.clone(layer10)
	delete layer10noNext.nextUp

	channel1.layers['10'] = layer10noNext

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(0)
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())

	// Load the video again:
	channel1.layers['10'] = layer10

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	// Remove the nextup
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())

})
test('Loadbg a video, then loadbg another', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Now load another
	layer10.nextUp!.media = 'go1080p25'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'go1080p25',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())

})
test('Loadbg a video with a transition, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: new CasparCG.TransitionObject('AMB', {
				inTransition: new CasparCG.Transition('sting', 'mask_file')
			}),
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		transition: 'sting',
		stingMaskFilename: 'mask_file',
		stingDelay: 0,
		stingOverlayFilename: '',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.MEDIA,
		media: new CasparCG.TransitionObject('AMB', {
			inTransition: new CasparCG.Transition('sting', 'mask_file')
		}),
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a video with no transition, then play it with a transition', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Start playing it:
	channel1.layers['10'] = {
		id: 'v0',
		content: CasparCG.LayerContentType.MEDIA,
		media: new CasparCG.TransitionObject('AMB', {
			inTransition: new CasparCG.Transition('sting', 'mask_file')
		}),
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		transition: 'sting',
		stingMaskFilename: 'mask_file',
		stingDelay: 0,
		stingOverlayFilename: '',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Play a video, stop and loadbg another video', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any
	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())

	// Load a video file (paused):

	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	} as CasparCG.IEmptyLayer

	cc = getDiff(c, targetState, true)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.StopCommand({
		channel: 1,
		layer: 10,
		noClear: false
	})).serialize())
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a video, then play another video maintaining the bg', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	let newLayer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		media: 'CG1080i50',
		playTime: null,
		playing: true,
		layerNo: 10,
		nextUp: layer10.nextUp
	}
	channel1.layers['10'] = newLayer10
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(3)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'CG1080i50',
		loop: false,
		seek: 0
	})).serialize())
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())
	expect(stripContext(cc[0].cmds[2])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a video and play another video. stop the foreground while maintaining the bg', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Load a video file (paused):

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		media: 'CG1080i50',
		playTime: null,
		playing: true,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'CG1080i50',
		loop: false,
		seek: 0
	})).serialize())
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	let newLayer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: layer10.nextUp
	}
	channel1.layers['10'] = newLayer10
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.StopCommand({
		channel: 1,
		layer: 10,
		noClear: false
	})).serialize())

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		clip: 'EMPTY'
	})).serialize())

})
test('Play a looping video', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -9000, // 10 s ago
		length: 30 * 1000,
		looping: true
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: true,
		seek: 10 * 50,
		in: 0,
		length: 30 * 50
	})).serialize())
})
test('Play a looping video, with inPoint', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 0, // 1 s ago
		length: 10 * 1000,
		inPoint: 4 * 1000, // 4 s into the clip
		looping: true
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: true,
		seek: 5 * 50,
		in: 4 * 50,
		length: 10 * 50
	})).serialize())
})
test('Play a looping video, with inPoint & seek', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 0, // 1 s ago
		length: 2 * 1000,
		inPoint: 10 * 1000, // 10 s into the clip
		seek: 0, // beginning of clip
		looping: true
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: true,
		seek: 1 * 50,
		in: 10 * 50,
		length: 2 * 50
	})).serialize())
})
test('Play a looping video, pause & resume it', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -9000, // 10 s ago
		looping: true
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: true,
		seek: 0, // Because we only support accurate looping & seeking if length is provided
		in: 0
	})).serialize())

	// Pause the video
	c.time = 6000 // Advance the time
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PauseCommand({
		channel: 1,
		layer: 10,
		pauseTime: 6000
	})).serialize())

	// Resume playing:
	c.time = 11000 // Advance the time
	layer10.playing = true
	// it was paused for 15 seconds:
	layer10.playTime = c.time - (layer10.pauseTime - (layer10.playTime || 0))
	delete layer10.pauseTime

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ResumeCommand({
		channel: 1,
		layer: 10,
		noClear: false
	})).serialize())
})
test('Play a template, update the data & cgstop', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.ITemplateLayer = {
		id: 't0',
		content: CasparCG.LayerContentType.TEMPLATE,
		layerNo: 10,
		media: 'myTemplate',
		playing: true,
		templateType: 'html',
		templateData: { var0: 'one' },
		cgStop: true,
		playTime: 990 // 10s ago
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.CGAddCommand({
		channel: 1,
		layer: 10,
		templateName: 'myTemplate',
		templateType: 'html',
		cgStop: true,
		data: { var0: 'one' },
		flashLayer: 1,
		playOnLoad: true
	})).serialize())

	// update, with the same data
	layer10.templateData = { var0: 'one' },
	// try again, to ensure no new commands are sent:
	console.log('---------------------------------')
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(0)
	console.log('==================================')

	// Update the data:
	layer10.templateData = { var0: 'two' },

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.CGUpdateCommand({
		channel: 1,
		layer: 10,
		data: { var0: 'two' },
		flashLayer: 1
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.CGStopCommand({
		channel: 1,
		layer: 10,
		flashLayer: 1
	})).serialize())
})
test('Play an html-page', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IHtmlPageLayer = {
		id: 'h0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayHtmlPageCommand({
		channel: 1,
		layer: 10,
		url: 'http://superfly.tv'
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Loadbg a html-page, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// put a html-template on onNext:

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			auto: false,
			content: CasparCG.LayerContentType.HTMLPAGE,
			layerNo: 10,
			media: 'http://superfly.tv'
			// playing: true,
			// playTime: 990 // 10s ago
		}
	}

	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadHtmlPageBgCommand({
		channel: 1,
		layer: 10,
		url: 'http://superfly.tv',
		auto: false,
		noClear: false
	})).serialize())

	// Start playing the template:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.HTMLPAGE,
		layerNo: 10,
		media: 'http://superfly.tv',
		playTime: 1000
	}

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayHtmlPageCommand({
		channel: 1,
		layer: 10,
		url: 'http://superfly.tv'
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Play an input', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IInputLayer = {
		id: 'i0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayDecklinkCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})
test('Loadbg an input, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.INPUT,
			layerNo: 10,
			playing: true,
			media: 'decklink',
			input: {
				device: 1,
				format: '720p5000',
				channelLayout: 'stereo'
			},
			auto: false
		},

		playTime: null
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadDecklinkBgCommand({
		channel: 1,
		layer: 10,
		channelLayout: 'stereo',
		device: 1,
		format: '720p5000',
		auto: false,
		noClear: false
	})).serialize())

	// Start playing the input:

	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.INPUT,
		layerNo: 10,
		playing: true,
		media: 'decklink',
		input: {
			device: 1,
			format: '720p5000',
			channelLayout: 'stereo'
		}
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayDecklinkCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})

test('Play a Route', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IRouteLayer = {
		id: 'r0',
		content: CasparCG.LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15
		},
		delay: 20,
		playTime: null // playtime is null because it is irrelevant
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://2-15 FRAMES_DELAY 1')

	// Change the delay
	layer10.delay = 40

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://2-15 FRAMES_DELAY 2')

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Loadbg a Route, then change it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.ROUTE,
			layerNo: 10,
			media: 'route',

			route: {
				channel: 2,
				layer: 15
			},
			auto: false
		},
		playTime: null // playtime is null because it is irrelevant
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadRouteBgCommand({
		channel: 1,
		layer: 10,
		route: {
			channel: 2,
			layer: 15
		},
		channelLayout: undefined,
		mode: undefined,
		noClear: false
	})).serialize())

	expect(c.ccgState.getState().channels['1'].layers['10'].nextUp).toBeTruthy()
	expect(c.ccgState.getState().channels['1'].layers['10'].nextUp!.route).toMatchObject({
		channel: 2,
		layer: 15
	});

	(layer10.nextUp!.route as any).layer = 20

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadRouteBgCommand({
		channel: 1,
		layer: 10,
		route: {
			channel: 2,
			layer: 20
		},
		channelLayout: undefined,
		mode: undefined,
		noClear: false
	})).serialize())
})
test('Loadbg a Route, then play it', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.ROUTE,
			layerNo: 10,
			media: 'route',
			playing: true,

			route: {
				channel: 2,
				layer: 15
			},
			delay: 100,
			auto: false
		},
		playTime: null // playtime is null because it is irrelevant
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.LoadRouteBgCommand({
		channel: 1,
		layer: 10,
		route: {
			channel: 2,
			layer: 15
		},
		channelLayout: undefined,
		framesDelay: 5,
		mode: undefined,
		noClear: false
	})).serialize())

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15
		},
		delay: 100
	} as any
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toMatchObject(fixCommand(new AMCP.PlayRouteCommand({
		channel: 1,
		layer: 10,
		route: {
			channel: 2,
			layer: 15
		},
		framesDelay: 5
	})).serialize())

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Play a BG Route', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IRouteLayer = {
		id: 'r0',
		content: CasparCG.LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15
		},
		mode: 'BACKGROUND',
		playTime: null // playtime is null because it is irrelevant
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://2-15 BACKGROUND')

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())

})
test('Record to a file', () => {
	let c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IRecordLayer = {
		id: 'rec0',
		content: CasparCG.LayerContentType.RECORD,
		layerNo: 10,
		media: 'OUTPUT.mp4',
		playing: true,
		encoderOptions: '--fastdecode',
		playTime: -4000
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
	initState(c)

	let cc: any

	// Play a template file:

	let layer10: CasparCG.IFunctionLayer = {
		id: 'fcn0',
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
	initState(c)

	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerRotationCommand({
		channel: 1,
		layer: 10,
		rotation: 90
	})).serialize())

	// set master volume:
	let layerMinus1: CasparCG.ILayerBase = {
		id: 'b1',
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
	expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(new AMCP.MixerMastervolumeCommand({
		channel: 1,
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerFillCommand({
		channel: 1,
		layer: 10,
		x: 0.5,
		y: 0.5,
		xScale: 0.5,
		yScale: 0.5
	})).serialize())
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.MixerRotationCommand({
		channel: 1,
		layer: 10,
		rotation: 0
	}),{ _defaultOptions: true }).serialize())

	// move the video, with animation:
	mixer0.fill.x = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerFillCommand({
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
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
		channel: 1,
		layer: 10,
		opacity: 0.62,
		transition: 'mix',
		transitionDuration: 50,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	})).serialize())
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerBrightnessCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
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
	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.MixerOpacityCommand({
		channel: 1,
		layer: 10,
		opacity: 1,
		transition: 'mix',
		transitionDuration: 25,
		transitionDirection: 'right',
		transitionEasing: 'linear'
	}),{ _defaultOptions: true }).serialize())
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.MixerBrightnessCommand({
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
	expect(cc[1].cmds).toHaveLength(2)
	expect(stripContext(cc[1].cmds[0])).toEqual(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	}).serialize())
	expect(stripContext(cc[1].cmds[1])).toEqual(new AMCP.MixerClearCommand({
		channel: 1,
		layer: 10
	}).serialize())

	// Play a new video (without no mixer attributes)

	layer10 = {
		id: 'l2',
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
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())
})
// test('Play a video with a mixer transition, then stop it, then play video without mixer transition', () => {
// 	let c = getCasparCGState()
// 	initState(c)

// 	let cc: any

// 	// Play a video file:

// 	let layer10: CasparCG.IMediaLayer = {
// 		id: 'l0',
// 		content: CasparCG.LayerContentType.MEDIA,
// 		layerNo: 10,
// 		media: 'AMB',
// 		playing: true,
// 		playTime: 1000,
// 		seek: 0,
// 		mixer: {
// 			rotation: 90
// 		}
// 	}
// 	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
// 	let targetState: CasparCG.State = { channels: { '1': channel1 } }
// 	cc = getDiff(c, targetState, true)
// 	expect(cc).toHaveLength(1)
// 	expect(cc[0].cmds).toHaveLength(2)
// 	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
// 		channel: 1,
// 		layer: 10,
// 		clip: 'AMB',
// 		loop: false,
// 		seek: 0
// 	})).serialize())
// 	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.MixerRotationCommand({
// 		channel: 1,
// 		layer: 10,
// 		rotation: 90
// 	})).serialize())

// 	// Rotate the video:
// 	let mixer0: CasparCG.Mixer = {
// 		rotation: 90
// 	}
// 	layer10.mixer = mixer0
// 	cc = getDiff(c, targetState)
// 	expect(cc).toHaveLength(1)
// 	expect(cc[0].cmds).toHaveLength(1)

// 	// Remove the layer from the state
// 	delete channel1.layers['10']
// 	cc = getDiff(c, targetState)
// 	expect(cc).toHaveLength(2)
// 	expect(cc[1].cmds).toHaveLength(1)
// 	expect(stripContext(cc[1].cmds[0])).toEqual(new AMCP.ClearCommand({
// 		channel: 1,
// 		layer: 10
// 	}).serialize())

// 	// Stop the video


// 	// Play a new video (without no mixer attributes)

// 	layer10 = {
// 		id: 'l2',
// 		content: CasparCG.LayerContentType.MEDIA,
// 		layerNo: 10,
// 		media: 'AMB',
// 		playing: true,
// 		playTime: 1000,
// 		seek: 0
// 	}
// 	channel1.layers['10'] = layer10

// 	cc = getDiff(c, targetState)
// 	expect(cc).toHaveLength(2)
// 	expect(cc[0].cmds).toHaveLength(2)
// 	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
// 		channel: 1,
// 		layer: 10,
// 		clip: 'AMB',
// 		loop: false,
// 		seek: 0
// 	})).serialize())
// 	expect(stripContext(cc[0].cmds[1])).toEqual(fixCommand(new AMCP.MixerFillCommand({
// 		channel: 1,
// 		layer: 10,
// 		x: 0,
// 		y: 0,
// 		xScale: 1,
// 		yScale: 1
// 	}),{ _defaultOptions: true }).serialize())
// })
test('Play a video with transition, then stop it with transition', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a video file:
	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: new CasparCG.TransitionObject('AMB', {
			inTransition: new CasparCG.Transition('mix', 1),
			outTransition: new CasparCG.Transition({ type: 'sting', maskFile: 'mask_transition' })

		}),
		playing: true,
		playTime: 1000
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
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
	expect(stripContext(cc[0].cmds[0])).toEqual(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'empty',
		transition: 'sting',
		stingMaskFilename: 'mask_transition',
		stingDelay: 0,
		stingOverlayFilename: ''
	}).serialize())
})
test('Play a Route with transition, then stop it with transition', () => {
	let c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a Route:
	let layer10: CasparCG.IRouteLayer = {
		id: 'r0',
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
	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://3 mix 25 linear right')

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(new AMCP.PlayCommand({
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
	initState(c)

	let cc: any

	// Play a video file:
	let layer10: CasparCG.IInputLayer = {
		id: 'i0',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayDecklinkCommand({
		channel: 1,
		layer: 10,
		channelLayout: undefined,
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
	expect(stripContext(cc[0].cmds[0])).toEqual(new AMCP.PlayCommand({
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
	initState(c)
	let cc: any

	// Play a video file:

	let layer10: CasparCG.IMediaLayer = {
		id: 'l0',
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

	cc = c.ccgState.getDiff(targetState, c.time)

	let c2 = getCasparCGState()

	// Apply commands before init
	applyCommands(c2, cc)

	initState(c2)

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
	}], c.time)

	let cc: any

	// Play two a video files

	let layer110: CasparCG.IMediaLayer = {
		id: 'l110',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	let channel1: CasparCG.Channel = { channelNo: 1, layers: { '10': layer110 } }
	let layer210: CasparCG.IMediaLayer = {
		id: 'l210',
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
	expect(stripContext(cc[0].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
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
	expect(stripContext(cc[2].cmds[0])).toEqual(fixCommand(new AMCP.MixerPerspectiveCommand({
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
	expect(stripContext(cc[2].cmds[1])).toEqual(fixCommand(new AMCP.MixerSaturationCommand({
		channel: 2,
		layer: 10,
		saturation: 0.5,
		defer: true,
		bundleWithCommands: 1234
	})).serialize()),
	expect(stripContext(cc[2].cmds[2])).toEqual(fixCommand(new AMCP.MixerCommitCommand({
		channel: 1
	})).serialize())
	expect(stripContext(cc[2].cmds[3])).toEqual(fixCommand(new AMCP.MixerCommitCommand({
		channel: 2
	})).serialize())
})

test('Prioritize commands', () => {
	let c = getCasparCGState()
	initState(c)

	// Load a video file (paused):
	let layer10: CasparCG.IEmptyLayer = {
		id: 'e0',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			auto: false
		}
	}
	let channel1: CasparCG.Channel = { channelNo: 1, fps: 50, layers: { '10': layer10 } }
	let targetState: CasparCG.State = { channels: { '1': channel1 } }

	let cmds = c.ccgState.diffStatesOrderedCommands(c.ccgState.getState(), targetState, c.time)

	expect(cmds).toHaveLength(1)
	expect(stripContext(cmds[0])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 10,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	let oldState = JSON.parse(JSON.stringify(targetState))
	// First loadbg another video:
	let layer8: CasparCG.IEmptyLayer = {
		id: 'l8',
		content: CasparCG.LayerContentType.NOTHING,
		media: '',
		pauseTime: 0,
		playing: false,
		layerNo: 8,
		nextUp: {
			id: 'n0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 8,
			media: 'AMB',
			auto: false
		}
	}
	channel1.layers['8'] = layer8
	// Then play a new video:
	let layer9: CasparCG.IMediaLayer = {
		id: 'l9',
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 9,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	channel1.layers['9'] = layer9
	// Start playing the preloaded video:
	channel1.layers['10'] = {
		id: 'l1',
		content: CasparCG.LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cmds = c.ccgState.diffStatesOrderedCommands(oldState, targetState, c.time)
	// Note that the order should be reversed: first play 1-10, then play 1-9 amb, then loadbg 1-8 amb
	expect(cmds).toHaveLength(3)
	expect(stripContext(cmds[0])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 10
	})).serialize())
	expect(stripContext(cmds[1])).toEqual(fixCommand(new AMCP.PlayCommand({
		channel: 1,
		layer: 9,
		clip: 'AMB',
		loop: false,
		seek: 0
	})).serialize())
	expect(stripContext(cmds[2])).toEqual(fixCommand(new AMCP.LoadbgCommand({
		channel: 1,
		layer: 8,
		auto: false,
		clip: 'AMB',
		noClear: false,
		loop: false,
		seek: 0
	})).serialize())

	// Remove the video
	oldState = JSON.parse(JSON.stringify(targetState))
	delete channel1.layers['10']

	cmds = c.ccgState.diffStatesOrderedCommands(oldState, targetState, c.time)
	expect(cmds).toHaveLength(1)
	expect(stripContext(cmds[0])).toEqual(fixCommand(new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})

describe('MixerCommands', () => {
	let c: CGState
	let cc: {
		cmds: IAMCPCommandVOWithContext[];
		additionalLayerState?: CF.Layer;
	}[]
	let targetState: CasparCG.State
	let layer10: CasparCG.IMediaLayer
	let layerMinus1: CasparCG.IEmptyLayer
	let channel1: CasparCG.Channel
	beforeAll(() => {
		c = getCasparCGState()
		initState(c)

		// Play a video file:

		layer10 = {
			id: 'l0',
			content: CasparCG.LayerContentType.MEDIA,
			layerNo: 10,
			media: 'AMB',
			playing: true,
			playTime: 1000,
			seek: 0
		}
		layerMinus1 = {
			id: 'l1',
			content: CasparCG.LayerContentType.NOTHING,
			playing: false,
			pauseTime: 0,
			layerNo: -1
		}
		channel1 = { channelNo: 1, layers: { '10': layer10, '-1': layerMinus1 } }

		targetState = { channels: { '1': channel1 } }
		cc = getDiff(c, targetState, false)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(1)
		expect(stripContext(stripContext(cc[0].cmds[0]))).toEqual(fixCommand(new AMCP.PlayCommand({
			channel: 1,
			layer: 10,
			clip: 'AMB',
			loop: false,
			seek: 0
		})).serialize())
		expect(cc[1].cmds).toHaveLength(0)
	})
	test('Mixer Anchor', () => {
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
			{ blendmode: CCG_Enum.BlendMode.COLOR_BURN },
			new AMCP.MixerBlendCommand({
				channel: 1,
				layer: 10,
				blendmode: CCG_Enum.BlendMode.COLOR_BURN
			}),
			new AMCP.MixerBlendCommand({
				channel: 1,
				layer: 10,
				blendmode: CCG_Enum.BlendMode.NORMAL,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Brightness', () => {
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
			{ chroma: {
				keyer: CCG_Enum.Chroma.BLUE,
				threshold: 0.5,
				softness: 0.2,
				spill: 0.1
			} },
			new AMCP.MixerChromaCommand({
				channel: 1,
				layer: 10,
				keyer: CCG_Enum.Chroma.BLUE,
				threshold: 0.5,
				softness: 0.2,
				spill: 0.1
			}),
			new AMCP.MixerChromaCommand({
				channel: 1,
				layer: 10,
				keyer: CCG_Enum.Chroma.NONE,
				threshold: 0,
				softness: 0,
				spill: 0,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Clip', () => {
		testMixerEffect(c, targetState, layer10,
			{ clip: {
				x: 0.5,
				y: 0.5,
				width: 0.25,
				height: 0.25
			} },
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
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
			{ crop: {
				left: 0.25,
				top: 0.25,
				right: 0.33,
				bottom: 0.34
			} },
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
		testMixerEffect(c, targetState, layer10,
			{ fill: {
				x: 0.1,
				y: 0.2,
				xScale: 0.9,
				yScale: 0.85
			} },
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
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
			{ levels: {
				minInput: 	0.1,
				maxInput: 	0.9,
				gamma: 		1.1,
				minOutput: 	0.2,
				maxOutput: 	0.99
			} },
			new AMCP.MixerLevelsCommand({
				channel: 1,
				layer: 10,
				minInput: 	0.1,
				maxInput: 	0.9,
				gamma: 		1.1,
				minOutput: 	0.2,
				maxOutput: 	0.99
			}),
			new AMCP.MixerLevelsCommand({
				channel: 1,
				layer: 10,
				minInput: 	0,
				maxInput: 	1,
				gamma: 		1,
				minOutput: 	0,
				maxOutput: 	1,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Mastervolume', () => {
		testMixerEffect(c, targetState, layerMinus1,
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
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
			{ perspective: {
				topLeftX: 0.1,
				topLeftY: 0.05,
				topRightX: 1.1,
				topRightY: 0.2,
				bottomRightX: 1.2,
				bottomRightY: 0.9,
				bottomLeftX: 0.12,
				bottomLeftY: 1.01
			} },
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
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layer10,
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
		testMixerEffect(c, targetState, layerMinus1,
			{ straightAlpha: true },
			new AMCP.MixerStraightAlphaOutputCommand({
				channel: 1,
				straight_alpha_output: true
			}),
			new AMCP.MixerStraightAlphaOutputCommand({
				channel: 1,
				straight_alpha_output: false,
				_defaultOptions: true
			})
		)
	})
	test('Mixer Volume', () => {
		testMixerEffect(c, targetState, layer10,
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

function testMixerEffect (
	c: CGState,
	targetState: CasparCG.State,
	layer: CasparCG.ILayerBase,
	mixer: CasparCG.Mixer,
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
		expect(cc[1].cmds).toHaveLength(0)  // the layer -1

	} else {
		expect(cc[0].cmds).toHaveLength(0) // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(cmd0).serialize())
		// reset mixer effect:
		layer.mixer = {}
		cc = getDiff(c, targetState)
		expect(cc).toHaveLength(2)
		expect(cc[0].cmds).toHaveLength(0)  // the layer 10
		expect(cc[1].cmds).toHaveLength(1)
		expect(stripContext(cc[1].cmds[0])).toEqual(fixCommand(cmd1).serialize())

	}
}
