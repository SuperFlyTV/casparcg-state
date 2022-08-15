import { State, Channel, LayerBase } from './api'

/**
 * StateObjectStorage is used for exposing the internal state variable
 * By default, it is storing the state as an internal variable,
 * byt may be using an external storage function for fetching/storing the state.
 */
export class StateObjectStorage {
	private _internalState: InternalState = {
		channels: {},
	}
	private _externalStorage: ((action: string, data?: Record<string, any> | null) => InternalState) | null

	assignExternalStorage(fcn: (action: string, data: Record<string, any> | null) => InternalState): void {
		this._externalStorage = fcn
	}

	fetchState(): InternalState {
		if (this._externalStorage) {
			return this._externalStorage('fetch', null)
		} else {
			return this._internalState
		}
	}
	storeState(data: InternalState): void {
		if (this._externalStorage) {
			this._externalStorage('store', data)
		} else {
			this._internalState = data
		}
	}
	clearState(): void {
		if (this._externalStorage) {
			this._externalStorage('clear')
		} else {
			this._internalState = {
				channels: {},
			}
		}
	}
}

export interface InternalState extends State {
	channels: { [channel: string]: InternalChannel }
}
export interface InternalChannel extends Channel {
	channelNo: number
	videoMode: string | null
	fps: number
	layers: { [layer: string]: InternalLayer }
}
export type InternalLayer = LayerBase
