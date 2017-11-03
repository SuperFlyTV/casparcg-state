import * as _ from "underscore";
import {Enum as CCG_Enum} from "casparcg-connection";

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
		fps: number;
		layers: { [layer: string]: Layer} = {} //layers: Array<Layer> = [];
	}

	/** */
	export class Layer {
		layerNo: number;
		
		content: string | null; 		// @todo: string literal
		
		media: string | TransitionObject | null; // clip or templatename
		
		input: {
			device: number,
			format?: string,
			channelLayout?: string
		} | null ;

		route: {
			channel: number,
			layer: number | null
		} | null ;

		
		
		playing: boolean;
		looping: boolean;
		seek: number; 	// start the clip xx seconds in
		playTime: number | null; // timestamp when content started playing, (null == 'irrelevant')
		pauseTime: number; // timestamp when content stopped playing (was paused)
		duration: number;
		next: Next | null;
		mixer: Mixer;
		
		templateType?: string;	// @todo: string literal 'flash', 'html'
		templateFcn: string; // 'play', 'update', 'stop' or else (invoke)
		templateData: Object | null;
		cgStop?: boolean;

		executeFcn?: string; // name of function to execute
		executeData?: any;

		oscDevice?: number;
		inMessage?: {
			url: string,
			args?: {}
		} | null;
		outMessage?: {
			url: string,
			args?: {}
		} | null;

		noClear?: boolean;
	}

	/** */
	export class Mixer {
		public static getValue(val:any) {
			if (_.isObject(val) && val.valueOf) return val.valueOf();
			return val;
		}
		public static supportedAttributes():Array<string> {
			return [
			'anchor',
			'blend',
			'brightness',
			'chroma',
			'clip',
			'contrast',
			'crop',
			'fill',
			'keyer',
			'levels',
			'mastervolume',
			'opacity',
			'perspective',
			'rotation',
			'saturation',
			'straightAlpha',
			'volume',
			'bundleWithCommands'];
		};

		public static getDefaultValues(attr:string):Object|number|boolean|null {
			// this is a temporary function, to replaced by some logic from ccg-connection
			switch (attr) {
				
				case 'anchor':
					return {
						x:0, 
						y:0
					};
				
				case 'blend':
					return CCG_Enum.BlendMode.NORMAL;
				case 'brightness':
					return 1;
				
				case 'chroma':
					return {
						keyer:CCG_Enum.Chroma.NONE,
						threshold: 0,
						softness: 0,
						spill: 0
					};
					
				case 'clip':
					return {
						x:0, 
						y:0, 
						width:1, 
						height:1 
					};
				case 'contrast':
					return 1;
				case 'crop':
					return {
						left:0, 
						top:0, 
						right:0, 
						bottom:0 
					};
				case 'fill':
					return {
						x:0, 
						y:0, 
						xScale:1, 
						yScale:1 
					};
				// grid
				case 'keyer': // Layer mask
					return false;
				case 'levels':
					return {
						minInput: 	0, 
						maxInput: 	1, 
						gamma: 		1, 
						minOutput: 	0, 
						maxOutput: 	1, 
						
					};
				case 'mastervolume':
					return 1;
				// mipmap
				case 'opacity':
					return 1
				case 'perspective':
					return {
						topLeftX: 0, 
						topLeftY: 0, 
						topRightX: 1, 
						topRightY: 0, 
						bottomRightX: 1, 
						bottomRightY: 1, 
						bottomLeftX: 0, 
						bottomLeftY: 1
					};
				case 'rotation':
					return 0;
				case 'saturation':
					return 1;
				case 'straightAlpha':
					return false;
				case 'volume':
					return 1;
				
				default:
					// code...
					break;
			}
			return null;
		};

		inTransition:Object;
		changeTransition:Object;
		outTransition:Object;

		anchor?: {x:number, y:number } | TransitionObject;
		blend?: CCG_Enum.BlendMode | TransitionObject;
		brightness?: number | TransitionObject;
		chroma?: {
			keyer:CCG_Enum.Chroma,
			threshold:number,
			softness: number,
			spill: number
			
		} | TransitionObject;
		clip?: {x:number, y:number, width:number, height:number } | TransitionObject;
		contrast?: number | TransitionObject;
		crop?: {left:number, top:number, right:number, bottom:number } | TransitionObject;
		fill?: {x:number, y:number, xScale:number, yScale:number } | TransitionObject;
		// grid
		keyer?: boolean | TransitionObject;
		levels?: {minInput: number, maxInput: number, gamma: number, minOutput: number, maxOutput: number} | TransitionObject;
		mastervolume?: number | TransitionObject;
		// mipmap
		opacity?: number | TransitionObject;
		perspective?: {
			topLeftX: number, 
			topLeftY: number, 
			topRightX: number, 
			topRightY: number, 
			bottomRightX: number, 
			bottomRightY: number, 
			bottomLeftX: number, 
			bottomLeftY: number
		} | TransitionObject;
		
		rotation?: number | TransitionObject;
		saturation?: number | TransitionObject;
		straightAlpha?: boolean | TransitionObject;
		volume?: number | TransitionObject;

		bundleWithCommands?: number; // special function: bundle and DEFER with other mixer-commands
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
		constructor(value?: any ){
			if (!_.isUndefined(value)){
				this._value = value;
			}
		}

		/** */
		valueOf(): string | number | boolean {
			return this._value;
		}

		/** */
		toString(): string {
			if (this._value) return this._value.toString();
			return '';
		}
	}





	/** 
	* StateObjectStorage is used for exposing the internal state variable 
	* By default, it is storing the state as an internal variable,
	* byt may be using an external storage function for fetching/storing the state.
	*/
	export class StateObjectStorage {
		private _internalState: CasparCG = new CasparCG();
		private _externalStorage: ((action: string, data?: Object | null) => CasparCG) | null;


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
		};
		clearState(): void {
			if (this._externalStorage) {
				this._externalStorage("clear");
			} else {
				this._internalState = new CasparCG();
			}
		};

	}

}