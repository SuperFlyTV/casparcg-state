import * as _ from "underscore";

export namespace StateObject {
	/** */
	export class CasparCG {
		channels: Array<Channel> = [new Channel()];
	}

	/** */
	export class Channel {
		channelNo: number = 1;
		videoMode: string; 	// @todo: string literal
		layers: Array<Layer> = [];
	}

	/** */
	export class Layer {
		layerNo: number;
		content: string; 		// @todo: string literal
		media: string | TransitionObject;
		templateType?: string;	// @todo: string literal
		playing: boolean;
		playTime: number;
		duration: number;
		next: Next | null;
		mixer: Mixer;
	}

	/** */
	export class Mixer {
		opacity: number | TransitionObject;
		volume: number | TransitionObject;
	}

	/** */
	export class Next {
		content: string; 		// @todo: string literal
		media: string | TransitionObject;
		playTime: number;
		duration: number;
		auto: boolean;
	}

	/** */
	export class TransitionObject {
		_value: string | number | boolean;
		transition: {type: string, duration: number; ease: string} = {type: "", duration: 0, ease: "linear"}; // @todo: string literal on ease
		valueOf(): string | number | boolean {
			return this._value;
		}
		toString(): string {
			return this._value.toString();
		}
	}



	/** 
	* StateObjectStorage is used for exposing the internal state variable 
	* By default, it is storing the state as an internal variable,
	* byt may be using an external storage function for fetching/storing the state.
	*/
	export class StateObjectStorage {
		private _internalState: CasparCG = new CasparCG();
		private _externalStorage: ((action: string, data: Object | null) => CasparCG) | null;


		assignExternalStorage(fcn: (action: string, data: Object | null) => CasparCG ): void {
			this._externalStorage = fcn;
		};

		fetchState(): CasparCG {
			if (this._externalStorage) {
				return this._externalStorage('fetch',null);
			} else {
				/*return _Clone(this._internalState); */
				return _.clone(this._internalState); // temprary, we should do a deep clone here
				
			}
		};
		storeState(data: CasparCG): void {
			if (this._externalStorage) {
				this._externalStorage('store', data );
			} else {
				this._internalState = data;
			}
		}
		
	}

}