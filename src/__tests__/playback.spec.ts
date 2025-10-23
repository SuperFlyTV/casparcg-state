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
	Transition,
	NextUpMedia,
} from '../'
import { getCasparCGState, initState, getDiff, stripContext, initStateMS } from './util'
import { AMCPCommand, Commands } from 'casparcg-connection'
import { Direction, RouteMode, TransitionTween, TransitionType } from 'casparcg-connection/dist/enums'

test('bad initializations', () => {
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					videoMode: 'PAL',
				},
			],
			1000
		)
	}).toThrow(/missing.*fps/i)
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					fps: 50,
				},
			],
			1000
		)
	}).toThrow(/missing.*videoMode/i)
	expect(() => {
		const ccgState = new CasparCGState()
		ccgState.initStateFromChannelInfo(
			[
				{
					videoMode: 'PAL',
					fps: -1, // bad fps
				},
			],
			1000
		)
	}).toThrow(/fps/i)
})
test('Play a video, then stop it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
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

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB2',
				loop: false,
				seek: 0,
			},
		})
	)

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	// console.log('--------------')
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play a video with the right channelLayout, then stop it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		channelLayout: 'TEST_LAYOUT',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				channelLayout: 'TEST_LAYOUT',
				seek: 0,
			},
		})
	)

	// Play another file
	layer10.media = 'AMB2'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB2',
				loop: false,
				channelLayout: 'TEST_LAYOUT',
				seek: 0,
			},
		})
	)

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play a video, pause & resume it', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -4000, // 5 s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 5 * 50,
			},
		})
	)

	// Pause the video
	c.time = 11000 // Advance the time 10s, to 11s
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Pause,
			params: {
				channel: 1,
				layer: 10,
				// pauseTime: 11000
			},
		})
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
		literal<AMCPCommand>({
			command: Commands.Resume,
			params: {
				channel: 1,
				layer: 10,
				// noClear: false
			},
		})
	)
})
test('Play a video, then continue with playTime=null', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -4000, // 5 s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 5 * 50,
			},
		})
	)

	// Continue playing:
	c.time = 15000 // Advance the time 4s, to 15s
	layer10.playing = true
	// we don't care about time
	layer10.playTime = null
	delete layer10.pauseTime

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(0)
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
		looping: true,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 10 * 50,
				inPoint: 0,
				length: 30 * 50,
			},
		})
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
		looping: true,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 5 * 50,
				inPoint: 4 * 50,
				length: 10 * 50,
			},
		})
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
		looping: true,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 1 * 50,
				inPoint: 10 * 50,
				length: 2 * 50,
			},
		})
	)
})
test('Play a looping video, pause & resume it', () => {
	const c = getCasparCGState()
	initStateMS(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: -9000, // 10 s ago
		looping: true,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: true,
				seek: 0, // Because we only support accurate looping & seeking if length is provided
				inPoint: 0,
			},
		})
	)

	// Pause the video
	c.time = 6000 // Advance the time
	layer10.pauseTime = c.time
	layer10.playing = false

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Pause,
			params: {
				channel: 1,
				layer: 10,
				// pauseTime: 6000
			},
		})
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
		literal<AMCPCommand>({
			command: Commands.Resume,
			params: {
				channel: 1,
				layer: 10,
				// noClear: false
			},
		})
	)
})
test('Play a template, update the data & cgstop', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
		playTime: 990, // 10s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.CgAdd,
			params: {
				channel: 1,
				layer: 10,
				template: 'myTemplate',
				// templateType: 'html',
				// cgStop: true,
				data: { var0: 'one' },
				cgLayer: 1,
				playOnLoad: true,
			},
		})
	)

	// update, with the same data
	layer10.templateData = { var0: 'one' }
	// try again, to ensure no new commands are sent:

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(0)

	// Update the data:
	;(layer10.templateData = { var0: 'two' }), (cc = getDiff(c, targetState))
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.CgUpdate,
			params: {
				channel: 1,
				layer: 10,
				data: { var0: 'two' } as any,
				cgLayer: 1,
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
			command: Commands.CgStop,
			params: {
				channel: 1,
				layer: 10,
				cgLayer: 1,
			},
		})
	)
})
test('Play an html-page', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: HtmlPageLayer = {
		id: 'h0',
		content: LayerContentType.HTMLPAGE,
		layerNo: 10,
		media: 'http://superfly.tv',
		playing: true,
		playTime: 990, // 10s ago
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayHtml,
			params: {
				channel: 1,
				layer: 10,
				url: 'http://superfly.tv',
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
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play an input', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			channelLayout: 'stereo',
		},

		playTime: null,
		afilter: 'pan=stereo',
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayDecklink,
			params: {
				channel: 1,
				layer: 10,
				channelLayout: 'stereo',
				aFilter: 'pan=stereo',
				device: 1,
				format: '720p5000',
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
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play a Route', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15,
		},
		delay: 20,
		playTime: null, // playtime is null because it is irrelevant
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayRoute,
			params: {
				channel: 1,
				layer: 10,
				route: {
					channel: 2,
					layer: 15,
				},
				framesDelay: 1,
			},
		})
	)

	// Change the delay
	layer10.delay = 40

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayRoute,
			params: {
				channel: 1,
				layer: 10,
				route: {
					channel: 2,
					layer: 15,
				},
				framesDelay: 2,
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
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play a BG Route', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15,
		},
		mode: 'BACKGROUND',
		playTime: null, // playtime is null because it is irrelevant
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)

	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayRoute,
			params: {
				channel: 1,
				layer: 10,
				route: {
					channel: 2,
					layer: 15,
				},
				mode: RouteMode.Background,
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
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
test('Play a video, then add mixer attributes', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:

	let layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState, true)
	expect(cc).toHaveLength(1)
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

	// Rotate the video:
	const mixer0: Mixer = {
		rotation: 90,
	}
	layer10.mixer = mixer0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerRotation,
			params: {
				channel: 1,
				layer: 10,
				value: 90,
			},
		})
	)

	// set master volume:
	const layerMinus1: LayerBase = {
		id: 'b1',
		content: LayerContentType.NOTHING,
		layerNo: -1,
	}
	channel1.layers['-1'] = layerMinus1
	layerMinus1.mixer = {
		mastervolume: 0.5,
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerMastervolume,
			params: {
				channel: 1,
				value: 0.5,
			},
		})
	)

	// scale & move the video:
	delete mixer0.rotation
	mixer0.fill = {
		x: 0.5,
		y: 0.5,
		xScale: 0.5,
		yScale: 0.5,
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerFill,
			params: {
				channel: 1,
				layer: 10,
				x: 0.5,
				y: 0.5,
				xScale: 0.5,
				yScale: 0.5,
			},
		})
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerRotation,
			params: {
				channel: 1,
				layer: 10,
				value: 0,
			},
		})
	)

	// move the video, with animation:
	mixer0.fill.x = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerFill,
			params: {
				channel: 1,
				layer: 10,
				x: 0,
				y: 0.5,
				xScale: 0.5,
				yScale: 0.5,
			},
		})
	)

	// fade down opacity a bit:
	mixer0.opacity = 0.62
	mixer0.inTransition = {
		duration: 1000,
	}
	mixer0.outTransition = {
		duration: 500,
	}
	// increase brightness
	mixer0.brightness = 2

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerOpacity,
			params: {
				channel: 1,
				layer: 10,
				value: 0.62,
				tween: TransitionTween.LINEAR,
				duration: 25,
			},
		})
	)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerBrightness,
			params: {
				channel: 1,
				layer: 10,
				value: 2,
				duration: 25,
				tween: TransitionTween.LINEAR,
			},
		})
	)

	// fade down opacity fully:
	mixer0.opacity = 0
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerOpacity,
			params: {
				channel: 1,
				layer: 10,
				value: 0,
				duration: 25,
				tween: TransitionTween.LINEAR,
			},
		})
	)

	// reset / fade up opacity again (fade due to previous outTransition)
	delete mixer0.opacity
	// reset brightness as well
	delete mixer0.brightness
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerOpacity,
			params: {
				channel: 1,
				layer: 10,
				value: 1,
				duration: 12,
				tween: TransitionTween.LINEAR,
			},
		})
	)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerBrightness,
			params: {
				channel: 1,
				layer: 10,
				value: 1,
				duration: 12,
				tween: TransitionTween.LINEAR,
			},
		})
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[1].cmds).toHaveLength(2)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Clear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
	expect(stripContext(cc[1].cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.MixerClear,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)

	// Play a new video (without no mixer attributes)

	layer10 = {
		id: 'l2',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	channel1.layers['10'] = layer10

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
})
test('Play a video with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: new TransitionObject('AMB', {
			inTransition: new Transition(TransitionType.Mix, 1000),
			outTransition: new Transition({ type: TransitionType.Sting, maskFile: 'mask_transition' }),
		}),
		playing: true,
		playTime: 1000,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
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
				transition: {
					transitionType: TransitionType.Mix,
					direction: Direction.Right,
					duration: 25,
					tween: TransitionTween.LINEAR,
				},
			},
		})
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'empty',
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties: {
						maskFile: 'mask_transition',
					},
				},
			},
		})
	)
})
test('Play a Route with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a Route:
	const layer10: RouteLayer = {
		id: 'r0',
		content: LayerContentType.ROUTE,
		layerNo: 10,
		media: new TransitionObject('route', {
			inTransition: new Transition(TransitionType.Mix, 500),
			outTransition: new Transition(TransitionType.Mix, 1000),
		}),
		route: {
			channel: 3,
		},
		playing: true,
		playTime: null,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayRoute,
			params: {
				channel: 1,
				layer: 10,
				route: {
					channel: 3,
				},
				transition: {
					transitionType: TransitionType.Mix,
					duration: 12,
					direction: Direction.Right,
					tween: TransitionTween.LINEAR,
				},
			},
		})
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'empty',
				transition: {
					transitionType: TransitionType.Mix,
					duration: 50,
					direction: Direction.Right,
					tween: TransitionTween.LINEAR,
				},
			},
		})
	)
})
test('Play a Decklink-input with transition, then stop it with transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a video file:
	const layer10: InputLayer = {
		id: 'i0',
		content: LayerContentType.INPUT,
		layerNo: 10,
		media: new TransitionObject('decklink', {
			inTransition: new Transition(TransitionType.Mix, 500),
			outTransition: new Transition(TransitionType.Mix, 1000),
		}),
		input: {
			device: 1,
			format: '720p5000',
			channelLayout: 'stereo',
		},
		playing: true,
		playTime: null,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.PlayDecklink,
			params: {
				channel: 1,
				layer: 10,
				channelLayout: 'stereo',
				device: 1,
				format: '720p5000',
				transition: {
					transitionType: TransitionType.Mix,
					direction: Direction.Right,
					duration: 12, // .5 seconds in 50i
					tween: TransitionTween.LINEAR,
				},
			},
		})
	)

	// Remove the layer from the state
	delete channel1.layers['10']
	cc = getDiff(c, targetState)

	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'empty',
				transition: {
					transitionType: TransitionType.Mix,
					direction: Direction.Right,
					duration: 50,
					tween: TransitionTween.LINEAR,
				},
			},
		})
	)
})

test('Play a video, then play the same one again', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: new TransitionObject('AMB', {
			inTransition: {
				type: 'sting',
				maskFile: 'mask1',
			},
		}),
		playing: true,
		playTime: 1000,
		seek: 0,
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
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
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties: {
						maskFile: 'mask1',
					},
				},
			},
		})
	)

	// Play the same file again
	const clip2 = {
		...layer10,
		id: 'l1',
		playTime: (c.time = 2000),
	}
	channel1.layers['10'] = clip2

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
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
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties: {
						maskFile: 'mask1',
					},
				},
			},
		})
	)
})

function literal<T>(v: T): T {
	return v
}
test('Play a video, then preload and play the same one again', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>
	// Play a video file:
	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: new TransitionObject('AMB', {
			inTransition: {
				type: 'sting',
				maskFile: 'mask1',
			},
		}),
		playing: true,
		playTime: 1000,
		seek: 0,
		nextUp: literal<NextUpMedia>({
			id: 'l0',
			content: LayerContentType.MEDIA,
			media: new TransitionObject('AMB', {
				inTransition: {
					type: 'sting',
					maskFile: 'mask1',
				},
			}),
			playTime: 1000,
			seek: 0,
		}),
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 0,
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties: {
						maskFile: 'mask1',
					},
				},
			},
		})
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Loadbg,
			params: {
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 0,
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties: {
						maskFile: 'mask1',
					},
				},
			},
		})
	)

	// Play the same file again
	const clip2 = {
		...layer10,
		id: 'l1',
		playTime: (c.time = 2000),
		nextUp: undefined,
	}
	channel1.layers['10'] = clip2

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		literal<AMCPCommand>({
			command: Commands.Play,
			params: {
				channel: 1,
				layer: 10,
			},
		})
	)
})
