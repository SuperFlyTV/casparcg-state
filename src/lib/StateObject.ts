import * as _ from "underscore";

export namespace StateObject {
	

	/** */
	export class Mappings {
		layers: {[GLayer:string]: Mapping} = {}
	}
	export class Mapping {
		channel: number
		layer: number
	}
	

	/** */
	export class CasparCG {
		channels: { [channel: string]: Channel} = {}//Array<Channel> = [new Channel()];
	}

	/** */
	export class Channel {
		channelNo: number = 1;
		videoMode: string | null; 	// @todo: string literal
		layers: { [layer: string]: Layer} = {} //layers: Array<Layer> = [];
	}

	/** */
	export class Layer {
		layerNo: number;
		content: string | null; 		// @todo: string literal
		media: string | TransitionObject | null; // clip or templatename
		templateType?: string;	// @todo: string literal 'flash', 'html'
		playing: boolean;
		looping: boolean;
		playTime: number | null; // timestamp when content started playing
		pauseTime: number; // timestamp when content stopped playing (was paused)
		duration: number;
		next: Next | null;
		mixer: Mixer;
		templateFcn: string; // 'play', 'update', 'stop' or else (invoke)
		templateData: Object | null;
	}

	/** */
	export class Mixer {
		opacity?: number | TransitionObject;
		volume?: number | TransitionObject;
	}

	/** */
	export class Next {
		content: string; 		// @todo: string literal
		media: string | TransitionObject;
		looping: boolean;
		playTime: number;
		duration: number;
		auto: boolean;
	}

	export class Transition {

		type: string = "mix";
		duration: number = 0;
		easing: string = "linear";
		direction: string = "right";

		/**
		 * 
		 */
		constructor(type?: string, duration?:number, easing?: string, direction?: string) {

			// @todo: for all: string literal
			if(type) {
				this.type = type;
			}
			if(duration) {
				this.duration = duration;
			}
			if(easing) {
				this.easing = easing;
			}
			if(direction) {
				this.direction = direction;
			}
		}
	}

	/** */
	export class TransitionObject {
		_value: string | number | boolean;
		inTransition: Transition;
		changeTransition: Transition;
		outTransition: Transition;

		/** */
		constructor(value?: string | number | boolean){
			if(value){
				this._value = value;
			}
		}

		/** */
		valueOf(): string | number | boolean {
			return this._value;
		}

		/** */
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
				return this._externalStorage("fetch", null);
			} else {
				/*return _Clone(this._internalState); */
				return _.clone(this._internalState); // temprary, we should do a deep clone here

			}
		};
		storeState(data: CasparCG): void {
			if (this._externalStorage) {
				this._externalStorage("store", data );
			} else {
				this._internalState = data;
			}
		}

	}

}