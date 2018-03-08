import * as _ from 'underscore'
import { Command as CommandNS, AMCP as AMCP } from 'casparcg-connection'
import IAMCPCommandVO = CommandNS.IAMCPCommandVO

import { CasparCG } from './api'
import { CasparCGFull as CF } from './interfaces'
import { Mixer } from './mixer'
import { Transition, TransitionObject } from './transitionObject'
import { StateObjectStorage } from './stateObjectStorage'

const CasparCGStateVersion = '2017-11-06 19:15'

// config NS
// import {Config as ConfigNS} from "casparcg-connection";
// import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
// import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;

/** */
export class CasparCGState {

	public bufferedCommands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: CF.Layer}> = []

	private minTimeSincePlay: number = 0.2

	private _currentStateStorage: StateObjectStorage = new StateObjectStorage()
	private _currentTimeFunction: () => number
	private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void
	private _isInitialised: boolean
	private _externalLog?: (arg0?: any,arg1?: any,arg2?: any,arg3?: any) => void

	/** */
	constructor (config?: {
		currentTime?: () 												=> number,
		getMediaDurationCallback?: (clip: string, callback: (duration: number) 	=> void) => void
		externalStorage?:	(action: string, data: Object | null) 			=> CF.State
		externalLog?: (arg0?: any,arg1?: any,arg2?: any,arg3?: any) => void

	}) {
		// set the callback for handling time messurement
		if (config && config.currentTime) {

			this._currentTimeFunction = config.currentTime
		} else {
			this._currentTimeFunction = () => {
				return Date.now() / 1000
			}
		}

		// set the callback for handling media duration query
		if (config && config.getMediaDurationCallback) {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				config!.getMediaDurationCallback!(clip, (duration: number) => {
					this.applyState(channelNo, layerNo, { duration: duration })
				})
			}
		} else {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				// clip
				this.applyState(channelNo, layerNo, { duration: null })
			}
		}

		// set the callback for handling externalStorage
		if (config && config.externalStorage) {
			this._currentStateStorage.assignExternalStorage(config.externalStorage)
		}

		if (config && config.externalLog) {
			this._externalLog = config.externalLog
		}

	}
	get version (): string {
		return CasparCGStateVersion
	}

	/**
	 * Initializes the state by using channel info
	 * @param {any} channels [description]
	 */
	initStateFromChannelInfo (channels: Array<CasparCG.ChannelInfo>) {
		let currentState = this._currentStateStorage.fetchState()
		_.each(channels, (channel: CasparCG.ChannelInfo, i: number) => {
			if (!channel.videoMode) throw Error('State: Missing channel.videoMode!')
			if (!channel.fps) throw Error('State: Missing channel.fps!')

			let existingChannel: CF.Channel = currentState.channels[(i + 1) + '']

			if (!existingChannel) {
				existingChannel = new CF.Channel()
				existingChannel.channelNo = i + 1
				currentState.channels[existingChannel.channelNo] = existingChannel
			}

			existingChannel.videoMode 	= channel.videoMode
			existingChannel.fps 		= channel.fps

			existingChannel.layers = {}
		})

		// Save new state:
		this._currentStateStorage.storeState(currentState)
		this.isInitialised = true
	}

	/**
	 * Set the current statue to a provided state
	 * @param {CasparCG.State} state The new state
	 */
	setState (state: CF.State): void {
		this._currentStateStorage.storeState(state)
	}
	/**
	 * Resets / clears the current state
	 */
	clearState (): void {
		this._currentStateStorage.clearState()
	}
	/**
	 * A soft clear, ie clears any content, but keeps channel settings
	 */
	softClearState (): void {
		let currentState = this._currentStateStorage.fetchState()
		_.each(currentState.channels, (channel) => {
			channel.layers = {}
		})
		// Save new state:
		this._currentStateStorage.storeState(currentState)
	}

	/**
	 * Get the gurrent state
	 * @param  {true}}   options [description]
	 * @return {CF.State} The current state
	 */
	getState (options: {full: boolean} = { full: true }): CF.State {
		if (!this.isInitialised) {
			// The needs to be initialised
			throw new Error('CasparCG State is not initialised')
		}

		let currentState = this._currentStateStorage.fetchState()
		// return state without defaults added:
		if (!options.full) {
			return currentState
		} else {
			// add defaults to state and then return it:
			// @todo: iterate and generate default values
			return currentState
		}
	}

	/**
	 * Applies commands to current state
	 * @param {CF.Layer}>} commands [description]
	 */
	applyCommands (commands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: CF.Layer}>): void {
		// buffer commands until we are initialised
		if (!this.isInitialised) {
			this.bufferedCommands = this.bufferedCommands.concat(commands)
			return
		}

		let currentState = this._currentStateStorage.fetchState()

		// Applies commands to target state
		this.applyCommandsToState(currentState,commands)

		// Save new state:
		this._currentStateStorage.storeState(currentState)
	}
	/**
	 * Iterates over commands and applies new state to provided state object
	 * @param {any}     currentState
	 * @param {CF.Layer}>} commands
	 */
	applyCommandsToState (currentState: any, commands: Array<{cmd: IAMCPCommandVO, additionalLayerState?: CF.Layer}>): void {
		let setMixerState = (channel: CF.Channel, command: IAMCPCommandVO, attr: string, subValue: Array<string> | string) => {
			let layer = this.ensureLayer(channel, command.layer)

			if (!layer.mixer) layer.mixer = new Mixer()

			/*
			console.log('setMixerState '+attr);
			console.log(subValue);
			console.log(command)
			*/

			if ((command._objectParams || {})['_defaultOptions']) {
				// the command sent, contains "default parameters"

				delete layer.mixer[attr]
			} else {

				if (_.isArray(subValue)) {
					let o = {}
					_.each(subValue,(sv) => {
						o[sv] = command._objectParams[sv]
					})
					layer.mixer[attr] = new TransitionObject(o)

				} else if (_.isString(subValue)) {
					let o: any = command._objectParams[subValue]
					layer.mixer[attr] = new TransitionObject(o)
				}
			}
		}
		commands.forEach((i) => {
			let command: IAMCPCommandVO = i.cmd

			let channelNo: number = (command._objectParams || {})['channel'] as number || command.channel
			let layerNo: number = (command._objectParams || {})['layer'] as number || command.layer

			let channel: CF.Channel | undefined = currentState.channels[channelNo + '']
			// let layer: CF.Layer | undefined
			if (!channel) {
				// Create new empty channel:
				channel = new CF.Channel()
				channel.channelNo = channelNo

				currentState.channels[channel.channelNo + ''] = channel
			}

			let cmdName = command._commandName

			if (cmdName === 'PlayCommand' || cmdName === 'LoadCommand') {
				let layer: CF.IMediaLayer = this.ensureLayer(channel, layerNo) as CF.IMediaLayer

				let seek: number = command._objectParams['seek'] as number

				let playDeltaTime = (seek || 0) / channel.fps

				if (command._objectParams['clip']) {
					layer.content = CasparCG.LayerContentType.MEDIA
					layer.playing = (cmdName === 'PlayCommand')

					layer.media = new TransitionObject(command._objectParams['clip'] as string)
					if (command._objectParams['transition']) {
						layer.media.inTransition = new Transition(
							command._objectParams['transition'] as string,
							+(command._objectParams['transitionDuration'] || 0),
							command._objectParams['transitionEasing'] as string,
							command._objectParams['transitionDirection'] as string)
					}

					layer.looping = !!command._objectParams['loop']

					if (i.additionalLayerState) {
						layer.playTime = i.additionalLayerState.playTime || 0
					} else {
						layer.playTime = this._currentTimeFunction() - playDeltaTime
					}

					layer.pauseTime = Number(command._objectParams['pauseTime']) || 0

					this._getMediaDuration((layer.media || '').toString(), channel.channelNo, layer.layerNo)

				} else {
					if (cmdName === 'PlayCommand' && layer.content === CasparCG.LayerContentType.MEDIA && layer.media && layer.pauseTime && layer.playTime) {
						// resuming a paused clip
						layer.playing = true

						let playedTime = layer.playTime - layer.pauseTime
						layer.playTime = this._currentTimeFunction() - playedTime // "move" the clip to new start time

						layer.pauseTime = 0
					}
				}

				if (i.additionalLayerState && i.additionalLayerState.media) {
					_.extend(layer.media, { outTransition: i.additionalLayerState.media['outTransition'] })
				}

				layer.noClear = command._objectParams['noClear'] as boolean

			} else if (cmdName === 'PauseCommand') {
				let layer: CF.IMediaLayer = this.ensureLayer(channel, layerNo) as CF.IMediaLayer
				layer.playing = false
				layer.pauseTime = Number(command._objectParams['pauseTime']) || this._currentTimeFunction()

			} else if (cmdName === 'ClearCommand') {
				let layer: CF.IEmptyLayer
				if (layerNo > 0) {
					layer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer
					layer.nextUp = null
				} else {
					channel.layers = {}
				}
				layer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer
				layer.playing = false
				layer.content = CasparCG.LayerContentType.NOTHING
				layer.media = null
				layer.playTime = 0
				layer.pauseTime = 0
			} else if (cmdName === 'StopCommand') {
				let layer: CF.IEmptyLayer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer
				layer.playing = false
				layer.content = CasparCG.LayerContentType.NOTHING
				layer.media = null
				layer.playTime = 0
				layer.pauseTime = 0
			} else if (cmdName === 'LoadbgCommand') {
				let layer: CF.IMediaLayer = this.ensureLayer(channel, layerNo) as CF.IMediaLayer
				layer.nextUp = new CasparCG.NextUp()

				if (command._objectParams['clip']) {
					layer.nextUp.content = CasparCG.LayerContentType.MEDIA

					layer.media = new TransitionObject(command._objectParams['clip'] as string)
					if (command._objectParams['transition']) {
						layer.media.inTransition = new Transition(
							command._objectParams['transition'] as string,
							+(command._objectParams['transitionDuration'] || 0),
							command._objectParams['transitionEasing'] as string,
							command._objectParams['transitionDirection'] as string
						)
					}

					layer.nextUp.looping = !!command._objectParams['loop']
				}
			} else if (cmdName === 'CGAddCommand') {
				let layer: CF.ITemplateLayer = this.ensureLayer(channel, layerNo) as CF.ITemplateLayer

				// Note: we don't support flashLayer for the moment
				if (command._objectParams['templateName']) {
					layer.content = CasparCG.LayerContentType.TEMPLATE		// @todo: string literal

					layer.media = command._objectParams['templateName'] as string

					layer.cgStop = !!command._objectParams['cgStop']
					layer.templateType = command._objectParams['templateType'] as ('flash' | 'html')

					// layer.playTime = this._currentTimeFunction();

					if (command._objectParams['playOnLoad']) {
						layer.playing = true
						layer.templateFcn = 'play'
						layer.templateData = command._objectParams['data'] || null
					} else {
						layer.playing = false
						// todo: is data sent to template here also?
						layer.templateFcn = ''
						layer.templateData = null
					}

					layer.noClear = command._objectParams['noClear'] as boolean
				}
			} else if (cmdName === 'CGUpdateCommand') {
				let layer: CF.ITemplateLayer = this.ensureLayer(channel, layerNo) as CF.ITemplateLayer
				if (layer.content === CasparCG.LayerContentType.TEMPLATE) {
					layer.templateFcn = 'update'
					layer.templateData = command._objectParams['data'] || null
				}
			} else if (cmdName === 'CGPlayCommand') {
				let layer: CF.ITemplateLayer = this.ensureLayer(channel, layerNo) as CF.ITemplateLayer
				layer.playing = true
				layer.templateFcn = 'play'
				layer.templateData = null

				layer.noClear = command._objectParams['noClear'] as boolean
			} else if (cmdName === 'CGStopCommand') {
				let layer: CF.IEmptyLayer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer
				layer.content = CasparCG.LayerContentType.NOTHING
				layer.playing = false
				layer.media = null
			} else if (cmdName === 'CGInvokeCommand') {
				let layer: CF.ITemplateLayer = this.ensureLayer(channel, layerNo) as CF.ITemplateLayer
				if (command._objectParams['method']) {
					layer.templateFcn = 'invoke'
					layer.templateData = { method: command._objectParams['method'] }
				}
			} else if (cmdName === 'CGRemoveCommand' || cmdName === 'CGClearCommand') {
				// note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
				let layer: CF.IEmptyLayer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer
				// todo: what's the difference between this and StopCommand?
				layer.playing = false
				layer.content = CasparCG.LayerContentType.NOTHING
				layer.media = null
				// layer.playTime = 0;
				layer.pauseTime = 0
				layer.templateData = null
			} else if (cmdName === 'PlayDecklinkCommand') {

				let layer: CF.IInputLayer = this.ensureLayer(channel, layerNo) as CF.IInputLayer

				layer.content = CasparCG.LayerContentType.INPUT

				layer.media = 'decklink'

				layer.input = {
					device: command._objectParams['device'] as number,
					format: command._objectParams['format'] as string
				}

				layer.playing = true
				layer.playTime = null // playtime is irrelevant

				layer.noClear = command._objectParams['noClear'] as boolean

			} else if (cmdName === 'MixerAnchorCommand') {
				setMixerState(channel, command,'anchor',['x','y'])

			} else if (cmdName === 'MixerBlendCommand') {
				setMixerState(channel, command,'blend','blend')

			} else if (cmdName === 'MixerBrightnessCommand') {
				setMixerState(channel, command,'brightness','brightness')

			} else if (cmdName === 'MixerChromaCommand') {
				setMixerState(channel, command,'chroma',['keyer', 'threshold', 'softness', 'spill'])

			} else if (cmdName === 'MixerClipCommand') {
				setMixerState(channel, command,'clip',['x','y','width','height'])

			} else if (cmdName === 'MixerContrastCommand') {
				setMixerState(channel, command,'contrast','contrast')

			} else if (cmdName === 'MixerCropCommand') {
				setMixerState(channel, command,'crop',['left','top','right','bottom'])

			} else if (cmdName === 'MixerFillCommand') {
				setMixerState(channel, command,'fill',['x','y','xScale','yScale'])

			// grid
			} else if (cmdName === 'MixerKeyerCommand') {
				setMixerState(channel, command,'keyer','keyer')

			} else if (cmdName === 'MixerLevelsCommand') {
				setMixerState(channel, command,'levels',['minInput', 'maxInput', 'gamma', 'minOutput', 'maxOutput'])

			} else if (cmdName === 'MixerMastervolumeCommand') {
				setMixerState(channel, command,'mastervolume','mastervolume')

			// mipmap
			} else if (cmdName === 'MixerOpacityCommand') {
				setMixerState(channel, command,'opacity','opacity')

			} else if (cmdName === 'MixerPerspectiveCommand') {
				setMixerState(channel, command,'perspective',['topLeftX','topLeftY','topRightX','topRightY','bottomRightX','bottomRightY','bottomLeftX','bottomLeftY'])

			} else if (cmdName === 'MixerRotationCommand') {
				setMixerState(channel, command,'rotation','rotation')

			} else if (cmdName === 'MixerSaturationCommand') {
				setMixerState(channel, command,'saturation','saturation')

			} else if (cmdName === 'MixerStraightAlphaOutputCommand') {
				setMixerState(channel, command,'straightAlpha','state')

			} else if (cmdName === 'MixerVolumeCommand') {
				setMixerState(channel, command,'volume','volume')

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
			} else if (cmdName === 'CustomCommand') {
				// specials/temporary workaraounds:

				let customCommand: any = command._objectParams['customCommand']
				if (customCommand === 'route') {

					let layer: CF.IRouteLayer = this.ensureLayer(channel, layerNo) as CF.IRouteLayer

					layer.content = CasparCG.LayerContentType.ROUTE
					layer.media = 'route'

					let routeChannel: any 	= command._objectParams['routeChannel']

					let routeLayer: any 		= command._objectParams['routeLayer']

					layer.route = {
						channel: 	parseInt(routeChannel, 10),
						layer: 		(routeLayer ? parseInt(routeLayer, 10) : null)
					}

					layer.playing = true
					layer.playTime = null // playtime is irrelevant
				} else if (customCommand === 'add file') {

					let layer: CF.IRecordLayer = this.ensureLayer(channel, layerNo) as CF.IRecordLayer

					layer.content 	= CasparCG.LayerContentType.RECORD

					layer.media 			= String(command._objectParams['media'])
					layer.encoderOptions 	= String(command._objectParams['encoderOptions'] || '')

					layer.playing 	= true
					layer.playTime 	= Number(command._objectParams['playTime'])
				} else if (customCommand === 'remove file') {

					let layer: CF.IEmptyLayer = this.ensureLayer(channel, layerNo) as CF.IEmptyLayer

					layer.playing = false
					layer.content = CasparCG.LayerContentType.NOTHING
					layer.media = null
					delete layer.encoderOptions
					// layer.playTime = 0;
					layer.pauseTime = 0
					layer.templateData = null
				}
			} else if (cmdName === 'executeFunction') {

				let layer: CF.IFunctionLayer = this.ensureLayer(channel, layerNo) as CF.IFunctionLayer

				if (command['returnValue'] !== true) {

					// save state:
					layer.content = CasparCG.LayerContentType.FUNCTION
					layer.media = command['media']
				}

			}
		})

	}

	/** */
	applyState (channelNo: number, layerNo: number, stateData: {[key: string]: any}): void {

		// TODO: what to do with this?

		/*let channel: CF.Channel = _.findWhere(this.getState().channels, {channelNo: channelNo});
		let layer: CF.Layer = _.findWhere(channel.layers, {layerNo: layerNo});
		_.extend(layer, stateData);*/
	}
	/** */
	getDiff (
		newState: CasparCG.State): Array<{cmds: Array<IAMCPCommandVO>, additionalLayerState?: CF.Layer}> {
		// needs to be initialised
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}

		let currentState = this._currentStateStorage.fetchState()
		return this.diffStates(currentState, newState)
	}

	/** */
	public diffStates (
		oldState: CF.State,
		newState: CasparCG.State
	): Array<{
		cmds: Array<IAMCPCommandVO>,
		additionalLayerState?: CF.Layer
	}> {

		// needs to be initialised
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}

		let commands: Array<{cmds: Array<IAMCPCommandVO>, additionalLayerState?: CF.Layer}> = []
		let time: number = this._currentTimeFunction()

		let setTransition = (options: Object | null, channel: CasparCG.Channel, oldLayer: CasparCG.ILayerBase, content: any) => {
			if (!options) options = {}

			if (_.isObject(content)) {

				let transition: Transition | undefined

				if (oldLayer.playing && content.changeTransition) {
					transition = new Transition(content.changeTransition)
				} else if (content.inTransition) {
					transition = new Transition(content.inTransition)
				}

				if (transition) {
					options['transition'] 			= transition.type
					options['transitionDuration'] 	= Math.round(transition.duration * (channel.fps || 50))
					options['transitionEasing'] 	= transition.easing
					options['transitionDirection'] 	= transition.direction
				}
			}

			return options
		}

		// ==============================================================================
		let setDefaultValue = (obj: object | Array<object>, key: string | Array<string>, value) => {
			if (_.isArray(obj)) {
				_.each(obj, (o) => {
					setDefaultValue(o, key, value)
				})
			} else {

				if (_.isArray(key)) {
					_.each(key, (k) => {
						setDefaultValue(obj, k, value)
					})
				} else {
					if (!obj[key]) obj[key] = value
				}
			}

		}

		let bundledCmds: {[bundleGroup: string]: any} = {}

		// Added/updated things:
		_.each(newState.channels, (newChannel: CasparCG.Channel, channelKey) => {
			let oldChannel: CF.Channel = oldState.channels[channelKey + ''] || (new CF.Channel())

 			_.each(newChannel.layers,(newLayer: CasparCG.ILayerBase, layerKey) => {

				let oldLayer: CF.Layer = oldChannel.layers[layerKey + ''] || (new CF.Layer())

				if (newLayer) {

					/*
					console.log('newLayer '+channelKey+'-'+layerKey);
					console.log(newLayer)
					console.log('old layer');
					console.log(oldLayer)
					*/

					let cmd
					let additionalCmds: Array<any> = []

					let diff = this.compareAttrs(newLayer,oldLayer,['content'])

					if (!diff) {
						if (newLayer.content === CasparCG.LayerContentType.MEDIA) {

							let nl: CasparCG.IMediaLayer = newLayer as CasparCG.IMediaLayer
							let ol: CF.IMediaLayer = oldLayer as CF.IMediaLayer

							setDefaultValue([nl, ol], ['seek', 'pauseTime'], 0)
							setDefaultValue([nl, ol], ['looping', 'playing'], false)

							diff = this.compareAttrs(nl, ol ,['media','playTie','looping','seek','pauseTime','playing'])

						} else if (newLayer.content === CasparCG.LayerContentType.TEMPLATE) {
							let nl: CasparCG.ITemplateLayer = newLayer as CasparCG.ITemplateLayer
							let ol: CF.ITemplateLayer = oldLayer as CF.ITemplateLayer

							setDefaultValue([nl, ol], ['templateType'], '')

							diff = this.compareAttrs(nl, ol ,['media','templateType'])

						} else if (newLayer.content === CasparCG.LayerContentType.INPUT) {
							let nl: CasparCG.IInputLayer = newLayer as CasparCG.IInputLayer
							let ol: CF.IInputLayer = oldLayer as CF.IInputLayer

							diff = this.compareAttrs(nl, ol ,['media'])

							setDefaultValue([nl.input, ol.input], ['device','format'], '')

							if (!diff) diff = this.compareAttrs(nl.input, ol.input,['device','format'])

						} else if (newLayer.content === CasparCG.LayerContentType.ROUTE) {
							let nl: CasparCG.IRouteLayer = newLayer as CasparCG.IRouteLayer
							let ol: CF.IRouteLayer = oldLayer as CF.IRouteLayer

							setDefaultValue([nl.route, ol.route], ['channel','layer'], 0)

							diff = this.compareAttrs(nl.route, ol.route,['channel','layer'])

						} else if (newLayer.content === CasparCG.LayerContentType.RECORD) {
							let nl: CasparCG.IRecordLayer = newLayer as CasparCG.IRecordLayer
							let ol: CF.IRecordLayer = oldLayer as CF.IRecordLayer

							setDefaultValue([nl, ol], ['encoderOptions'], '')

							diff = this.compareAttrs(nl, ol, ['media','playTime','encoderOptions'])

						} else if (newLayer.content === CasparCG.LayerContentType.FUNCTION) {
							let nl: CasparCG.IFunctionLayer = newLayer as CasparCG.IFunctionLayer
							let ol: CF.IFunctionLayer = oldLayer as CF.IFunctionLayer

							diff = this.compareAttrs(nl, ol, ['media'])
						}
					}
					if (diff) {
						// Added things:
						this.log('ADD: ' + newLayer.content + ' | ' + diff)

						let options = {
							channel: newChannel.channelNo,
							layer: newLayer.layerNo,
							noClear: !!newLayer.noClear
						}

						setTransition(options, newChannel, oldLayer, newLayer.media)

						if (newLayer.content === CasparCG.LayerContentType.MEDIA && newLayer.media !== null) {

							let nl: CasparCG.IMediaLayer = newLayer as CasparCG.IMediaLayer
							let ol: CF.IMediaLayer = oldLayer as CF.IMediaLayer

							let getTimeSincePlay = (layer: CasparCG.IMediaLayer) => {
								let timeSincePlay: number | null = (layer.pauseTime || time) - (layer.playTime || 0)
								if (timeSincePlay < this.minTimeSincePlay) {
									timeSincePlay = 0
								}
								if (layer.looping) {
									// we don't support looping and seeking at the same time right now..
									timeSincePlay = 0
								}

								if (_.isNull(layer.playTime)) { // null indicates the start time is not relevant, like for a LOGICAL object, or an image
									timeSincePlay = null
								}
								return timeSincePlay
							}
							let getSeek = function (layer: CF.IMediaLayer, timeSincePlay: number | null) {
								return Math.max(0,Math.floor(
									(
										(timeSincePlay || 0)
										+
										(layer.seek || 0)
									)
									* (newChannel.fps || oldChannel.fps)
								))
							}

							let timeSincePlay = getTimeSincePlay(nl)
							let seek = getSeek(nl, timeSincePlay)

							if (nl.playing) {

								nl.pauseTime = 0

								let oldTimeSincePlay = getTimeSincePlay(ol)
								let oldSeek = getSeek(ol, oldTimeSincePlay)
								if (
									!this.compareAttrs(nl, ol ,['media']) &&
									ol.pauseTime &&
									Math.abs(oldSeek - seek) < this.minTimeSincePlay

								) {

									cmd = new AMCP.PlayCommand(options)
								} else {
									cmd = new AMCP.PlayCommand(_.extend(options,{
										clip: (nl.media || '').toString(),
										seek: seek,
										loop: !!nl.looping
									}))
								}

							} else {
								if (
									(
										(nl.pauseTime && (time - nl.pauseTime) < this.minTimeSincePlay) ||
										_.isNull(timeSincePlay)
									) &&
									!this.compareAttrs(nl, ol ,['media'])
								) {
									cmd = new AMCP.PauseCommand(_.extend(options, {
										pauseTime: nl.pauseTime
									}))
								} else {
									cmd = new AMCP.LoadCommand(_.extend(options,{
										clip: (nl.media || '').toString(),
										seek: seek,
										loop: !!nl.looping,

										pauseTime: nl.pauseTime
									}))

								}
							}
						} else if (newLayer.content === CasparCG.LayerContentType.TEMPLATE && newLayer.media !== null) {

							let nl: CasparCG.ITemplateLayer = newLayer as CasparCG.ITemplateLayer
							// let ol: CF.ITemplateLayer = oldLayer as CF.ITemplateLayer

							cmd = new AMCP.CGAddCommand(_.extend(options,{
								templateName: 	(nl.media || '').toString(),
								flashLayer: 	1,
								playOnLoad:		nl.playing,
								data: 			nl.templateData || undefined,

								cgStop: 		nl.cgStop,
								templateType: 	nl.templateType
							}))
						} else if (newLayer.content === CasparCG.LayerContentType.INPUT && newLayer.media !== null) {
							let nl: CasparCG.IInputLayer = newLayer as CasparCG.IInputLayer
							// let ol: CF.IInputLayer = oldLayer as CF.IInputLayer

							let inputType: string 			= (nl.input && nl.media && (nl.media || '').toString()) || 'decklink'
							let device: number | null 		= (nl.input && nl.input.device)
							let format: string | null 		= (nl.input && nl.input.format) || null
							let channelLayout: string | null 	= (nl.input && nl.input.channelLayout) || null

							if (inputType === 'decklink') {

								_.extend(options,{
									device: 		device,
									format: 		format,
									channelLayout: channelLayout
								})

								cmd = new AMCP.PlayDecklinkCommand(options)
							}
						} else if (newLayer.content === CasparCG.LayerContentType.ROUTE) {
							let nl: CasparCG.IRouteLayer = newLayer as CasparCG.IRouteLayer
							// let ol: CF.IRouteLayer = oldLayer as CF.IRouteLayer

							if (nl.route) {
								let routeChannel: number 	= nl.route.channel
								let routeLayer: number | null	= nl.route.layer

								_.extend(options,{
									routeChannel: 		routeChannel,
									routeLayer: 		routeLayer,

									command: (
										'PLAY ' + options.channel + '-' + options.layer +
										' route://' +
											routeChannel +
											(routeLayer ? '-' + routeLayer : '') +
										(
											options['transition']
											? (' ' + options['transition'] + ' ' + options['transitionDuration'] + ' ' + options['transitionEasing'])
											: ''
										)
									),
									customCommand: 'route'
								})

								cmd = new AMCP.CustomCommand(options)
							}
						} else if (newLayer.content === CasparCG.LayerContentType.RECORD && newLayer.media !== null) {
							let nl: CasparCG.IRecordLayer = newLayer as CasparCG.IRecordLayer
							// let ol: CF.IRecordLayer = oldLayer as CF.IRecordLayer

							let media: any 			= nl.media
							let encoderOptions: any = nl.encoderOptions || ''
							let playTime: any 		= nl.playTime

							_.extend(options, {

								media: 				media, // file name
								encoderOptions: 	encoderOptions,
								playTime: 			playTime,

								command: (
									'ADD ' + options.channel + ' FILE ' + media + ' ' + encoderOptions
								),

								customCommand: 'add file'

							})

							cmd = new AMCP.CustomCommand(options)

						} else if (newLayer.content === CasparCG.LayerContentType.FUNCTION) {
							let nl: CasparCG.IFunctionLayer = newLayer as CasparCG.IFunctionLayer
							// let ol: CF.IFunctionLayer = oldLayer as CF.IFunctionLayer
							if (nl.media && nl.executeFcn) {
								cmd = {
									channel: options.channel,
									layer: options.layer,
									_commandName: 'executeFunction',
									media: nl.media, // used for diffing
									externalFunction: true

								}

								if (nl.executeFcn === 'special_osc') {
									cmd = _.extend(cmd, {
										specialFunction: 'osc',
										oscDevice: nl.oscDevice,
										message: nl.inMessage
									})
								} else {

									cmd = _.extend(cmd, {
										functionName: nl.executeFcn,
										functionData: nl.executeData,
										functionLayer: nl
									})
								}
							}

						} else {
							if (oldLayer.content === CasparCG.LayerContentType.MEDIA) { // || oldLayer.content === CasparCG.LayerContentType.MEDIA ???
								cmd = new AMCP.StopCommand(options)
							}
						}
					} else if (newLayer.content === CasparCG.LayerContentType.TEMPLATE) {

						let nl: CasparCG.ITemplateLayer = newLayer as CasparCG.ITemplateLayer
						let ol: CF.ITemplateLayer = oldLayer as CF.ITemplateLayer

						diff = this.compareAttrs(nl, ol, ['templateData'])

						if (diff) {

							// Updated things:

							this.log('UPDATE: ' + nl.content + ' ' + diff)

							let options: any = {}
							options.channel = newChannel.channelNo
							options.layer = nl.layerNo

							if (nl.content === CasparCG.LayerContentType.TEMPLATE) {

								cmd = new AMCP.CGUpdateCommand(_.extend(options,{
									flashLayer: 1,
									data: nl.templateData || undefined
								}))
							}
						}

					}
					// -------------------------------------------------------------
					// Mixer commands:
					if (!newLayer.mixer) newLayer.mixer = new Mixer()
					if (!oldLayer.mixer) oldLayer.mixer = new Mixer()

					let compareMixerValues = function (
						layer: CasparCG.ILayerBase,
						oldLayer: CF.Layer,
						attr: string,
						attrs?: Array<string>
					): boolean {
						let val0: any = Mixer.getValue((layer.mixer || {})[attr])
						let val1: any = Mixer.getValue((oldLayer.mixer || {})[attr])

						if (attrs) {
							let areSame = true

							if (val0 && val1) {
								_.each(attrs,function (a) {
									if (val0[a] !== val1[a]) areSame = false
								})
							} else {
								if (
									(val0 && !val1)
									||
									(!val0 && val1)
								) {
									areSame = false
								}
							}
							return areSame
						} else if (_.isObject(val0) || _.isObject(val1)) {
							if (_.isObject(val0) && _.isObject(val1)) {
								let omitAttrs = ['inTransition','changeTransition','outTransition']

								return _.isEqual(
									_.omit(val0,omitAttrs),
									_.omit(val1,omitAttrs)
								)
							} else return false
						} else {
							return (val0 === val1)
						}
					}

					let pushMixerCommand = function (attr: string, Command: any, subValue?: Array<string> | string) {

						/*if (attr == 'fill') {
							console.log('pushMixerCommand '+attr);
							console.log(oldLayer.mixer)
							console.log(layer.mixer)
							console.log(subValue)
						}*/

						if (!compareMixerValues(
								newLayer,
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
							console.log(newLayer.mixer)
							console.log(Mixer.getValue(newLayer.mixer[attr]));
							*/

							let options: any = {}
							options.channel = newChannel.channelNo
							options.layer 	= newLayer.layerNo

							setTransition(options, newChannel, oldLayer, newLayer.mixer)

							let o = Mixer.getValue((newLayer.mixer || {})[attr])

							if (newLayer.mixer && _.has(newLayer.mixer,attr) && !_.isUndefined(o)) {

								if (_.isArray(subValue)) {
									_.each(subValue,(sv) => {
										options[sv] = o[sv]
									})
								} else if (_.isString(subValue)) {
									if (_.isObject(o)) {
										options[subValue] = o._value
									} else {
										options[subValue] = o
									}
								}

								if (newLayer.mixer.bundleWithCommands) {

									options['bundleWithCommands'] = newLayer.mixer.bundleWithCommands
									let key = newLayer.mixer.bundleWithCommands + ''
									if (!bundledCmds[key]) bundledCmds[key] = []

									options['defer'] = true

									bundledCmds[key].push(new Command(options))

								} else {
									additionalCmds.push(new Command(options))
								}

							} else {
								// @todo: implement
								// reset this mixer?
								// temporary workaround, default values

								let defaultValue: any = Mixer.getDefaultValues(attr)
								if (_.isObject(defaultValue)) {
									_.extend(options,defaultValue)
								} else {
									options[attr] = defaultValue
								}

								options._defaultOptions = true	// this is used in ApplyCommands to set state to "default"

								additionalCmds.push(new Command(options))
							}
						}
					}

					pushMixerCommand('anchor',AMCP.MixerAnchorCommand,['x','y'])
					pushMixerCommand('blend',AMCP.MixerBlendCommand,'blend')
					pushMixerCommand('brightness',AMCP.MixerBrightnessCommand,'brightness')
					pushMixerCommand('chroma',AMCP.MixerChromaCommand, ['keyer', 'threshold', 'softness', 'spill'])
					pushMixerCommand('clip',AMCP.MixerClipCommand,['x','y','width','height'])
					pushMixerCommand('contrast',AMCP.MixerContrastCommand,'contrast')
					pushMixerCommand('crop',AMCP.MixerCropCommand,['left','top','right','bottom'])
					pushMixerCommand('fill',AMCP.MixerFillCommand,['x','y','xScale','yScale'])
						// grid
					pushMixerCommand('keyer',AMCP.MixerKeyerCommand,'keyer')
					pushMixerCommand('levels',AMCP.MixerLevelsCommand,['minInput', 'maxInput', 'gamma', 'minOutput', 'maxOutput'])
					pushMixerCommand('mastervolume',AMCP.MixerMastervolumeCommand,'mastervolume')
						// mipmap
					pushMixerCommand('opacity',AMCP.MixerOpacityCommand,'opacity')
					pushMixerCommand('perspective',AMCP.MixerPerspectiveCommand, ['topLeftX','topLeftY','topRightX','topRightY','bottomRightX','bottomRightY','bottomLeftX','bottomLeftY'])
					pushMixerCommand('rotation',AMCP.MixerRotationCommand,'rotation')
					pushMixerCommand('saturation',AMCP.MixerSaturationCommand,'saturation')
					pushMixerCommand('straightAlpha',AMCP.MixerStraightAlphaOutputCommand,'state')
					pushMixerCommand('volume',AMCP.MixerVolumeCommand,'volume')

					let cmds: Array<any> = []
					if (cmd) {
						if (cmd['serialize']) {
							cmds.push(cmd['serialize']())
						} else {
							cmds.push(cmd)
						}
					}

					_.each(additionalCmds, (addCmd: any) => {
						cmds.push(addCmd.serialize())
					})

					commands.push({ cmds: cmds, additionalLayerState: newLayer })

				}
			})
		})
		// ==============================================================================
		// Removed things:

		_.each(oldState.channels, (oldChannel,channelKey) => {
			let newChannel = newState.channels[channelKey] || (new CF.Channel())

			_.each(oldChannel.layers,(oldLayer,layerKey) => {

				let newLayer: CasparCG.ILayerBase = newChannel.layers[layerKey + ''] || (new CasparCG.ILayerBase())
				if (newLayer) {

					if (!newLayer.content && oldLayer.content) {

						// this.log('REMOVE ' + channelKey + '-' + layerKey + ': ' + oldLayer.content)

						if (oldLayer.noClear) {
							// hack: don't do the clear command:
							this.log('NOCLEAR is set!')
						} else {
							let noCommand = false
							let cmd: CommandNS.IAMCPCommand | null = null

							if (oldLayer.content === CasparCG.LayerContentType.RECORD) {

								cmd = new AMCP.CustomCommand({
									layer: oldLayer.layerNo,
									channel: oldChannel.channelNo,

									command: (
										'REMOVE ' + oldChannel.channelNo + ' FILE'
									),

									customCommand: 'remove file'

								})
							}

							if (typeof oldLayer.media === 'object' && oldLayer.media !== null) {
								if (oldLayer.media.outTransition) {
									cmd = new AMCP.PlayCommand({
										channel: oldChannel.channelNo,
										layer: oldLayer.layerNo,
										clip: 'empty',
										transition: oldLayer.media.outTransition.type,
										transitionDuration: Math.round(+(oldLayer.media.outTransition.duration) * oldChannel.fps),
										transitionEasing: oldLayer.media.outTransition.easing,
										transitionDirection: oldLayer.media.outTransition.direction
									})
								}
							}

							if (!cmd) {
								if (oldLayer.content === CasparCG.LayerContentType.TEMPLATE) {
									let ol: CF.ITemplateLayer = oldLayer as CF.ITemplateLayer

									if (ol.cgStop) {
										cmd = new AMCP.CGStopCommand({
											channel: oldChannel.channelNo,
											layer: oldLayer.layerNo,
											flashLayer: 1
										})

									}
								}
							}
							if (!cmd) {
								if (oldLayer.content === CasparCG.LayerContentType.FUNCTION) {
									// send nothing
									noCommand = true
								}
							}
							if (!noCommand) {
								if (!cmd) {

									// ClearCommand:
									cmd = new AMCP.ClearCommand({
										channel: oldChannel.channelNo,
										layer: oldLayer.layerNo
									})

								}

								if (cmd) {
									commands.push({
										cmds: [
											cmd.serialize()
										]
									})
								}
							}
						}
					}
				}
			})

		})

		// bundled commands:
		_.each(bundledCmds, (bundle: any) => {

			let channels = _.uniq(_.pluck(bundle,'channel'))

			_.each(channels,(channel) => {

				bundle.push(new AMCP.MixerCommitCommand({
					channel: Number(channel)
				}))
			})

			let cmds: any = []

			_.each(bundle, (cmd: any) => {
				cmds.push(cmd.serialize())
			})

			commands.push({ cmds: cmds })
		})

		return commands
	}

	valueOf (): CF.State {
		return this.getState({ full: true })
	}
	toString (): string {
		return JSON.stringify(this.getState({ full: true }))
	}

	/** */
	public get isInitialised (): boolean {
		return this._isInitialised
	}

	/** */
	public set isInitialised (initialised: boolean) {
		if (this._isInitialised !== initialised) {
			this._isInitialised = initialised
			if (this._isInitialised) {
				this.applyCommands(this.bufferedCommands)
				this.bufferedCommands = []
			}
		}
	}

	private log (arg0?: any,arg1?: any,arg2?: any,arg3?: any): void {
		if (this._externalLog) {
			this._externalLog(arg0,arg1,arg2,arg3)
		} else {
			console.log(arg0,arg1,arg2,arg3)
		}
	}
	/** */
	private ensureLayer (channel: CF.Channel, layerNo: number): CF.Layer {
		if (! (layerNo > 0)) {
			throw new Error("State.ensureLayer: tried to get layer '" + layerNo + "' on channel '" + channel + "'")
		}
		let layer: CF.Layer = channel.layers[layerNo + '']
		if (!layer) {
			layer = new CF.Layer()
			layer.layerNo = layerNo
			channel.layers[layer.layerNo + ''] = layer

		}
		return layer

	}

	private compareAttrs (obj0: any, obj1: any, attrs: Array<string>, strict?: boolean): null | string {
		let difference: null | string = null

		let diff0 = ''
		let diff1 = ''

		let getValue: any = function (val: any) {
			return Mixer.getValue(val)
		}
		let cmp = (a: any, b: any, name: any) => {

			if (name === 'playTime') {
				return Math.abs(a - b) > this.minTimeSincePlay
			} else {
				return a !== b
			}
		}
		if (obj0 && obj1) {
			if (strict) {
				_.each(attrs,(a: string) => {
					if (obj0[a].valueOf() !== obj1[a].valueOf()) {
						diff0 = obj0[a].valueOf() + ''
						diff1 = obj1[a].valueOf() + ''

						if (diff0 && diff0.length > 20) diff0 = diff0.slice(0,20) + '...'
						if (diff1 && diff1.length > 20) diff1 = diff1.slice(0,20) + '...'

						difference = a + ': ' + diff0 + '!==' + diff1
					}
				})
			} else {
				_.each(attrs,(a: string) => {

					if (cmp(getValue(obj0[a]), getValue(obj1[a]), a)) {
						diff0 = getValue(obj0[a]) + ''
						diff1 = getValue(obj1[a]) + ''

						if (diff0 && diff0.length > 20) diff0 = diff0.slice(0,20) + '...'
						if (diff1 && diff1.length > 20) diff1 = diff1.slice(0,20) + '...'

						difference = a + ': ' + diff0 + '!=' + diff1
					}
				})
			}
		} else {
			if (
				(obj0 && !obj1)
				||
				(!obj0 && obj1)
			) difference = '' + (!!obj0) + ' t/f ' + (!!obj1)
		}
		return difference
	}
}
