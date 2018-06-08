
import { CasparCG } from './api'

export namespace CasparCGFull { // for internal use

	export class State extends CasparCG.State {
		channels: { [channel: string]: Channel} = {}
	}
	export class Channel extends CasparCG.Channel {
		channelNo: number
		videoMode: string | null
		fps: number
		layers: { [layer: string]: Layer} = {}
	}
	export class Layer extends CasparCG.ILayerBase {

	}

	export interface IMediaLayer extends CasparCG.IMediaLayer {}
	export interface ITemplateLayer extends CasparCG.ITemplateLayer {}
	export interface IHtmlPageLayer extends CasparCG.IHtmlPageLayer {}
	export interface IInputLayer extends CasparCG.IInputLayer {}
	export interface IRouteLayer extends CasparCG.IRouteLayer {}
	export interface IRecordLayer extends CasparCG.IRecordLayer {}
	export interface IFunctionLayer extends CasparCG.IFunctionLayer {}

	export interface IEmptyLayer extends CasparCG.IEmptyLayer {}
}
