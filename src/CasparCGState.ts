import * as _ from "underscore";
// state NS
import {StateObject as StateNS} from "./lib/StateObject";
import CasparCG = StateNS.CasparCG;
import StateObjectStorage = StateNS.StateObjectStorage;
import Transition = StateNS.Transition;



import Channel = StateNS.Channel;
import Layer = StateNS.Layer;
// import Mixer = StateNS.Mixer;
import Next = StateNS.Next;
import TransitionObject = StateNS.TransitionObject;

// AMCP NS
import {Command as CommandNS, AMCP as AMCP} from "casparcg-connection";
import IAMCPCommandVO = CommandNS.IAMCPCommandVO;



// config NS
import {Config as ConfigNS} from "casparcg-connection";
import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;

/** */
export class CasparCGState {

	private minTimeSincePlay:number = 0.2;
	// private _currentState: CasparCG = new CasparCG(); // replaced by this._currentStateStorage

	private _currentStateStorage: StateObjectStorage = new StateObjectStorage();

	private _getCurrentTimeFunction: () => number;
	private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void;


	/** */
	constructor(config?: {
		currentTime?: 				() 												=> number,
		getMediaDurationCallback?: 	(clip: string, callback: (duration: number) 	=> void) => void
		externalStorage?:			(action: string, data: Object | null) 			=> CasparCG
	}) {
		// set the callback for handling time messurement
		if (config && config.currentTime) {
			this._getCurrentTimeFunction = config.currentTime;
		} else {
			this._getCurrentTimeFunction = () => {return Date.now() / 1000; };
		}

		// set the callback for handling media duration query
		if (config && config.getMediaDurationCallback) {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				config!.getMediaDurationCallback!(clip, (duration: number) => {
					this.applyState(channelNo, layerNo, {duration: duration});
				});
			};
		} else {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {clip; this.applyState(channelNo, layerNo, {duration: null}); };
		}

		// set the callback for handling externalStorage
		if (config && config.externalStorage) {
			this._currentStateStorage.assignExternalStorage(config.externalStorage);
		}
	}

	/** */
	initStateFromConfig(config: CasparCGConfig207 | CasparCGConfig210) {
		let currentState = this._currentStateStorage.fetchState();

		_.each(config.channels, (channel, i) => {
			//let existingChannel = _.findWhere(currentState.channels, {channelNo: i + 1});
			let existingChannel = currentState.channels[(i+1)+''];
			if (!existingChannel) {
				existingChannel = new Channel();
				existingChannel.channelNo = i + 1;
				//currentState.channels.push(existingChannel);
				currentState.channels[existingChannel.channelNo] = existingChannel;
			}

			existingChannel.videoMode = channel["videoMode"];	// @todo: fix this shit
			existingChannel.layers = {};
		});

		// Save new state:
		this._currentStateStorage.storeState(currentState);
	}

	/** */
	setState(state: CasparCG): void {
		this._currentStateStorage.storeState(state);
	}

	/** */
	getState(options: {full: boolean} = {full: true}): CasparCG {

		let currentState = this._currentStateStorage.fetchState();

		// return state without defaults added:
		if (!options.full) {
			return currentState;
		} else {
			// add defaults to state and then return it:
			// @todo: iterate and generate default values;
			return currentState;
		}
	}

	/** */
	applyCommands(commands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: Layer}>): void {
		// iterates over commands and applies new state to current state

		let currentState = this._currentStateStorage.fetchState();


		commands.forEach((i) => {
			let command: IAMCPCommandVO = i.cmd;
			
			console.log('state: applyCommand '+command._commandName);
			console.log(command._objectParams);
			//console.log(i.additionalLayerState)

			
			let channel: Channel | undefined = currentState.channels[command.channel+''];
			let layer: Layer | undefined;
			if (!channel) {
				// Create new empty channel:
				channel = new Channel();
				channel.channelNo = command.channel;

				currentState.channels[channel.channelNo+''] = channel;

				//throw new Error(`Missing channel with channel number "${command.channel}"`);
			}
			let channelFPS = 50; // todo: change this
			

			let cmdName = command._commandName;
			switch (cmdName) {
				case "PlayCommand":
				case "LoadCommand":
					layer = this.ensureLayer(channel, command.layer);

					let seek:number = <number>command._objectParams['seek'];

					let playDeltaTime = (seek||0)/channelFPS;


					if (command._objectParams['clip']) {
						layer.content = 'media';
						layer.playing = (cmdName == 'PlayCommand');

						layer.media = new TransitionObject(<string>command._objectParams['clip']);
						if (command._objectParams['transition']) {
							layer.media.inTransition = new Transition(<string>command._objectParams['transition'], +command._objectParams['transitionDuration'], <string>command._objectParams['transitionEasing'], <string>command._objectParams['transitionDirection']);
						}

						layer.looping = !!command._objectParams['loop'];

						if (i.additionalLayerState) {
							layer.playTime = i.additionalLayerState.playTime;
						} else {
							layer.playTime = this._getCurrentTimeFunction()-playDeltaTime;
						}

						this._getMediaDuration(layer.media.toString(), channel.channelNo, layer.layerNo);
						
					} else {
						if (cmdName == 'PlayCommand' && layer.content == 'media' && layer.media && layer.pauseTime && layer.playTime) {
							// resuming a paused clip
							layer.playing = true;

							let playedTime = layer.playTime-layer.pauseTime;
							layer.playTime = this._getCurrentTimeFunction()-playedTime; // "move" the clip to new start time
						}
					}


					if(i.additionalLayerState && i.additionalLayerState.media) {
						_.extend(layer.media, {outTransition: i.additionalLayerState.media["outTransition"]});
					}


					break;
				case "PauseCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.playing = false;
					layer.pauseTime = this._getCurrentTimeFunction();
					break;
				case "ClearCommand":
					if (command.layer>0) {
						layer = this.ensureLayer(channel, command.layer);
						layer.next = null;
					} else {
						channel.layers = {};
						break;
						
					}
					// no break;
				case "StopCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.playing = false;
					layer.content = null;
					layer.media = null;
					layer.playTime = 0;
					layer.pauseTime = 0;
					break;
				case "LoadbgCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.next = new Next();
					
					if (command._objectParams['clip']) {
						layer.next.content = 'media';

						layer.media = new TransitionObject(<string>command._objectParams['clip']);
						if (command._objectParams['transition']) {
							layer.media.inTransition = new Transition(<string>command._objectParams['transition'], +command._objectParams['transitionDuration'], <string>command._objectParams['transitionEasing'], <string>command._objectParams['transitionDirection']);
						}

						layer.next.looping = !!command._objectParams['loop'];
					}

					

					break;
				case "CGAddCommand":
					layer = this.ensureLayer(channel, command.layer);

					// Note: we don't support flashLayer for the moment
					if (command._objectParams['templateName']) {
						layer.content = 'template';		// @todo: string literal

						layer.media = <string>command._objectParams['templateName'];
						//layer.templateType // we don't know if it's flash or html 
					
						layer.playTime = this._getCurrentTimeFunction();
						
						if (command._objectParams['playOnLoad']) {
							layer.playing = true;
							layer.templateFcn = 'play';
							layer.templateData = command._objectParams['data'] || null;
						} else {
							layer.playing = false;
							// todo: is data sent to template here also?
							layer.templateFcn = '';
							layer.templateData = null;
						}

						
					}
					break;
				case "CGUpdateCommand":
					layer = this.ensureLayer(channel, command.layer);
					if (layer.content == 'template') {
						layer.templateFcn = 'update';
						layer.templateData = command._objectParams['data'] || null;
					}
					break;
				case "CGPlayCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.playing = true;
					layer.templateFcn = 'play';
					layer.templateData = null;
					break;
				case "CGStopCommand":
					layer = this.ensureLayer(channel, command.layer);
					layer.templateFcn = 'stop';
					layer.playing = false;

					break;
				case "CGInvokeCommand":
					layer = this.ensureLayer(channel, command.layer);
					if (command._objectParams['method']) {
						layer.templateFcn = 'invoke';
						layer.templateData = {method: command._objectParams['method'] };
					}

					break;
				case "CGRemoveCommand":
				case "CGClearCommand":
					// note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
					layer = this.ensureLayer(channel, command.layer);
					// todo: what's the difference between this and StopCommand?
					layer.playing = false;
					layer.content = null;
					layer.media = null;
					layer.playTime = 0;
					layer.pauseTime = 0;
					layer.templateData = null;
					break;

				/*

					ResumeCommand

					CallCommand
					SwapCommand
					AddCommand
					RemoveCommand
					SetCommand
					ChannelGridCommand

					bye
					kill
					restart
				*/


				/*case "MixerOpacityCommand":
					layer = this.ensureLayer(channel, command.layer);
					if (command._objectParams['method']) {
						// @todo: in the fuuuuuutuuuuuuureeeeee
					}
					break;*/
			}
		});

		// Save new state:
		this._currentStateStorage.storeState(currentState);
	}

	/** */
	applyState(channelNo: number, layerNo: number, stateData: {[key: string]: any}): void {
		channelNo;
		layerNo;
		stateData;
		/*let channel: Channel = _.findWhere(this.getState().channels, {channelNo: channelNo});
		let layer: Layer = _.findWhere(channel.layers, {layerNo: layerNo});
		_.extend(layer, stateData);*/
	}

	/** */
	private ensureLayer(channel: Channel, layerNo: number): Layer  {
		if (! (layerNo >0 )) {
			throw "State.ensureLayer: tried to get layer '"+layerNo+"' on channel '"+channel+"'";
		}
		let layer:Layer  = channel.layers[layerNo+''];
		if (!layer) {
			layer = new Layer();
			layer.layerNo = layerNo;
			channel.layers[layer.layerNo+''] = layer;
			
		}
		return layer;
		
	}

	/** */
	getDiff(newState: CasparCG): Array<{cmd: IAMCPCommandVO, additionalLayerState?: Layer}> {
		let currentState = this._currentStateStorage.fetchState();
		return this.diffStates(currentState, newState);
	}

	private compareAttrs(obj0:Object, obj1:Object, attrs:Array<string>, strict?:boolean ):boolean {
		var areSame:boolean = true;
		
		let getValue:any = function (val:any) {
			if (_.isObject(val)) return val.valueOf();
			return val;
		}
		if (strict) {
			_.each(attrs,(a:string) => {
				if (obj0[a].valueOf() !== obj1[a].valueOf() ) areSame = false;
			});	
		} else {
			_.each(attrs,(a:string) => {

				if (getValue(obj0[a]) != getValue(obj1[a]) ) {
					areSame = false;	
				}

				//if ((obj0[a] && obj0[a].valueOf()) != (obj1[a] && obj1[a].valueOf()) ) {
					/*
					console.log('not same:')
					console.log(obj0[a])
					console.log(obj1[a])
					*/
				//} 
			});	
		}
		return areSame;
	}
	/** */
	public diffStates(oldState: CasparCG, newState: CasparCG): Array<{cmd: IAMCPCommandVO, additionalLayerState?: Layer}> {
		
		console.log('diffStates -----------------------------');
		//console.log(newState)

		let commands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: Layer}> = [];
		let time:number = this._getCurrentTimeFunction();
		// ==============================================================================
		// Added things:
		_.each(newState.channels, (channel,channelKey) => {
			// @todo IMPORTANT!!!!!! 50I = 25FPS!!!!!!!!!
			let channelFps = 50; // @todo: fix this, based on channel.videoMode
			// @todo IMPORTANT!!!!!! 50I = 25FPS!!!!!!!!!

			let oldChannel = oldState.channels[channelKey+''] || (new Channel);

			_.each(channel.layers,(layer,layerKey) => {
				let oldLayer:Layer = oldChannel.layers[layerKey+''] || (new Layer);

				if (layer) {

					console.log('new layer '+channelKey+'-'+layerKey);
					console.log(layer)
					console.log('old layer');
					console.log(oldLayer)
					
					if (
						!this.compareAttrs(layer,oldLayer,['content','media','templateType','playTime','looping'])
					) {
						let cmd;
						let options:any = {};

						options.channel = channel.channelNo;
						options.layer = layer.layerNo;
						
						if (typeof layer.media == 'object' && layer.media !== null) {
							





							
							let transition: Transition | undefined;

							if(oldLayer.playing && layer.media.changeTransition ){
								transition = layer.media.changeTransition;
							} else if( layer.media.inTransition ){
								transition = layer.media.inTransition;
							}

							if(transition ){
								options.transition 			= transition.type;
								options.transitionDuration 	= Math.round(transition.duration*channelFps);
								options.transitionEasing 	= transition.easing;
								options.transitionDirection = transition.direction;
							}
						}

						if (layer.content == 'media' && layer.media !== null) {

							let timeSincePlay:any = (layer.pauseTime || time ) - layer.playTime;
							if (timeSincePlay < this.minTimeSincePlay) {
								timeSincePlay = 0;
							}
							if (layer.looping) {
								// we don't support looping and seeking at the same time right now..
								timeSincePlay = 0;
							}

							
							if (_.isNull(layer.playTime)) { // null indicates the start time is not relevant, like for a LOGICAL object
								timeSincePlay = null;
								
								/*if (
									_.isNull(oldLayer.playTime) 
									&& this.compareAttrs(layer,oldLayer,['content','media','templateType','playing'])
								) {
									// 
									noCommandNeeded = true;
								}*/
							}

							
							if (layer.playing) {	
								cmd = new AMCP.PlayCommand(_.extend(options,{
									clip: layer.media.toString(),
									seek: Math.max(0,Math.floor((timeSincePlay||0)*channelFps)), 
									loop: !!layer.looping
								}));
							} else {
								if (
									(layer.pauseTime && (time-layer.pauseTime) < this.minTimeSincePlay)
									|| _.isNull(timeSincePlay)
								) {
									cmd = new AMCP.PauseCommand(options);
								} else {
									
									cmd = new AMCP.LoadCommand(_.extend(options,{
										clip: layer.media.toString(),
										seek: Math.max(0,Math.floor(timeSincePlay*channelFps)),
										loop: !!layer.looping
									}));
									
								}
							}
							
						} else if (layer.content == 'template' && layer.media !== null) {

							cmd = new AMCP.CGAddCommand(_.extend(options,{
								templateName: layer.media.toString(),
								playOnLoad: layer.playing,
								data: layer.templateData||undefined
							}));

						} else {
							if (oldLayer.content == 'media' || oldLayer.content == 'media') {
								cmd = new AMCP.StopCommand(options);
							}
						}
						if (cmd) {
							// console.log(cmd.serialize());
							commands.push({cmd: cmd.serialize(), additionalLayerState: layer});
						}
						
					} else if (
						layer.content == 'template' 
						&& !this.compareAttrs(layer,oldLayer,['templateFcn'])
					) {
						// todo: implement CGUpdateCommand etc..
					}

				}
			});
		});
		// ==============================================================================
		// Removed things:


		

		_.each(oldState.channels, (oldChannel,channelKey) => {
			let newChannel = newState.channels[channelKey] || (new Channel);

			//console.log("oooooold", oldChannel.layers);
			

			/*if (!channel.layers.length) {
				if (oldChannel.layers.length) {
					console.log('clear channel '+channel.channelNo);
					// ClearCommand:
					let cmd = new AMCP.ClearCommand({
						channel: channel.channelNo
					});

					commands.push(cmd.serialize());
				}
			} else {*/
				_.each(oldChannel.layers,(oldLayer,layerKey) => {
					// @todo: foooooo
					let channelFps:number = 50;
					let newLayer:Layer = newChannel.layers[layerKey+''] || (new Layer);
					if (newLayer) {

						

						if (!newLayer.content && oldLayer.content) {
							let cmd;
							if(typeof oldLayer.media === 'object'  && oldLayer.media !== null){
								if(oldLayer.media.outTransition){
									cmd = new AMCP.PlayCommand({
										channel: oldChannel.channelNo,
										layer: oldLayer.layerNo,
										clip: "empty",
										transition: oldLayer.media.outTransition.type,
										transitionDuration: Math.round(+(oldLayer.media.outTransition.duration)*channelFps),
										transitionEasing: oldLayer.media.outTransition.easing,
										transitionDirection: oldLayer.media.outTransition.direction
									});
								}
							}

							if (!cmd) {
								console.log('clear layer ' + oldLayer.layerNo);
								// ClearCommand:
								cmd = new AMCP.ClearCommand({
									channel: oldChannel.channelNo,
									layer: oldLayer.layerNo,
								});
							}
							commands.push({cmd: cmd.serialize()});
						}
					}
				});
			//}


		});
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