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
	}
}