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
	layers: { [layer: string]: ILayerBase }
}
export type ILayer =
	| IMediaLayer
	| ITemplateLayer
	| IHtmlPageLayer
	| IInputLayer
	| IRouteLayer
	| IRecordLayer
	| IFunctionLayer
	| IEmptyLayer

export interface ILayerBaseBase {
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
export interface ILayerBase extends ILayerBaseBase {
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
	FUNCTION = 'function'
}
export interface IMediaLayerBase {
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
}
export interface IMediaLayer extends ILayerBase, IMediaLayerBase {
	content: LayerContentType.MEDIA
	media: IMediaLayerBase['media']
	/** If the media is playing or not (is paused) */
	playing: boolean
}
export interface ITemplateLayerBase {
	/** Template name / file path */
	media: string | TransitionObject | null

	templateType?: 'flash' | 'html'
	templateFcn?: 'play' | 'update' | 'stop' | string // string = invoke
	/** Template data to send to the template */
	templateData?: Object | string | null
	/** True if the template supports CG STOP, otherwise the template will be cleared with a CLEAR */
	cgStop?: boolean
}
export interface ITemplateLayer extends ILayerBase, ITemplateLayerBase {
	content: LayerContentType.TEMPLATE
	media: ITemplateLayerBase['media']

	/** [timestamp] If set, at what point in time the object started playing */
	playTime: number | null
	/** If the graphics is playing or not (is paused) */
	playing: boolean
}
export interface IHtmlPageLayerBase {
	media: string | TransitionObject | null // template name
	playing: true
}
export interface IHtmlPageLayer extends ILayerBase, IHtmlPageLayerBase {
	content: LayerContentType.HTMLPAGE
	media: IHtmlPageLayerBase['media']
	playing: IHtmlPageLayerBase['playing']

	/** [timestamp] If set, at what point in time the object started playing */
	playTime: number | null
}
export interface IInputLayerBase {
	media: 'decklink' | TransitionObject
	input: {
		device: number;
		format?: string;
		channelLayout?: string;
	}
	filter?: string
	playing: true
}
export interface IInputLayer extends ILayerBase, IInputLayerBase {
	content: LayerContentType.INPUT
	media: IInputLayerBase['media']
	playing: IInputLayerBase['playing']
	playTime: null
}
export interface IRouteLayerBase {
	media: 'route' | TransitionObject
	route?: {
		channel: number;
		layer?: number | null;
		channelLayout?: string;
	}
	delay?: number
	mode?: 'BACKGROUND' | 'NEXT'
	playing: true
}
export interface IRouteLayer extends ILayerBase, IRouteLayerBase {
	content: LayerContentType.ROUTE
	media: IRouteLayerBase['media']
	playing: IRouteLayerBase['playing']
	playTime: null

	nextUp?: NextUp
}
export interface IRecordLayerBase {
	media: string
	encoderOptions: string
	playing: true
}
export interface IRecordLayer extends ILayerBase, IRecordLayerBase {
	content: LayerContentType.RECORD
	media: IRecordLayerBase['media']
	playing: IRecordLayerBase['playing']
	playTime: number
}
export interface IFunctionLayerBase {
	executeFcn?: string // name of function to execute
	executeData?: any
	oscDevice?: number
	inMessage?: {
		url: string;
		args?: {};
	} | null
	outMessage?: {
		url: string;
		args?: {};
	} | null
}
export interface IFunctionLayer extends ILayerBase, IFunctionLayerBase {
	content: LayerContentType.FUNCTION
}
export interface IEmptyLayerBase {
	playing: false
}
export interface IEmptyLayer extends ILayerBase, IEmptyLayerBase {
	content: LayerContentType.NOTHING
	playing: false
	nextUp?: NextUp
}

export type NextUp = NextUpMedia | NextUpHTML | NextUpInput | NextUpRoute
export interface NextUpBase {
	content:
		| LayerContentType.MEDIA
		| LayerContentType.HTMLPAGE
		| LayerContentType.INPUT
		| LayerContentType.ROUTE
	id: string
	mode?: 'BACKGROUND' | 'NEXT'
}
export interface NextUpMedia
	extends NextUpBase,
		ILayerBaseBase,
		IMediaLayerBase {
	content: LayerContentType.MEDIA
	auto?: boolean
}
export interface NextUpHTML
	extends NextUpBase,
		ILayerBaseBase,
		IHtmlPageLayerBase {
	content: LayerContentType.HTMLPAGE
	auto?: boolean
}
export interface NextUpInput
	extends NextUpBase,
		ILayerBaseBase,
		IInputLayerBase {
	content: LayerContentType.INPUT
	auto?: boolean
}
export interface NextUpRoute
	extends NextUpBase,
		ILayerBaseBase,
		IRouteLayerBase {
	content: LayerContentType.ROUTE
	auto?: boolean

	channelLayout?: string
	/** [time in ms] How long to delay the routed content */
	delay?: number
}
export interface Mixer extends MixerBase {}
export interface ITransition {
	type?: string
	duration?: number
	easing?: string
	direction?: string

	maskFile?: string
	delay?: number
	overlayFile?: string
	audioFadeStart?: number
	audioFadeDuration?: number
}
export { TransitionObject, Transition }
