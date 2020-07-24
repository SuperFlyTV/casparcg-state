import {
	CasparCGState,
	MediaLayer,
	LayerContentType,
	Channel,
	State,
	TemplateLayer,
	HtmlPageLayer,
	InputLayer,
	RouteLayer,
	Mixer,
	LayerBase,
	TransitionObject,
	Transition
} from '../'
import { getCasparCGState, initState, getDiff, stripContext, fixCommand, initStateMS } from './util'
import { AMCP } from 'casparcg-connection'

test('bad initializations', () => {
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					videoMode: 'PAL'
				}
			],
			1000
		)
	}).toThrowError(/missing.*fps/i)
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					fps: 50
				}
			],
			1000
		)
	}).toThrowError(/missing.*videoMode/i)
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					videoMode: 'PAL',
					fps: -1 // bad fps
				}
			],
			1000
		)
	}).toThrowError(/fps/i)
})
test('Play a video, then stop it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
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

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB2',
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	// console.log('--------------')
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play a video with the right channelLayout, then stop it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		channelLayout: 'TEST_LAYOUT',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				channelLayout: 'TEST_LAYOUT',
				seek: 0
			})
		).serialize()
	)

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB2',
				loop: false,
				channelLayout: 'TEST_LAYOUT',
				seek: 0
			})
		).serialize()
	)

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play a video, pause & resume it', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -4000 // 5 s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 5 * 50
			})
		).serialize()
	)

	// Pause the video
	c.time = 11000 // Advance the time 10s, to 11s
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PauseCommand({
				channel: 1,
				layer: 10,
				pauseTime: 11000
			})
		).serialize()
	)
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
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ResumeCommand({
				channel: 1,
				layer: 10,
				noClear: false
			})
		).serialize()
	)
})
test('Play a looping video', () => {
	const c = getCasparCGState()
	initStateMS(c)

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -9000, // 10 s ago
		length: 30 * 1000,
		looping: true
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 10 * 50,
				in: 0,
				length: 30 * 50
			})
		).serialize()
	)
})
test('Play a looping video, with inPoint', () => {
	const c = getCasparCGState()
	initStateMS(c)

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 0, // 1 s ago
		length: 10 * 1000,
		inPoint: 4 * 1000, // 4 s into the clip
		looping: true
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 5 * 50,
				in: 4 * 50,
				length: 10 * 50
			})
		).serialize()
	)
})
test('Play a looping video, with inPoint & seek', () => {
	const c = getCasparCGState()
	initStateMS(c)

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 0, // 1 s ago
		length: 2 * 1000,
		inPoint: 10 * 1000, // 10 s into the clip
		seek: 0, // beginning of clip
		looping: true
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 1 * 50,
				in: 10 * 50,
				length: 2 * 50
			})
		).serialize()
	)
})
test('Play a looping video, pause & resume it', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: any

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -9000, // 10 s ago
		looping: true
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 0, // Because we only support accurate looping & seeking if length is provided
				in: 0
			})
		).serialize()
	)

	// Pause the video
	c.time = 6000 // Advance the time
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PauseCommand({
				channel: 1,
				layer: 10,
				pauseTime: 6000
			})
		).serialize()
	)

	// Resume playing:
	c.time = 11000 // Advance the time
	layer10.playing = true
	// it was paused for 15 seconds:
	layer10.playTime = c.time - (layer10.pauseTime - (layer10.playTime || 0))
	delete layer10.pauseTime

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ResumeCommand({
				channel: 1,
				layer: 10,
				noClear: false
			})
		).serialize()
	)
})
test('Play a template, update the data & cgstop', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	const layer10: TemplateLayer = {
		id: 't0',
		content: LayerContentType.TEMPLATE,
		layerNo: 10,
		media: 'myTemplate',
		playing: true,
		templateType: 'html',
		templateData: { var0: 'one' },
		cgStop: true,
		playTime: 990 // 10s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.CGAddCommand({
				channel: 1,
				layer: 10,
				templateName: 'myTemplate',
				templateType: 'html',
				cgStop: true,
				data: { var0: 'one' },
				flashLayer: 1,
				playOnLoad: true
			})
		).serialize()
	)

	// update, with the same data
	;(layer10.templateData = { var0: 'one' }),
		// try again, to ensure no new commands are sent:
		console.log('---------------------------------')
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(0)
	console.log('==================================')

	// Update the data:
	;(layer10.templateData = { var0: 'two' }), (cc = getDiff(c, targetState))
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.CGUpdateCommand({
				channel: 1,
				layer: 10,
				data: { var0: 'two' },
				flashLayer: 1
			})
		).serialize()
	)

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.CGStopCommand({
				channel: 1,
				layer: 10,
				flashLayer: 1
			})
		).serialize()
	)
})
test('Play an html-page', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	const layer10: HtmlPageLayer = {
		id: 'h0',
		content: LayerContentType.HTMLPAGE,
		layerNo: 10,
		media: 'http://superfly.tv',
		playing: true,
		playTime: 990 // 10s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayHtmlPageCommand({
				channel: 1,
				layer: 10,
				url: 'http://superfly.tv'
			})
		).serialize()
	)

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play an input', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	const layer10: InputLayer = {
		id: 'i0',
		content: LayerContentType.INPUT,
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
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayDecklinkCommand({
				channel: 1,
				layer: 10,
				channelLayout: 'stereo',
				device: 1,
				format: '720p5000'
			})
		).serialize()
	)

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play a Route', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
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
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

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
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play a BG Route', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a template file:

	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
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
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://2-15 BACKGROUND')

	// Remove the layer
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.ClearCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)
})
test('Play a video, then add mixer attributes', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a video file:

	let layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState, true)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
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

	// Rotate the video:
	const mixer0: Mixer = {
		rotation: 90
	}
	layer10.mixer = mixer0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerRotationCommand({
				channel: 1,
				layer: 10,
				rotation: 90
			})
		).serialize()
	)

	// set master volume:
	const layerMinus1: LayerBase = {
		id: 'b1',
		content: LayerContentType.NOTHING,
		layerNo: -1
	}
	channel1.layers['-1'] = layerMinus1
	layerMinus1.mixer = {
		mastervolume: 0.5
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerMastervolumeCommand({
				channel: 1,
				mastervolume: 0.5
			})
		).serialize()
	)

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
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerFillCommand({
				channel: 1,
				layer: 10,
				x: 0.5,
				y: 0.5,
				xScale: 0.5,
				yScale: 0.5
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.MixerRotationCommand({
				channel: 1,
				layer: 10,
				rotation: 0
			}),
			{ _defaultOptions: true }
		).serialize()
	)

	// move the video, with animation:
	mixer0.fill.x = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerFillCommand({
				channel: 1,
				layer: 10,
				x: 0,
				y: 0.5,
				xScale: 0.5,
				yScale: 0.5
			})
		).serialize()
	)

	// fade down opacity a bit:
	mixer0.opacity = 0.62
	mixer0.inTransition = {
		duration: 1000
	}
	mixer0.outTransition = {
		duration: 500
	}
	// increase brightness
	mixer0.brightness = 2

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.MixerOpacityCommand({
				channel: 1,
				layer: 10,
				opacity: 0.62,
				transition: 'mix',
				transitionDuration: 25,
				transitionDirection: 'right',
				transitionEasing: 'linear'
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerBrightnessCommand({
				channel: 1,
				layer: 10,
				brightness: 2,
				transition: 'mix',
				transitionDuration: 25,
				transitionDirection: 'right',
				transitionEasing: 'linear'
			})
		).serialize()
	)

	// fade down opacity fully:
	mixer0.opacity = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerOpacityCommand({
				channel: 1,
				layer: 10,
				opacity: 0,
				transition: 'mix',
				transitionDuration: 25,
				transitionDirection: 'right',
				transitionEasing: 'linear'
			})
		).serialize()
	)

	// reset / fade up opacity again (fade due to previous outTransition)
	delete mixer0.opacity
	// reset brightness as well
	delete mixer0.brightness
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.MixerOpacityCommand({
				channel: 1,
				layer: 10,
				opacity: 1,
				transition: 'mix',
				transitionDuration: 12,
				transitionDirection: 'right',
				transitionEasing: 'linear'
			}),
			{ _defaultOptions: true }
		).serialize()
	)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.MixerBrightnessCommand({
				channel: 1,
				layer: 10,
				brightness: 1,
				transition: 'mix',
				transitionDuration: 12,
				transitionDirection: 'right',
				transitionEasing: 'linear'
			}),
			{ _defaultOptions: true }
		).serialize()
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(2)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		new AMCP.ClearCommand({
			channel: 1,
			layer: 10
		}).serialize()
	)
	expect(stripContext(cc[1].cmds[1])).toEqual(
		new AMCP.MixerClearCommand({
			channel: 1,
			layer: 10
		}).serialize()
	)

	// Play a new video (without no mixer attributes)

	layer10 = {
		id: 'l2',
		content: LayerContentType.MEDIA,
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
	expect(stripContext(cc[0].cmds[0])).toEqual(
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
})
test('Play a video with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: new TransitionObject('AMB', {
			inTransition: new Transition('mix', 1000),
			outTransition: new Transition({ type: 'sting', maskFile: 'mask_transition' })
		}),
		playing: true,
		playTime: 1000
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 0,
				transition: 'mix',
				transitionDirection: 'right',
				transitionDuration: 25,
				transitionEasing: 'linear'
			})
		).serialize()
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		new AMCP.PlayCommand({
			channel: 1,
			layer: 10,
			clip: 'empty',
			transition: 'sting',
			stingMaskFilename: 'mask_transition',
			stingDelay: 0,
			stingOverlayFilename: ''
		}).serialize()
	)
})
test('Play a Route with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a Route:
	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
		layerNo: 10,
		media: new TransitionObject('route', {
			inTransition: new Transition('mix', 500),
			outTransition: new Transition('mix', 1000)
		}),
		route: {
			channel: 3
		},
		playing: true,
		playTime: null
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]._objectParams.command).toEqual('PLAY 1-10 route://3 mix 12 linear right')

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		new AMCP.PlayCommand({
			channel: 1,
			layer: 10,
			clip: 'empty',
			transition: 'mix',
			transitionDirection: 'right',
			transitionDuration: 50,
			transitionEasing: 'linear'
		}).serialize()
	)
})
test('Play a Decklink-input with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: any

	// Play a video file:
	const layer10: InputLayer = {
		id: 'i0',
		content: LayerContentType.INPUT,
		layerNo: 10,
		media: new TransitionObject('decklink', {
			inTransition: new Transition('mix', 500),
			outTransition: new Transition('mix', 1000)
		}),
		input: {
			device: 1,
			format: '720p5000'
			// channelLayout: 'stereo'
		},
		playing: true,
		playTime: null
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayDecklinkCommand({
				channel: 1,
				layer: 10,
				channelLayout: undefined,
				device: 1,
				format: '720p5000',
				transition: 'mix',
				transitionDirection: 'right',
				transitionDuration: 12, // .5 seconds in 50i
				transitionEasing: 'linear'
			})
		).serialize()
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		new AMCP.PlayCommand({
			channel: 1,
			layer: 10,
			clip: 'empty',
			transition: 'mix',
			transitionDirection: 'right',
			transitionDuration: 50,
			transitionEasing: 'linear'
		}).serialize()
	)
})
