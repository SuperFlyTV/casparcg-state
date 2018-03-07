import { TransitionObject } from './transitionObject'
import { Mixer } from './mixer'

export namespace CasparCG { // for external use
	export class Mappings {
		layers: {[GLayer: string]: Mapping} = {}
	}
	export class Mapping {
		channel: number
		layer: number
	}
	export class State {
		channels: { [channel: string]: Channel} = {}
	}
	export class Channel {
		channelNo: number
		// videoMode?: string | null
		fps?: number
		layers: { [layer: string]: ILayer} = {}
	}
	export class ILayerBase {
		layerNo: number
		content: LayerContentType // string | null 		// @todo: enum?
		media?: string | TransitionObject | null // clip or templatename
		looping?: boolean
		playTime?: number | null // timestamp when content started playing, (null == 'irrelevant')
		duration?: number
		noClear?: boolean
		playing?: boolean
		mixer?: Mixer
	}
	export class NextUp extends ILayerBase {
		auto: boolean
	}
	export interface IMediaLayer extends ILayerBase {
		content: LayerContentType.MEDIA
		media: string | TransitionObject | null // clip name
		playTime: number | null
		playing: boolean

		looping?: boolean
		seek?: number
		pauseTime?: number | null

		nextUp?: NextUp | null
	}
	export interface ITemplateLayer extends ILayerBase {
		content: LayerContentType.TEMPLATE
		media: string | TransitionObject | null // template name
		playTime: number | null
		playing: boolean

		templateType?: string	// @todo: string literal 'flash', 'html'
		templateFcn?: string // 'play', 'update', 'stop' or else (invoke)
		templateData?: Object | null
		cgStop?: boolean

		nextUp?: NextUp | null
	}
	export interface IInputLayer extends ILayerBase {
		content: LayerContentType.INPUT
		media: 'decklink'
		input: {
			device: number,
			format?: string,
			channelLayout?: string
		}
		playing: true
	}
	export interface IRouteLayer extends ILayerBase {
		content: LayerContentType.ROUTE
		media: 'route'
		route: {
			channel: number,
			layer: number | null
		} | null
		playing: true
		playTime: null
	}
	export interface IRecordLayer extends ILayerBase {
		content: LayerContentType.RECORD
		encoderOptions: string
		playing: true
	}
	export interface IFunctionLayer extends ILayerBase {
		content: LayerContentType.FUNCTION
		executeFcn?: string // name of function to execute
		executeData?: any
		oscDevice?: number
		inMessage?: {
			url: string,
			args?: {}
		} | null
		outMessage?: {
			url: string,
			args?: {}
		} | null
	}
	export interface IEmptyLayer extends ILayerBase {
		content: LayerContentType.NOTHING,
		playing: false
		pauseTime: 0
		nextUp?: NextUp | null
		templateData?: Object | null,
		encoderOptions?: string
	}
	export enum LayerContentType {
		NOTHING = '',
		MEDIA = 'media',
		TEMPLATE = 'template',
		INPUT = 'input',
		ROUTE = 'route',
		RECORD = 'record',
		FUNCTION = 'function'

	}
}
