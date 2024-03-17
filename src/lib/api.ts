import { TransitionObject, Transition } from './transitionObject'
import { Mixer as MixerBase } from './mixer'

export interface Mappings {
	layers: { [GLayer: string]: Mapping }
}
export interface Mapping {
	channel: number
	layer: number
}
export interface State {
	channels: { [channel: string]: Channel }
}
export interface ChannelInfo {
	videoMode?: string | null
	/** Frames per second the channel is running in. Note that 50i is only running in 25 fps */
	fps?: number
}
export interface Channel extends ChannelInfo {
	channelNo: number
	layers: { [layer: string]: LayerBase }
}
export type Layer =
	| MediaLayer
	| TemplateLayer
	| HtmlPageLayer
	| InputLayer
	| RouteLayer
	| RecordLayer
	| FunctionLayer
	| EmptyLayer

export interface LayerBaseBase {
	content: LayerContentType

	/** [timestamp] If set, at what point in time the object started playing, null means "irrelevant" */
	playTime?: number | null

	/** If true, we'll never send a CLEAR for this object when it stops.
	 * Might be useful in some cases where it's important to not kill the object (like when piping through a decklink input)
	 */
	noClear?: boolean

	/** Mixer attributes to apply on the layer, like transform, rotate or opacity */
	mixer?: MixerBase
}
export interface LayerBase extends LayerBaseBase {
	/** Id of the original timelineObject */
	id: string
	/** What layer to put the content on */
	layerNo: number

	media?: string | TransitionObject | null

	playing?: boolean

	nextUp?: NextUp
}
export enum LayerContentType {
	NOTHING = '',
	MEDIA = 'media',
	TEMPLATE = 'template',
	HTMLPAGE = 'htmlpage',
	INPUT = 'input',
	ROUTE = 'route',
	RECORD = 'record',
	FUNCTION = 'function',
}
export interface MediaLayerBase {
	/** Media clip name. Could be a filename, a path, or even a color */
	media: string | TransitionObject | null

	/** If the media should be looping, otherwise it'll freeze on last frame */
	looping?: boolean
	/** [time in ms] The time in the video the video starts playing at (and loops to, when looping) */
	inPoint?: number
	/** [time in ms] The duration the video will be playing until freezing (or looping) */
	length?: number
	/** [time in ms] If set, the time in the video the video starts playing at */
	seek?: number

	/** [timestamp] If set, at what point in time the object was paused */
	pauseTime?: number | null

	channelLayout?: string
	clearOn404?: boolean

	afilter?: string
	vfilter?: string
}
export interface MediaLayer extends LayerBase, MediaLayerBase {
	content: LayerContentType.MEDIA
	media: MediaLayerBase['media']
	/** If the media is playing or not (is paused) */
	playing: boolean
}
export interface TemplateLayerBase {
	/** Template name / file path */
	media: string | TransitionObject | null

	templateType?: 'flash' | 'html'
	templateFcn?: 'play' | 'update' | 'stop' | string // string = invoke
	/** Template data to send to the template */
	templateData?: Record<string, any> | string | null
	/** True if the template supports CG STOP, otherwise the template will be cleared with a CLEAR */
	cgStop?: boolean
}
export interface TemplateLayer extends LayerBase, TemplateLayerBase {
	content: LayerContentType.TEMPLATE
	media: string | null

	/** [timestamp] If set, at what point in time the object started playing */
	playTime: number | null
	/** If the graphics is playing or not (is paused) */
	playing: boolean
}
export interface HtmlPageLayerBase {
	media: string | TransitionObject | null // template name
	playing: true
}
export interface HtmlPageLayer extends LayerBase, HtmlPageLayerBase {
	content: LayerContentType.HTMLPAGE
	media: HtmlPageLayerBase['media']
	playing: HtmlPageLayerBase['playing']

	/** [timestamp] If set, at what point in time the object started playing */
	playTime: number | null
}
export interface InputLayerBase {
	media: 'decklink' | TransitionObject
	input: {
		device: number
		format?: string
		channelLayout?: string
	}
	afilter?: string
	vfilter?: string
	playing: true
}
export interface InputLayer extends LayerBase, InputLayerBase {
	content: LayerContentType.INPUT
	media: InputLayerBase['media']
	playing: InputLayerBase['playing']
	playTime: null
}
export interface RouteLayerBase {
	media: 'route' | TransitionObject
	route?: {
		channel: number
		layer?: number | null
		channelLayout?: string
	}
	delay?: number
	mode?: 'BACKGROUND' | 'NEXT'
	playing: true

	afilter?: string
	vfilter?: string
}
export interface RouteLayer extends LayerBase, RouteLayerBase {
	content: LayerContentType.ROUTE
	media: RouteLayerBase['media']
	playing: RouteLayerBase['playing']
	playTime: null

	nextUp?: NextUp
}
export interface RecordLayerBase {
	media: string
	encoderOptions: string
	playing: true
}
export interface RecordLayer extends LayerBase, RecordLayerBase {
	content: LayerContentType.RECORD
	media: RecordLayerBase['media']
	playing: RecordLayerBase['playing']
	playTime: number
}
export interface FunctionLayerBase {
	executeFcn?: string // name of function to execute
	executeData?: any
	oscDevice?: number
	inMessage?: {
		url: string
		args?: Record<string, unknown>
	} | null
	outMessage?: {
		url: string
		args?: Record<string, unknown>
	} | null
}
export interface FunctionLayer extends LayerBase, FunctionLayerBase {
	content: LayerContentType.FUNCTION
}
export interface EmptyLayerBase {
	playing: false
}
export interface EmptyLayer extends LayerBase, EmptyLayerBase {
	content: LayerContentType.NOTHING
	playing: false
	nextUp?: NextUp
}

export type NextUp = NextUpMedia | NextUpHTML | NextUpInput | NextUpRoute
export interface NextUpBase {
	content: LayerContentType.MEDIA | LayerContentType.HTMLPAGE | LayerContentType.INPUT | LayerContentType.ROUTE
	id: string
	mode?: 'BACKGROUND' | 'NEXT'
}
export interface NextUpMedia extends NextUpBase, LayerBaseBase, MediaLayerBase {
	content: LayerContentType.MEDIA
	auto?: boolean
}
export interface NextUpHTML extends NextUpBase, LayerBaseBase, HtmlPageLayerBase {
	content: LayerContentType.HTMLPAGE
	auto?: boolean
}
export interface NextUpInput extends NextUpBase, LayerBaseBase, InputLayerBase {
	content: LayerContentType.INPUT
	auto?: boolean
}
export interface NextUpRoute extends NextUpBase, LayerBaseBase, RouteLayerBase {
	content: LayerContentType.ROUTE
	auto?: boolean

	channelLayout?: string
	/** [time in ms] How long to delay the routed content */
	delay?: number
}
export type Mixer = MixerBase

export interface TransitionOptions {
	type?: string
	duration?: number
	easing?: string
	direction?: string

	maskFile?: string
	delay?: number
	overlayFile?: string
	audioFadeStart?: number
	audioFadeDuration?: number

	customOptions?: any // used to pipe any data blob through to the command
}
export { TransitionObject, Transition }
