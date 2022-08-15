import { getCasparCGState, initState, getDiff, stripContext, fixCommand } from './util'
import {
	MediaLayer,
	LayerContentType,
	Channel,
	State,
	EmptyLayer,
	TransitionObject,
	Transition,
	InputLayer,
	RouteLayerBase,
	RouteLayer
} from '../'
import { AMCP } from 'casparcg-connection'
import * as _ from 'underscore'

test('Load a video, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Load a video file (paused):

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: false,
		playTime: 1000,
		pauseTime: 1000
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 0,
				pauseTime: 1000
			})
		).serialize()
	)

	// Start playing it:
	layer10.playing = true
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

	// Remove the video
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
test('Load a video when inPoint is 0', () => {
	const c = getCasparCGState()
	initState(c)

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: false,
		seek: 10000,
		inPoint: 0,
		length: 20000
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 }, fps: 25 }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 250,
				in: 0,
				length: 500
			})
		).serialize()
	)
})
test('Load a video when inPoint is greater than 0', () => {
	const c = getCasparCGState()
	initState(c)

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: false,
		seek: 10000,
		inPoint: 1000,
		length: 20000
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 }, fps: 25 }
	const targetState: State = { channels: { '1': channel1 } }

	const cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadCommand({
				channel: 1,
				layer: 10,
				clip: 'AMB',
				loop: false,
				seek: 250,
				in: 25,
				length: 500
			})
		).serialize()
	)
})
test('Loadbg a video, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)

	// Remove the video
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
test('Loadbg a video, then remove it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Remove the nextup
	const layer10noNext = _.clone(layer10)
	delete layer10noNext.nextUp

	channel1.layers['10'] = layer10noNext

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(2)
	expect(cc[0].cmds).toHaveLength(0)
	expect(cc[1].cmds).toHaveLength(1)
	expect(stripContext(cc[1].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)

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
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)
})
test('Loadbg a video, then loadbg another', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Now load another
	layer10.nextUp!.media = 'go1080p25'
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'go1080p25',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)
})
test('Loadbg a video with a transition, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			media: new TransitionObject('AMB', {
				inTransition: new Transition('sting', 'mask_file')
			}),
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
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
			})
		).serialize()
	)

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: LayerContentType.MEDIA,
		media: new TransitionObject('AMB', {
			inTransition: new Transition('sting', 'mask_file')
		}),
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)

	// Remove the video
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
test('Loadbg a video with no transition, then play it with a transition', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Start playing it:
	channel1.layers['10'] = {
		id: 'v0',
		content: LayerContentType.MEDIA,
		media: new TransitionObject('AMB', {
			inTransition: new Transition('sting', 'mask_file')
		}),
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
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
			})
		).serialize()
	)

	// Remove the video
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
test('Play a video, stop and loadbg another video', () => {
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
				seek: 0
			})
		).serialize()
	)

	// Load a video file (paused):

	const newLayer10: EmptyLayer = {
		id: 'l1',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.MEDIA,
			media: 'AMB',
			auto: false
		}
	}

	channel1.layers['10'] = newLayer10
	console.log('-----------')
	c.log = true
	cc = getDiff(c, targetState, true)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.StopCommand({
				channel: 1,
				layer: 10,
				noClear: false
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Start playing it:
	channel1.layers['10'] = {
		id: 'l1',
		content: LayerContentType.MEDIA,
		media: 'AMB',
		playing: true,
		playTime: 1000,
		layerNo: 10
	}
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10
			})
		).serialize()
	)

	// Remove the video
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
test('Loadbg a video, then play another video maintaining the bg', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

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
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	const newLayer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
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
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'CG1080i50',
				loop: false,
				seek: 0
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[2])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	// Remove the video
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
test('Loadbg a video and play another video. stop the foreground while maintaining the bg', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Load a video file (paused):

	const layer10: MediaLayer = {
		id: 'l0',
		content: LayerContentType.MEDIA,
		media: 'CG1080i50',
		playTime: null,
		playing: true,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.MEDIA,
			media: 'AMB',
			auto: false
		}
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(2)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10,
				clip: 'CG1080i50',
				loop: false,
				seek: 0
			})
		).serialize()
	)
	expect(stripContext(cc[0].cmds[1])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				auto: false,
				clip: 'AMB',
				noClear: false,
				loop: false,
				seek: 0
			})
		).serialize()
	)

	const newLayer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: layer10.nextUp
	}
	channel1.layers['10'] = newLayer10
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.StopCommand({
				channel: 1,
				layer: 10,
				noClear: false
			})
		).serialize()
	)

	// Remove the video
	delete channel1.layers['10']

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadbgCommand({
				channel: 1,
				layer: 10,
				clip: 'EMPTY'
			})
		).serialize()
	)
})
test('Loadbg a html-page, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// put a html-template on onNext:

	const layer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			auto: false,
			content: LayerContentType.HTMLPAGE,
			media: 'http://superfly.tv',
			playing: true
			// playTime: 990 // 10s ago
		}
	}

	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadHtmlPageBgCommand({
				channel: 1,
				layer: 10,
				url: 'http://superfly.tv',
				auto: false,
				noClear: false
			})
		).serialize()
	)

	// Start playing the template:
	channel1.layers['10'] = {
		id: 'l1',
		content: LayerContentType.HTMLPAGE,
		layerNo: 10,
		media: 'http://superfly.tv',
		playTime: 1000
	}

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
test('Loadbg an input, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.INPUT,
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
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadDecklinkBgCommand({
				channel: 1,
				layer: 10,
				channelLayout: 'stereo',
				device: 1,
				format: '720p5000',
				auto: false,
				noClear: false
			})
		).serialize()
	)

	// Start playing the input:

	const newLayer10: InputLayer = {
		id: 'l1',
		content: LayerContentType.INPUT,
		layerNo: 10,
		playing: true,
		playTime: null,
		media: 'decklink',
		input: {
			device: 1,
			format: '720p5000',
			channelLayout: 'stereo'
		}
	}

	channel1.layers['10'] = newLayer10
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
test('Loadbg a Route, then change it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		// pauseTime: 0,
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.ROUTE,
			// layerNo: 10,
			media: 'route',
			playing: true,

			route: {
				channel: 2,
				layer: 15
			},
			auto: false
		},
		playTime: null // playtime is null because it is irrelevant
	}
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadRouteBgCommand({
				channel: 1,
				layer: 10,
				route: {
					channel: 2,
					layer: 15
				},
				channelLayout: undefined,
				mode: undefined,
				noClear: false
			})
		).serialize()
	)

	expect(c.ccgState.getState().channels['1'].layers['10'].nextUp).toBeTruthy()
	expect(
		(c.ccgState.getState().channels['1'].layers['10'].nextUp! as RouteLayerBase).route
	).toMatchObject({
		channel: 2,
		layer: 15
	})
	;(layer10.nextUp! as RouteLayerBase).route!.layer = 20

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadRouteBgCommand({
				channel: 1,
				layer: 10,
				route: {
					channel: 2,
					layer: 20
				},
				channelLayout: undefined,
				mode: undefined,
				noClear: false
			})
		).serialize()
	)
})
test('Loadbg a Route, then play it', () => {
	const c = getCasparCGState()
	initState(c)

	let cc: ReturnType<typeof getDiff>

	// Play a template file:

	const layer10: EmptyLayer = {
		id: 'e0',
		content: LayerContentType.NOTHING,
		media: '',
		playing: false,
		layerNo: 10,
		nextUp: {
			id: 'n0',
			content: LayerContentType.ROUTE,
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
	const channel1: Channel = { channelNo: 1, layers: { '10': layer10 } }
	const targetState: State = { channels: { '1': channel1 } }

	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(stripContext(cc[0].cmds[0])).toEqual(
		fixCommand(
			new AMCP.LoadRouteBgCommand({
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
			})
		).serialize()
	)

	// Start playing it:

	const playLayer10: RouteLayer = {
		id: 'l1',
		content: LayerContentType.ROUTE,
		layerNo: 10,
		media: 'route',
		playing: true,

		route: {
			channel: 2,
			layer: 15
		},
		delay: 100,
		playTime: null
	}
	channel1.layers['10'] = playLayer10
	cc = getDiff(c, targetState)
	expect(cc).toHaveLength(1)
	expect(cc[0].cmds).toHaveLength(1)
	expect(cc[0].cmds[0]).toMatchObject(
		fixCommand(
			new AMCP.PlayCommand({
				channel: 1,
				layer: 10
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
