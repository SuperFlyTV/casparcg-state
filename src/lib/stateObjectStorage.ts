import * as _ from 'underscore'

import { CasparCGFull as CF } from './interfaces'
/**
 * StateObjectStorage is used for exposing the internal state variable
 * By default, it is storing the state as an internal variable,
 * byt may be using an external storage function for fetching/storing the state.
 */
export class StateObjectStorage {
	private _internalState: CF.State = new CF.State()
	private _externalStorage: ((action: string, data?: Object | null) => CF.State) | null

	assignExternalStorage (fcn: (action: string, data: Object | null) => CF.State): void {
		this._externalStorage = fcn
	}

	fetchState (): CF.State {
		if (this._externalStorage) {
			return this._externalStorage('fetch', null)
		} else {
			return this._internalState
		}
	}
	storeState (data: CF.State): void {
		if (this._externalStorage) {
			this._externalStorage('store', data)
		} else {
			this._internalState = data
		}
	}
	clearState (): void {
		if (this._externalStorage) {
			this._externalStorage('clear')
		} else {
			this._internalState = new CF.State()
		}
	}
}
