import * as _ from "underscore";
// state NS
import {StateObject as StateNS} from "./lib/StateObject";
import CasparCG = StateNS.CasparCG;
import StateObjectStorage = StateNS.StateObjectStorage;
import Transition = StateNS.Transition;



import Channel = StateNS.Channel;
import Layer = StateNS.Layer;
import Mixer = StateNS.Mixer;
import Next = StateNS.Next;
import TransitionObject = StateNS.TransitionObject;

//import * as CCG_conn from "casparcg-connection";

// AMCP NS
import {Command as CommandNS, AMCP as AMCP} from "casparcg-connection";
import IAMCPCommandVO = CommandNS.IAMCPCommandVO;



// config NS
// import {Config as ConfigNS} from "casparcg-connection";
// import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
// import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;

/** */
export class CasparCGState {

	private minTimeSincePlay:number = 0.2;
	// private _currentState: CasparCG = new CasparCG(); // replaced by this._currentStateStorage

	private _currentStateStorage: StateObjectStorage = new StateObjectStorage();

	private _currentTimeFunction: () => number;
	private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void;

	private _isInitialised: boolean;
	public bufferedCommands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: Layer}> = [];

	


	/** */
	constructor(config?: {
		currentTime?: 				() 												=> number,
		getMediaDurationCallback?: 	(clip: string, callback: (duration: number) 	=> void) => void
		externalStorage?:			(action: string, data: Object | null) 			=> CasparCG
	
	}) {
		// set the callback for handling time messurement
		if (config && config.currentTime) {

			this._currentTimeFunction = config.currentTime;
		} else {
			this._currentTimeFunction = () => {return Date.now() / 1000; };
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
	public initStateFromChannelInfo(channels: any) {
		let currentState = this._currentStateStorage.fetchState();
		_.each(channels, (channel, i) => {
			//let existingChannel = _.findWhere(currentState.channels, {channelNo: i + 1});
			let existingChannel = currentState.channels[(i+1)+''];
			if (!existingChannel) {
				existingChannel = new Channel();
				existingChannel.channelNo = i + 1;
				//currentState.channels.push(existingChannel);
				currentState.channels[existingChannel.channelNo] = existingChannel;
			}

			existingChannel.videoMode = channel["format"];
			existingChannel.fps = channel["frameRate"];
			existingChannel.layers = {};
		});

		// Save new state:
		this._currentStateStorage.storeState(currentState);
		this.isInitialised = true;
	}

	/** *
	public initStateFromConfig(config: CasparCGConfig207 | CasparCGConfig210) {
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
		this.isInitialised = true;
	}*/

	/** */
	setState(state: CasparCG): void {
		this._currentStateStorage.storeState(state);
	}

	/** */
	getState(options: {full: boolean} = {full: true}): CasparCG {
		// needs to be initialised
		if(!this.isInitialised) {
			throw new Error("CasparCG State is not initialised");
		}

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
		// buffer commands until we are initialised
		if(!this.isInitialised) {
			this.bufferedCommands = this.bufferedCommands.concat(commands);
			return;
		}

		// iterates over commands and applies new state to current state

		let currentState = this._currentStateStorage.fetchState();


		let setMixerState = (channel:Channel, command:IAMCPCommandVO, attr:string, subValue:Array<string> | string) => {
			let layer = this.ensureLayer(channel, command.layer);
			
			if (!layer.mixer) layer.mixer = new Mixer();


			/*
			console.log('setMixerState '+attr);
			console.log(subValue);
			console.log(command)
			*/

			if (command._objectParams['_defaultOptions']) {
				// the command sent, contains "default parameters"
				
				delete layer.mixer[attr];
			} else {

				if (_.isArray(subValue)) {
					let o = {}
					_.each(subValue,(sv) => {
						o[sv] = command._objectParams[sv];
					})
					layer.mixer[attr] = new TransitionObject(o);

				} else if (_.isString(subValue)) {
					//let o:any = {value: command._objectParams[subValue]};
					let o:any = command._objectParams[subValue];
					layer.mixer[attr] = new TransitionObject(o);
				}
			}
		}

		commands.forEach((i) => {
			let command: IAMCPCommandVO = i.cmd;
			

			let channelNo:number = <number> (command._objectParams||{})['channel'] || command.channel;
			let layerNo:number = <number> 	(command._objectParams||{})['layer'] || command.layer;
			
			let channel: Channel | undefined = currentState.channels[channelNo+''];
			let layer: Layer | undefined;
			if (!channel) {
				// Create new empty channel:
				channel = new Channel();
				channel.channelNo = channelNo;

				currentState.channels[channel.channelNo+''] = channel;

				//throw new Error(`Missing channel with channel number "${command.channel}"`);
			}

			let cmdName = command._commandName;
			switch (cmdName) {
				case "PlayCommand":
				case "LoadCommand":
					layer = this.ensureLayer(channel, layerNo);

					let seek:number = <number>command._objectParams['seek'];

					let playDeltaTime = (seek||0)/channel.fps;


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
							layer.playTime = this._currentTimeFunction()-playDeltaTime;
						}

						this._getMediaDuration((layer.media||'').toString(), channel.channelNo, layer.layerNo);
						
					} else {
						if (cmdName == 'PlayCommand' && layer.content == 'media' && layer.media && layer.pauseTime && layer.playTime) {
							// resuming a paused clip
							layer.playing = true;

							let playedTime = layer.playTime-layer.pauseTime;
							layer.playTime = this._currentTimeFunction()-playedTime; // "move" the clip to new start time
						}
					}


					if(i.additionalLayerState && i.additionalLayerState.media) {
						_.extend(layer.media, {outTransition: i.additionalLayerState.media["outTransition"]});
					}


					break;
				case "PauseCommand":
					layer = this.ensureLayer(channel, layerNo);
					layer.playing = false;
					layer.pauseTime = this._currentTimeFunction();
					break;
				case "ClearCommand":
					if (layerNo>0) {
						layer = this.ensureLayer(channel, layerNo);
						layer.next = null;
					} else {
						channel.layers = {};
						break;
						
					}
					// no break;
				case "StopCommand":
					layer = this.ensureLayer(channel, layerNo);
					layer.playing = false;
					layer.content = null;
					layer.media = null;
					layer.playTime = 0;
					layer.pauseTime = 0;
					break;
				case "LoadbgCommand":
					layer = this.ensureLayer(channel, layerNo);
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
					layer = this.ensureLayer(channel, layerNo);

					// Note: we don't support flashLayer for the moment
					if (command._objectParams['templateName']) {
						layer.content = 'template';		// @todo: string literal

						layer.media = <string>command._objectParams['templateName'];

						layer.cgStop = !!command._objectParams['cgStop'];
						//layer.templateType // we don't know if it's flash or html 
					
						// layer.playTime = this._currentTimeFunction();
						
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
					layer = this.ensureLayer(channel, layerNo);
					if (layer.content == 'template') {
						layer.templateFcn = 'update';
						layer.templateData = command._objectParams['data'] || null;
					}
					break;
				case "CGPlayCommand":
					layer = this.ensureLayer(channel, layerNo);
					layer.playing = true;
					layer.templateFcn = 'play';
					layer.templateData = null;
					break;
				case "CGStopCommand":
					layer = this.ensureLayer(channel, layerNo);
					layer.templateFcn = 'stop';
					layer.playing = false;

					break;
				case "CGInvokeCommand":
					layer = this.ensureLayer(channel, layerNo);
					if (command._objectParams['method']) {
						layer.templateFcn = 'invoke';
						layer.templateData = {method: command._objectParams['method'] };
					}

					break;
				case "CGRemoveCommand":
				case "CGClearCommand":
					// note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
					layer = this.ensureLayer(channel, layerNo);
					// todo: what's the difference between this and StopCommand?
					layer.playing = false;
					layer.content = null;
					layer.media = null;
					// layer.playTime = 0;
					layer.pauseTime = 0;
					layer.templateData = null;
					break;

				case "PlayDecklinkCommand":
					

					layer = this.ensureLayer(channel, layerNo);

					layer.content = 'input';

					layer.media = 'decklink'

					layer.input = {
						device: <number>command._objectParams['device'],
						format: <string>command._objectParams['format'],
						
					}
					//filter: command._objectParams['filter'],
					//channelLayout: command._objectParams['channelLayout'],

					layer.playing = true;
					layer.playTime = null; // playtime is irrelevant

					break;

				case "MixerAnchorCommand":
					setMixerState(channel, command,'anchor',['x','y']);
					break;
				// blend
				case "MixerBrightnessCommand":
					setMixerState(channel, command,'brightness','brightness');
					break;
				// chroma
				case "MixerClipCommand":
					setMixerState(channel, command,'clip',['x','y','width','height']);
					break;
				case "MixerContrastCommand":
					setMixerState(channel, command,'contrast','contrast');
					break;
				case "MixerCropCommand":
					setMixerState(channel, command,'crop',['left','top','right','bottom']);
					break;
				case "MixerFillCommand":
					setMixerState(channel, command,'fill',['x','y','xScale','yScale']);
					break;
				// grid
				// keyer
				// levels
				// mastervolume
				// mipmap
				case "MixerOpacityCommand":
					setMixerState(channel, command,'opacity','opacity');
					break;
				case "MixerPerspectiveCommand":
					setMixerState(channel, command,'perspective',['topLeftX','topLeftY','topRightX','topRightY','bottomRightX','bottomRightY','bottmLeftX','bottomLeftY']);
					break;
				case "MixerRotationCommand":
					setMixerState(channel, command,'rotation','rotation');
					break;
				case "MixerSaturationCommand":
					setMixerState(channel, command,'saturation','saturation');
					break;
				case "MixerStraightAlphaOutputCommand":
					setMixerState(channel, command,'straightAlpha','state');
					break;
				case "MixerVolumeCommand":
					setMixerState(channel, command,'volume','volume');
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
				case "CustomCommand":
					// specials/temporary workaraounds:

					switch (command._objectParams['customCommand']) {
						case "route":
							
							layer = this.ensureLayer(channel, layerNo);
							
							layer.content = 'route';
							layer.media = 'route'

							//let route:Object = <Object>co;

							let routeChannel:any 	= command._objectParams['routeChannel'];
							
							let routeLayer:any 		= command._objectParams['routeLayer'];
							
							layer.route = {
								channel: 	parseInt(routeChannel),
								layer: 		(routeLayer ? parseInt(routeLayer) : null)
							};
							
							layer.playing = true;
							layer.playTime = null; // playtime is irrelevant

							break;
						//
					}
					break;
				case "executeFunction":

					layer = this.ensureLayer(channel, layerNo);

					if (command['returnValue'] !== true) {

						// save state:
						layer.content = 'function';
						layer.media = command['media'];

					}

					break;
				//
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
	getDiff(newState: CasparCG): Array<{cmds:Array<IAMCPCommandVO>, additionalLayerState?: Layer}> {
		// needs to be initialised
		if(!this.isInitialised) {
			throw new Error("CasparCG State is not initialised");
		}

		let currentState = this._currentStateStorage.fetchState();
		return this.diffStates(currentState, newState);
	}


	private compareAttrs(obj0:any, obj1:any, attrs:Array<string>, strict?:boolean ):boolean {
		var areSame:boolean = true;
		
		let getValue:any = function (val:any) {
			//if (_.isObject(val)) return val.valueOf();
			//if (val.valueOf) return val.valueOf();
			//return val;
			return Mixer.getValue(val);
		}
		if (obj0 && obj1) {
			if (strict) {
				_.each(attrs,(a:string) => {
					if (obj0[a].valueOf() !== obj1[a].valueOf() ) areSame = false;
				});	
			} else {
				_.each(attrs,(a:string) => {

					if (getValue(obj0[a]) != getValue(obj1[a]) ) {
						areSame = false;	
					}

					
				});	
			}
		} else {
			if (
				(obj0 && !obj1)
				||
				(!obj0 && obj1)
			) areSame = false
		}
		return areSame;
	}
	/** */
	public diffStates(oldState: CasparCG, newState: CasparCG): Array<{cmds:Array<IAMCPCommandVO>, additionalLayerState?: Layer}> {

		// needs to be initialised
		if(!this.isInitialised) {
			throw new Error("CasparCG State is not initialised");
		}
		
		//console.log('diffStates -----------------------------');
		//console.log(newState)

		let commands: Array<{cmds:Array<IAMCPCommandVO>, additionalLayerState?: Layer}> = [];
		let time:number = this._currentTimeFunction();

		let setTransition = (options:Object | null, channel:Channel,oldLayer:Layer, content:any) => {
			
			channel;
			if (!options) options = {};

			if (_.isObject(content)) {

				let transition: Transition | undefined;

				if(oldLayer.playing && content.changeTransition ){
					transition = content.changeTransition;
				} else if( content.inTransition ){
					transition = content.inTransition;
				}

				if(transition ) {
					options['transition'] 			= transition.type;
					options['transitionDuration'] 	= Math.round(transition.duration*(channel.fps||50));
					options['transitionEasing'] 	= transition.easing;
					options['transitionDirection'] 	= transition.direction;
				}
			}
			
			return options;
		}

		// ==============================================================================
		// Added things:
		_.each(newState.channels, (channel,channelKey) => {
			let oldChannel = oldState.channels[channelKey+''] || (new Channel());
 
 			_.each(channel.layers,(layer:Layer,layerKey) => {
				let oldLayer:Layer = oldChannel.layers[layerKey+''] || (new Layer());

				if (layer) {

					/*
					console.log('new layer '+channelKey+'-'+layerKey);
					console.log(layer)
					console.log('old layer');
					console.log(oldLayer)
					*/
					
					let cmd;
					let additionalCmds:Array<any> = [];

					
					
					if (
						!this.compareAttrs(layer,oldLayer,['content','media','templateType','playTime','looping'])
						||
						(
							layer.content == 'input'
							&& !this.compareAttrs(layer.input,oldLayer.input,['device','format'])
						)
					) {
						
						let options:any = {};
						options.channel = channel.channelNo;
						options.layer = layer.layerNo;
						
						
						setTransition(options,channel,oldLayer,layer.media);

						

						if (layer.content == 'media' && layer.media !== null) {

							let timeSincePlay:any = (layer.pauseTime || time ) - layer.playTime;
							if (timeSincePlay < this.minTimeSincePlay) {
								timeSincePlay = 0;
							}
							if (layer.looping) {
								// we don't support looping and seeking at the same time right now..
								timeSincePlay = 0;
							}

							
							if (_.isNull(layer.playTime)) { // null indicates the start time is not relevant, like for a LOGICAL object, or an image
								timeSincePlay = null;
								
								/*if (
									_.isNull(oldLayer.playTime) 
									&& this.compareAttrs(layer,oldLayer,['content','media','templateType','playing'])
								) {
									// 
									noCommandNeeded = true;
								}*/
							}

							var seek = Math.max(0,Math.floor(
								(
									(timeSincePlay||0)
									+
									(layer.seek||0)
								)
								*oldChannel.fps
							))
							
							if (layer.playing) {	
								cmd = new AMCP.PlayCommand(_.extend(options,{
									clip: (layer.media||'').toString(),
									seek: seek, 
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
										clip: (layer.media||'').toString(),
										seek: seek,
										loop: !!layer.looping
									}));
									
								}
							}
							
						} else if (layer.content == 'template' && layer.media !== null) {

							cmd = new AMCP.CGAddCommand(_.extend(options,{
								templateName: (layer.media||'').toString(),
								flashLayer: 1,
								playOnLoad: layer.playing,
								data: layer.templateData||undefined,
								cgStop: layer.cgStop
							}));
						
						} else if (layer.content == 'input' && layer.media !== null) {

							
							let inputType:string 	= (layer.input && layer.media && (layer.media||'').toString()) || 'decklink';
							let device:number|null 		= (layer.input && layer.input.device) ;
							let format:string|null 		= (layer.input && layer.input.format) ; // todo: the default value should be the channel format

							if (inputType == 'decklink') {


								

								_.extend(options,{
									device: 		device,
									//filter		// "ffmpeg filter"
									//channelLayout
									format: 		format,
								})
								

								cmd = new AMCP.PlayDecklinkCommand(options);

								/*cmd = new AMCP.CustomCommand(_.extend(options,{
									command: "PLAY "+options.channel+"-"+options.layer+" "+inputType+" DEVICE "+device+" FORMAT "+format,
								}));
								*/
							}
						} else if (layer.content == 'route' && layer.route) {

							

							let routeChannel:any 	= layer.route.channel;
							let routeLayer:any 		= layer.route.layer;

							_.extend(options,{
								routeChannel: 		routeChannel,
								routeLayer: 		routeLayer,

								command: (
									'PLAY '+options.channel+'-'+options.layer+
									' route://'+
										routeChannel+
										(routeLayer ? '-'+routeLayer : '')+
									(
										options.transition
										? (' '+options.transition+' '+options.transitionDuration+' '+options.transitionEasing)
										: ''
									)
								),

								customCommand: 'route',
							});

							cmd = new AMCP.CustomCommand(options);


						} else if (layer.content == 'function' && layer.media && layer.executeFcn) {


							cmd = {
								channel: options.channel,
								layer: options.layer,
								_commandName: 'executeFunction',

								externalFunction: true,
								functionName: layer.executeFcn,
								functionData: layer.executeData,
								functionLayer: layer,

								media: layer.media,
							}

							
							/*let fcn = (this._externalFunctions||{})[layer.executeFcn];

							

							if (fcn && _.isFunction(fcn)) {

								var returnValue = fcn(layer,layer.executeData);




								if (!returnValue !== true) {

									// save state:
									let layer0 = this.ensureLayer(oldChannel, layer.layerNo);

									layer0.content 	= layer.content;
									layer0.media 		= layer.media;
									layer0.playing 	= layer.playing;
									layer0.playTime 	= layer.playTime;
								}


							}*/

						} else {
							if (oldLayer.content == 'media' || oldLayer.content == 'media') {
								cmd = new AMCP.StopCommand(options);
							}
						}

						

						
						
					} else if (
						layer.content == 'template' 
						&& !this.compareAttrs(layer,oldLayer,['templateFcn'])
					) {
						// todo: implement CGUpdateCommand etc..
					}

					// -------------------------------------------------------------

					// Mixer commands:
					if (!layer.mixer) layer.mixer = new Mixer();
					if (!oldLayer.mixer) oldLayer.mixer = new Mixer();

					let compareMixerValues = function (layer:Layer,oldLayer:Layer,attr:string,attrs?:Array<string>): boolean{
						let val0:any = Mixer.getValue(layer.mixer[attr]);
						let val1:any = Mixer.getValue(oldLayer.mixer[attr]);

						if (attrs) {
							var areSame = true;

							if (val0 && val1) {
								_.each(attrs,function (a) {
									if (val0[a] != val1[a]) areSame = false;
								});
							} else {
								if (
									(val0 && !val1)
									||
									(!val0 && val1)
								) {
									areSame = false;
								}
							}
							return areSame;
						}

						if (_.isObject(val0) || _.isObject(val1)) {
							if (_.isObject(val0) && _.isObject(val1)) {
								var omitAttrs = ['inTransition','changeTransition','outTransition'];

								return _.isEqual(
									_.omit(val0,omitAttrs),
									_.omit(val1,omitAttrs)
								);

							} else return false;
						}

						return (val0 == val1);
					}

					let pushMixerCommand = function (attr:string, Command:any, subValue?:Array<string> | string ) {
						


						/*if (attr == 'fill') {
							console.log('pushMixerCommand '+attr);
							console.log(oldLayer.mixer)
							console.log(layer.mixer)
							console.log(subValue)
						}*/

						if (!compareMixerValues(
								layer,
								oldLayer,
								attr,
								(
									_.isArray(subValue) 
									? subValue 
									: undefined 
								)
							)
						) {

							/*
							console.log('pushMixerCommand change: '+attr)
							console.log(oldLayer.mixer)
							console.log(Mixer.getValue(oldLayer.mixer[attr]));
							console.log(layer.mixer)
							console.log(Mixer.getValue(layer.mixer[attr]));
							*/

							let options:any = {};
							options.channel = channel.channelNo;
							options.layer 	= layer.layerNo;
							
							//setTransition(options,channel,oldLayer,layer.mixer[attr]);
							setTransition(options,channel,oldLayer,layer.mixer);

							let o = Mixer.getValue(layer.mixer[attr]);

							if (_.has(layer.mixer,attr) && !_.isUndefined(o)) {
								
								/*
								console.log(attr);
								console.log(o);
								console.log(subValue);
								*/

								if (_.isArray(subValue)) {

									_.each(subValue,(sv) => {
										options[sv] = o[sv];
									});
								} else if (_.isString(subValue)) {
									//options[subValue] = o.value;
									if (_.isObject(o)) {
										options[subValue] = o._value;
									} else {
										options[subValue] = o;
									}
								}
								additionalCmds.push(new Command(options));
							} else {
								// @todo: implement
								// reset this mixer?
								// temporary workaround, default values

								var defaultValue:any = Mixer.getDefaultValues(attr);
								if (_.isObject(defaultValue)) {
									_.extend(options,defaultValue);
								} else {

									options[attr] = defaultValue;

									/*_.extend(options,{
										value: 
									});*/
								}

								/*
								console.log('defaultValues')
								console.log(options)
								*/

								options._defaultOptions = true;	// this is used in ApplyCommands to set state to "default"

								additionalCmds.push(new Command(options));


							}
						}
					}
					
					//if (!this.compareAttrs(layer.mixer,oldLayer.mixer,Mixer.supportedAttributes())) {



						pushMixerCommand('anchor',AMCP.MixerAnchorCommand,['x','y']);
						// blend
						pushMixerCommand('brightness',AMCP.MixerBrightnessCommand,'brightness');
						// chroma
						pushMixerCommand('clip',AMCP.MixerClipCommand,['x','y','width','height']);
						pushMixerCommand('contrast',AMCP.MixerContrastCommand,'contrast');
						pushMixerCommand('crop',AMCP.MixerCropCommand,['left','top','right','bottom']);
						pushMixerCommand('fill',AMCP.MixerFillCommand,['x','y','xScale','yScale']);
						// grid
						// keyer
						// levels
						// mastervolume
						// mipmap
						pushMixerCommand('opacity',AMCP.MixerOpacityCommand,'opacity');
						pushMixerCommand('perspective',AMCP.MixerPerspectiveCommand, ['topLeftX','topLeftY','topRightX','topRightY','bottomRightX','bottomRightY','bottmLeftX','bottomLeftY']);
						pushMixerCommand('rotation',AMCP.MixerRotationCommand,'rotation');
						pushMixerCommand('saturation',AMCP.MixerSaturationCommand,'saturation');
						pushMixerCommand('straightAlpha',AMCP.MixerStraightAlphaOutputCommand,'state');
						pushMixerCommand('volume',AMCP.MixerVolumeCommand,'volume');
					//}


					

					

					
					var cmds:Array<any> = [];
					if (cmd) {
						if (cmd['serialize']) {
							cmds.push(cmd['serialize']());
						} else {
							cmds.push(cmd);
						}
					}

					_.each(additionalCmds, (addCmd:any) => {
						cmds.push(addCmd.serialize());
					});

					commands.push({cmds: cmds, additionalLayerState: layer});
					

				}
			});
		});
		// ==============================================================================
		// Removed things:


		

		_.each(oldState.channels, (oldChannel,channelKey) => {
			let newChannel = newState.channels[channelKey] || (new Channel());

			
			_.each(oldChannel.layers,(oldLayer,layerKey) => {
				
				let newLayer:Layer = newChannel.layers[layerKey+''] || (new Layer);
				if (newLayer) {

					

					if (!newLayer.content && oldLayer.content) {
						let cmd;
						if(typeof oldLayer.media === 'object'  && oldLayer.media !== null){
							if(oldLayer.media.outTransition) {
								cmd = new AMCP.PlayCommand({
									channel: oldChannel.channelNo,
									layer: oldLayer.layerNo,
									clip: "empty",
									transition: oldLayer.media.outTransition.type,
									transitionDuration: Math.round(+(oldLayer.media.outTransition.duration)*oldChannel.fps),
									transitionEasing: oldLayer.media.outTransition.easing,
									transitionDirection: oldLayer.media.outTransition.direction
								});
							}
						}


						if (!cmd) {
							if (oldLayer.content == 'template' && oldLayer.cgStop ) {
								cmd = new AMCP.CGStopCommand({
									channel: oldChannel.channelNo,
									layer: oldLayer.layerNo,
									flashLayer: 1,
								});
							}
						}
						if (!cmd) {
							
							// ClearCommand:
							cmd = new AMCP.ClearCommand({
								channel: oldChannel.channelNo,
								layer: oldLayer.layerNo,
							});
						}

						if (cmd) {
							commands.push({
								cmds: [
									cmd.serialize()
								]
							});
						}
					}
				}
			});
			


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

	/** */
	public get isInitialised(): boolean {
		return this._isInitialised;
	}

	/** */
	public set isInitialised(initialised: boolean) {
		if(this._isInitialised !== initialised) {
			this._isInitialised = initialised;
			if(this._isInitialised) {
				this.applyCommands(this.bufferedCommands);
				this.bufferedCommands = [];
			}
		}
	}
}