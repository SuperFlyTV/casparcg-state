import * as _ from "underscore";
// state NS
import {StateObject as StateNS} from "./lib/StateObject";
import CasparCG = StateNS.CasparCG;
import Channel = StateNS.Channel;
import Layer = StateNS.Layer;
// import Mixer = StateNS.Mixer;
// import Next = StateNS.Next;
// import TransitionObject = StateNS.TransitionObject;

// AMCP NS
import {Command as CommandNS} from "casparcg-connection";
import IAMCPCommandVO = CommandNS.IAMCPCommandVO;

// config NS
import {Config as ConfigNS} from "casparcg-connection";
import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;

/** */
export class CasparCGState {

	private _currentState: CasparCG = new CasparCG();
	private _getCurrentTimeFunction: () => number;
	private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void;


	/** */
	constructor(config?: {currentTime?: () => number, getMediaDurationCallback?: (clip: string, callback: (duration: number) => void) => void}) {
		// sets callback for handling time messurement
		if (config && config.currentTime) {
			this._getCurrentTimeFunction = config.currentTime;
		} else {
			this._getCurrentTimeFunction = () => {return Date.now() / 1000; };
		}

		// setting callback for handling media duration query
		if (config && config.getMediaDurationCallback) {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				config!.getMediaDurationCallback!(clip, (duration: number) => {
					this.applyState(channelNo, layerNo, {duration: duration});
				});
			};
		} else {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {clip; this.applyState(channelNo, layerNo, {duration: null}); };
		}
	}

	/** */
	initStateFromConfig(config: CasparCGConfig207 | CasparCGConfig210) {
		_.each(config.channels, (channel, i) => {
			let existingChannel = _.findWhere(this._currentState.channels, {channelNo: i + 1});
			if (!existingChannel) {
				existingChannel = new Channel();
				existingChannel.channelNo = i + 1;
				this._currentState.channels.push(existingChannel);
			}

			existingChannel.videoMode = channel["videoMode"];	// @todo: fix this shit
			existingChannel.layers = [];
		});
	}

	/** */
	setState(state: CasparCG): void {
		this._currentState = state;
	}

	/** */
	getState(options: {full: boolean} = {full: true}): CasparCG {
		// return full state
		if (options.full) {
			return this._currentState;
		}

		// strip defaults and return slim state
		return this._currentState; // @todo: iterate and generate;
	}

	/** */
	applyCommands(commands: Array<IAMCPCommandVO>): void {
		// iterates over commands and applies new state to current state
		commands.forEach((command) => {
			let channel: Channel | undefined = _.findWhere(this._currentState.channels, {channelNo: command.channel});
			let layer: Layer | undefined;
			if (!channel) {
				throw new Error(`Missing channel with channel number "${command.channel}"`);
			}
			switch (command._commandName) {
				case "PlayCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.playing = true;
					if (command._objectParams["clip"]) {
						layer.content = "video";		// @todo: string literal
						layer.media = command._objectParams["clip"] ? (<string>command._objectParams["clip"]) : "";
					}
					layer.playTime = this._getCurrentTimeFunction();
					this._getMediaDuration(layer.media.toString(), channel.channelNo, layer.layerNo);
					break;
			}
		});
	}

	/** */
	applyState(channelNo: number, layerNo: number, stateData: {[key: string]: any}): void {
		channelNo;
		layerNo;
		stateData;

		console.log("apply state (async?): ", stateData);
	}

	/** */
	private ensureLayer(channel: Channel, layerNo: number): Layer {
		let layer  = _.findWhere(channel.layers, {layer: layerNo});
		if (!layer) {
			layer = new Layer();
			layer.layerNo = layerNo;
			channel.layers.push(layer);
		}
		return layer;
	}

	/** */
	getDiff(newState: CasparCG): Array<IAMCPCommandVO> {
		return CasparCGState.diffStates(this._currentState, newState);
	}

	/** */
	static diffStates(oldState: CasparCG, newState: CasparCG): Array<IAMCPCommandVO> {
		oldState;
		newState;

		let commands: Array<IAMCPCommandVO> = [];
		return commands;
	}

	/** */
	valueOf(): CasparCG {
		return this.getState({full: true});
	}

	/** */
	toString(): string {
		return JSON.stringify(this.getState({full: true}));
	}

}