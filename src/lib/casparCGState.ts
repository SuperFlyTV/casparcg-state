import * as _ from 'underscore'
const clone = require('fast-clone')
import { Command as CommandNS, AMCP } from 'casparcg-connection'

import { Mixer } from './mixer'
import { Transition, TransitionObject } from './transitionObject'
import {
	StateObjectStorage,
	InternalLayer,
	InternalState,
	InternalChannel
} from './stateObjectStorage'
import {
	ChannelInfo,
	IMediaLayer,
	LayerContentType,
	IEmptyLayer,
	IHtmlPageLayer,
	IInputLayer,
	ITemplateLayer,
	IRouteLayer,
	IRecordLayer,
	IFunctionLayer,
	State,
	Channel,
	ILayerBase,
	NextUp,
	NextUpMedia
} from './api'

const CasparCGStateVersion = '2017-11-06 19:15'

const DEFAULT_FPS = 50

interface OptionsInterface {
	channel: number
	layer: number
	noClear: boolean
	transition?: any
	transitionDuration?: any
	transitionEasing?: any
}

export interface IAMCPCommandVOWithContext extends CommandNS.IAMCPCommandVO {
	context: {
		context: string;
		/** The id of the layer the command originates from */
		layerId: string;
	}
}
export interface IAMCPCommandWithContext extends CommandNS.IAMCPCommand {
	context: {
		context: string;
		/** The id of the layer the command originates from */
		layerId: string;
	}
}
export interface DiffCommands {
	cmds: Array<IAMCPCommandVOWithContext>
	additionalLayerState?: InternalLayer
}
export type DiffCommandGroups = Array<DiffCommands>

// config NS
// import {Config as ConfigNS} from "casparcg-connection";
// import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
// import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;

/** */
export class CasparCGState0 {
	public bufferedCommands: Array<{
		cmd: CommandNS.IAMCPCommandVO;
		additionalLayerState?: InternalLayer;
	}> = []

	public minTimeSincePlay: number = 0.15 // [s]

	protected _currentStateStorage: StateObjectStorage = new StateObjectStorage()

	// private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void
	private _isInitialised: boolean
	private _externalLog?: (...args: Array<any>) => void

	/** */
	constructor (config?: {
		getMediaDurationCallback?: (
			clip: string,
			callback: (duration: number) => void
		) => void;
		externalStorage?: (
			action: string,
			data: Object | null
		) => InternalState;
		externalLog?: (arg0?: any, arg1?: any, arg2?: any, arg3?: any) => void;
	}) {
		// set the callback for handling media duration query
		/* if (config && config.getMediaDurationCallback) {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				if (config.getMediaDurationCallback) {
					config.getMediaDurationCallback!(clip, (duration: number) => {
						this._applyState(channelNo, layerNo, { duration: duration })
					})
				}
			}
		} else {
			this._getMediaDuration = (clip: string, channelNo: number, layerNo: number) => {
				// clip
				this._applyState(channelNo, layerNo, { duration: null })
			}
		} */

		// set the callback for handling externalStorage
		if (config && config.externalStorage) {
			this._currentStateStorage.assignExternalStorage(
				config.externalStorage
			)
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
	initStateFromChannelInfo (
		channels: Array<ChannelInfo>,
		currentTime: number
	) {
		let currentState = this._currentStateStorage.fetchState()
		_.each(channels, (channel: ChannelInfo, i: number) => {
			if (!channel.videoMode) {
				throw Error('State: Missing channel.videoMode!')
			}
			if (!channel.fps) throw Error('State: Missing channel.fps!')

			if (!(_.isNumber(channel.fps) && channel.fps > 0)) {
				throw Error(
					'State:Bad channel.fps, it should be a number > 0 (got ' +
						channel.fps +
						')!'
				)
			}

			let existingChannel: InternalChannel =
				currentState.channels[i + 1 + '']

			if (!existingChannel) {
				existingChannel = {
					channelNo: i + 1,
					videoMode: channel.videoMode,
					fps: channel.fps,
					layers: {}
				}
				currentState.channels[
					existingChannel.channelNo
				] = existingChannel
			}

			existingChannel.videoMode = channel.videoMode
			existingChannel.fps = channel.fps
			existingChannel.layers = {}
		})

		// Save new state:
		this._currentStateStorage.storeState(currentState)
		this.setIsInitialised(true, currentTime)
	}

	/**
	 * Set the current statue to a provided state
	 * @param {State} state The new state
	 */
	setState (state: InternalState): void {
		this._currentStateStorage.storeState(state)
	}
	/**
	 * Get the gurrent state
	 * @param  {true}}   options [description]
	 * @return {InternalState} The current state
	 */
	getState (): InternalState {
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}

		return this._currentStateStorage.fetchState()
	}
	/**
	 * Resets / clears the current state
	 */
	clearState (): void {
		this._currentStateStorage.clearState()
		this.setIsInitialised(false, 0)
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
	 * Applies commands to current state
	 * @param {InternalLayer}>} commands [description]
	 */
	applyCommands (
		commands: Array<{
			cmd: CommandNS.IAMCPCommandVO;
			additionalLayerState?: InternalLayer;
		}>,
		currentTime: number
	): void {
		// buffer commands until we are initialised
		if (!this.isInitialised) {
			this.bufferedCommands = this.bufferedCommands.concat(commands)
			return
		}

		let currentState = this._currentStateStorage.fetchState()

		// Applies commands to target state
		this.applyCommandsToState(currentState, commands, currentTime)

		console.log('currentState', currentState)

		// Save new state:
		this._currentStateStorage.storeState(currentState)
	}
	/**
	 * Iterates over commands and applies new state to provided state object
	 * @param {any}     currentState
	 * @param {InternalLayer}>} commands
	 */
	applyCommandsToState (
		currentState: any,
		commands: Array<{
			cmd: CommandNS.IAMCPCommandVO;
			additionalLayerState?: InternalLayer;
		}>,
		currentTime: number
	): void {
		let setMixerState = (
			channel: InternalChannel,
			command: CommandNS.IAMCPCommandVO,
			/* TODO: attr should probably be an enum or something */
			attr: string,
			subValue: Array<string> | string
		) => {
			let layer = this.ensureLayer(channel, command.layer)

			if (!layer.mixer) layer.mixer = new Mixer()

			// console.log('setMixerState '+attr);
			// console.log(subValue);
			// console.log(command)

			if ((command._objectParams || {})['_defaultOptions']) {
				// the command sent, contains "default parameters"
				delete layer.mixer[attr]
			} else {
				if (_.isArray(subValue)) {
					let o: any = {}
					_.each(subValue, (sv) => {
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
			let command: CommandNS.IAMCPCommandVO = i.cmd

			let channelNo: number =
				((command._objectParams || {})['channel'] as number) ||
				command.channel
			let layerNo: number =
				((command._objectParams || {})['layer'] as number) ||
				command.layer

			let channel: InternalChannel | undefined =
				currentState.channels[channelNo + '']
			// let layer: Layer | undefined
			if (!channel) {
				// Create new empty channel:
				channel = {
					channelNo: channelNo,
					videoMode: '',
					fps: DEFAULT_FPS,
					layers: {}
				}
				currentState.channels[channel.channelNo + ''] = channel
			}

			let cmdName = command._commandName

			if (
				cmdName === 'PlayCommand' ||
				cmdName === 'LoadCommand' ||
				cmdName === 'ResumeCommand'
			) {
				let layer: IMediaLayer = this.ensureLayer(
					channel,
					layerNo
				) as IMediaLayer

				let seek: number = command._objectParams['seek'] as number

				let playDeltaTime = (seek || 0) / channel.fps

				if (
					command._objectParams['clip'] ||
					(cmdName === 'PlayCommand' && layer.nextUp)
				) {
					layer.content = LayerContentType.MEDIA
					layer.playing =
						cmdName === 'PlayCommand' ||
						cmdName === 'ResumeCommand'

					if (
						!command._objectParams['clip'] &&
						layer.nextUp &&
						layer.nextUp.content === LayerContentType.MEDIA
					) {
						layer.media = layer.nextUp.media
					} else {
						layer.media = new TransitionObject(
							command._objectParams['clip'] as string
						)
						if (command._objectParams.transition) {
							layer.media.inTransition = new Transition().fromCommand(
								command,
								channel.fps
							)
						}
					}

					layer.inPoint =
						command._objectParams['in'] !== undefined
							? this.frames2Time(
									command._objectParams['in'] as number,
									channel
							  )
							: undefined
					layer.length =
						command._objectParams['length'] !== undefined
							? this.frames2Time(
									command._objectParams['length'] as number,
									channel
							  )
							: undefined

					layer.looping = !!command._objectParams['loop']
					layer.channelLayout = command._objectParams[
						'channelLayout'
					] as string

					if (i.additionalLayerState) {
						layer.playTime = i.additionalLayerState.playTime || 0
					} else {
						layer.playTime = currentTime - playDeltaTime
					}

					layer.pauseTime =
						Number(command._objectParams['pauseTime']) || 0

					// this._getMediaDuration((layer.media || '').toString(), channel.channelNo, layer.layerNo)
				} else {
					if (
						(cmdName === 'PlayCommand' ||
							cmdName === 'ResumeCommand') &&
						layer.content === LayerContentType.MEDIA &&
						layer.media &&
						layer.pauseTime &&
						layer.playTime
					) {
						// resuming a paused clip
						layer.playing = true

						let playedTime = layer.pauseTime - layer.playTime
						layer.playTime = currentTime - playedTime // "move" the clip to new start time

						layer.pauseTime = 0
					}
				}

				// TODO: The change below has slight functional changes, but it does prevent crashes.
				const media: any =
					i.additionalLayerState &&
					((i.additionalLayerState as any) || {}).media
				if (media && typeof media !== 'string') {
					_.extend(layer.media, {
						outTransition: media.outTransition
					})
				}

				layer.noClear = command._objectParams['noClear'] as boolean
			} else if (cmdName === 'PauseCommand') {
				let layer: IMediaLayer = this.ensureLayer(
					channel,
					layerNo
				) as IMediaLayer
				layer.playing = false
				layer.pauseTime =
					Number(command._objectParams['pauseTime']) || currentTime
			} else if (cmdName === 'ClearCommand') {
				let layer: IEmptyLayer
				if (layerNo > 0) {
					layer = this.ensureLayer(channel, layerNo) as IEmptyLayer
					delete layer.nextUp
				} else {
					channel.layers = {}
				}
				layer = this.ensureLayer(channel, layerNo) as IEmptyLayer
				layer.playing = false
				layer.content = LayerContentType.NOTHING
				// layer.media = null
				layer.playTime = 0
			} else if (cmdName === 'StopCommand') {
				let layer = this.ensureLayer(channel, layerNo) as IEmptyLayer
				layer.playing = false
				layer.content = LayerContentType.NOTHING
				// layer.media = null
				layer.playTime = 0
				// layer.pauseTime = 0
			} else if (cmdName === 'LoadbgCommand') {
				console.log('LoadbgCommand------------')
				console.log(command)
				let layer: IMediaLayer = this.ensureLayer(
					channel,
					layerNo
				) as IMediaLayer

				if (command._objectParams['clip']) {
					if (command._objectParams['clip'] === 'EMPTY') {
						delete layer.nextUp
					} else {
						const media = new TransitionObject(
							command._objectParams['clip'] as string
						)
						if (command._objectParams['transition']) {
							media.inTransition = new Transition().fromCommand(
								command,
								channel.fps
							)
						}
						layer.nextUp = {
							content: LayerContentType.MEDIA,
							id: '',
							media: media,
							inPoint:
								command._objectParams['in'] !== undefined
									? this.frames2Time(
											command._objectParams[
												'in'
											] as number,
											channel
									  )
									: undefined,
							length:
								command._objectParams['length'] !== undefined
									? this.frames2Time(
											command._objectParams[
												'length'
											] as number,
											channel
									  )
									: undefined,

							looping: !!command._objectParams['loop']
						}
					}
				}
				console.log('layer', layer)
			} else if (cmdName === 'LoadHtmlPageBgCommand') {
				let layer: IHtmlPageLayer = this.ensureLayer(
					channel,
					layerNo
				) as IHtmlPageLayer
				if (command._objectParams['url']) {
					layer.nextUp = {
						content: LayerContentType.HTMLPAGE,
						id: '',

						media: new TransitionObject(
							command._objectParams['url'] as string
						),
						playing: true
					}
				}
			} else if (cmdName === 'LoadDecklinkBgCommand') {
				let layer: IInputLayer = this.ensureLayer(
					channel,
					layerNo
				) as IInputLayer

				if (command._objectParams['device']) {
					layer.nextUp = {
						content: LayerContentType.INPUT,
						id: '',

						media: new TransitionObject('decklink'),
						input: {
							device: Number(command._objectParams['device']),
							format: command._objectParams['format'] + '',
							channelLayout:
								command._objectParams['channelLayout'] + ''
						},
						playing: true
					}
				}
			} else if (cmdName === 'CGAddCommand') {
				let layer: ITemplateLayer = this.ensureLayer(
					channel,
					layerNo
				) as ITemplateLayer

				// Note: we don't support flashLayer for the moment
				if (command._objectParams['templateName']) {
					layer.content = LayerContentType.TEMPLATE

					layer.media = command._objectParams[
						'templateName'
					] as string

					layer.cgStop = !!command._objectParams['cgStop']
					layer.templateType = command._objectParams[
						'templateType'
					] as 'flash' | 'html'

					// layer.playTime = this._currentTimeFunction();

					if (command._objectParams['playOnLoad']) {
						layer.playing = true
						layer.templateFcn = 'play'
						layer.templateData =
							command._objectParams['data'] || null
					} else {
						layer.playing = false
						// todo: is data sent to template here also?
						layer.templateFcn = ''
						layer.templateData = null
					}

					layer.noClear = command._objectParams['noClear'] as boolean
				}
			} else if (cmdName === 'PlayHtmlPageCommand') {
				let layer: IHtmlPageLayer = this.ensureLayer(
					channel,
					layerNo
				) as IHtmlPageLayer
				layer.content = LayerContentType.HTMLPAGE
				layer.media = command._objectParams['url'] as string
			} else if (cmdName === 'CGUpdateCommand') {
				let layer: ITemplateLayer = this.ensureLayer(
					channel,
					layerNo
				) as ITemplateLayer
				if (layer.content === LayerContentType.TEMPLATE) {
					layer.templateFcn = 'update'
					layer.templateData = command._objectParams['data'] || null
				}
			} else if (cmdName === 'CGPlayCommand') {
				let layer: ITemplateLayer = this.ensureLayer(
					channel,
					layerNo
				) as ITemplateLayer
				layer.playing = true
				layer.templateFcn = 'play'
				layer.templateData = null

				layer.noClear = command._objectParams['noClear'] as boolean
			} else if (cmdName === 'CGStopCommand') {
				let layer: IEmptyLayer = this.ensureLayer(
					channel,
					layerNo
				) as IEmptyLayer
				layer.content = LayerContentType.NOTHING
				layer.playing = false
				// layer.media = null
			} else if (cmdName === 'CGInvokeCommand') {
				let layer: ITemplateLayer = this.ensureLayer(
					channel,
					layerNo
				) as ITemplateLayer
				if (command._objectParams['method']) {
					layer.templateFcn = 'invoke'
					layer.templateData = {
						method: command._objectParams['method']
					}
				}
			} else if (
				cmdName === 'CGRemoveCommand' ||
				cmdName === 'CGClearCommand'
			) {
				// note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
				let layer: IEmptyLayer = this.ensureLayer(
					channel,
					layerNo
				) as IEmptyLayer
				// todo: what's the difference between this and StopCommand?
				layer.playing = false
				layer.content = LayerContentType.NOTHING
				// layer.media = null
				// layer.playTime = 0;
				// layer.pauseTime = 0
				// layer.templateData = null
			} else if (cmdName === 'PlayDecklinkCommand') {
				let layer: IInputLayer = this.ensureLayer(
					channel,
					layerNo
				) as IInputLayer

				layer.content = LayerContentType.INPUT

				// layer.media = 'decklink'
				layer.media = new TransitionObject('decklink')
				if (command._objectParams['transition']) {
					layer.media.inTransition = new Transition().fromCommand(
						command,
						channel.fps
					)
				}

				// TODO: The change below has functional changes, but prevents crashes.
				const media =
					i.additionalLayerState &&
					((i.additionalLayerState as any) || {}).media
				if (media && typeof media !== 'string') {
					_.extend(layer.media, {
						outTransition: media.outTransition
					})
				}

				layer.input = {
					device: command._objectParams['device'] as number,
					format: command._objectParams['format'] as string
				}

				layer.playing = true
				layer.playTime = null // playtime is irrelevant

				layer.noClear = command._objectParams['noClear'] as boolean
			} else if (cmdName === 'PlayRouteCommand') {
				let layer: IRouteLayer = this.ensureLayer(
					channel,
					layerNo
				) as IRouteLayer

				layer.content = LayerContentType.ROUTE

				// layer.media = 'route'
				layer.media = new TransitionObject('route')
				if (command._objectParams.transition) {
					layer.media.inTransition = new Transition().fromCommand(
						command,
						channel.fps
					)
				}

				// TODO: The change below has functional changes, but prevents crashes.
				// @ts-ignore
				if (
					i.additionalLayerState &&
					i.additionalLayerState.media &&
					typeof i.additionalLayerState.media !== 'string'
				) {
					// @ts-ignore
					_.extend(layer.media, {
						outTransition:
							i.additionalLayerState.media.outTransition
					})
				}

				let routeChannel: any = command._objectParams.routeChannel

				let routeLayer: any = command._objectParams.routeLayer

				layer.route = {
					channel: parseInt(routeChannel, 10),
					layer: routeLayer ? parseInt(routeLayer, 10) : null
				}

				layer.mode = command._objectParams.mode as
					| 'BACKGROUND'
					| 'NEXT'
					| undefined
				layer.delay = command._objectParams.framesDelay
					? this.frames2Time(
							command._objectParams.framesDelay as number,
							channel
					  ) * 1000
					: undefined

				layer.playing = true
				layer.playTime = null // playtime is irrelevant
			} else if (cmdName === 'LoadRouteBgCommand') {
				let layer: IRouteLayer = this.ensureLayer(
					channel,
					layerNo
				) as IRouteLayer
				const media = new TransitionObject('route')
				if (command._objectParams.transition) {
					media.inTransition = new Transition().fromCommand(
						command,
						channel.fps
					)
				}
				layer.nextUp = {
					content: LayerContentType.ROUTE,
					id: '',
					media: media,
					playing: true
				}

				let routeChannel: string = ''
				let routeLayer: string = ''
				if (command._objectParams.route) {
					const route = command._objectParams.route as any
					routeChannel = route.channel
					routeLayer = route.layer
				}

				layer.nextUp.route = {
					channel: parseInt(routeChannel, 10),
					layer: routeLayer ? parseInt(routeLayer, 10) : null
				}

				layer.nextUp.delay = command._objectParams.framesDelay
					? this.frames2Time(
							command._objectParams.framesDelay as number,
							channel
					  )
					: undefined
				layer.mode = command._objectParams.mode as
					| 'BACKGROUND'
					| 'NEXT'
					| undefined
			} else if (cmdName === 'MixerAnchorCommand') {
				setMixerState(channel, command, 'anchor', ['x', 'y'])
			} else if (cmdName === 'MixerBlendCommand') {
				setMixerState(channel, command, 'blendmode', 'blendmode')
			} else if (cmdName === 'MixerBrightnessCommand') {
				setMixerState(channel, command, 'brightness', 'brightness')
			} else if (cmdName === 'MixerChromaCommand') {
				setMixerState(channel, command, 'chroma', [
					'keyer',
					'threshold',
					'softness',
					'spill'
				])
			} else if (cmdName === 'MixerClipCommand') {
				setMixerState(channel, command, 'clip', [
					'x',
					'y',
					'width',
					'height'
				])
			} else if (cmdName === 'MixerContrastCommand') {
				setMixerState(channel, command, 'contrast', 'contrast')
			} else if (cmdName === 'MixerCropCommand') {
				setMixerState(channel, command, 'crop', [
					'left',
					'top',
					'right',
					'bottom'
				])
			} else if (cmdName === 'MixerFillCommand') {
				setMixerState(channel, command, 'fill', [
					'x',
					'y',
					'xScale',
					'yScale'
				])
				// grid
			} else if (cmdName === 'MixerKeyerCommand') {
				setMixerState(channel, command, 'keyer', 'keyer')
			} else if (cmdName === 'MixerLevelsCommand') {
				setMixerState(channel, command, 'levels', [
					'minInput',
					'maxInput',
					'gamma',
					'minOutput',
					'maxOutput'
				])
			} else if (cmdName === 'MixerMastervolumeCommand') {
				setMixerState(channel, command, 'mastervolume', 'mastervolume')
				// mipmap
			} else if (cmdName === 'MixerOpacityCommand') {
				setMixerState(channel, command, 'opacity', 'opacity')
			} else if (cmdName === 'MixerPerspectiveCommand') {
				setMixerState(channel, command, 'perspective', [
					'topLeftX',
					'topLeftY',
					'topRightX',
					'topRightY',
					'bottomRightX',
					'bottomRightY',
					'bottomLeftX',
					'bottomLeftY'
				])
			} else if (cmdName === 'MixerRotationCommand') {
				setMixerState(channel, command, 'rotation', 'rotation')
			} else if (cmdName === 'MixerSaturationCommand') {
				setMixerState(channel, command, 'saturation', 'saturation')
			} else if (cmdName === 'MixerStraightAlphaOutputCommand') {
				setMixerState(
					channel,
					command,
					'straightAlpha',
					'straight_alpha_output'
				)
			} else if (cmdName === 'MixerVolumeCommand') {
				setMixerState(channel, command, 'volume', 'volume')
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
				if (customCommand === 'add file') {
					let layer: IRecordLayer = this.ensureLayer(
						channel,
						layerNo
					) as IRecordLayer

					layer.content = LayerContentType.RECORD

					layer.media = String(command._objectParams.media)
					layer.encoderOptions = String(
						command._objectParams.encoderOptions || ''
					)

					layer.playing = true
					layer.playTime = Number(command._objectParams.playTime)
				} else if (customCommand === 'remove file') {
					let layer: IEmptyLayer = this.ensureLayer(
						channel,
						layerNo
					) as IEmptyLayer

					layer.playing = false
					layer.content = LayerContentType.NOTHING
					// @ts-ignore
					delete layer.media
					// @ts-ignore
					delete layer.encoderOptions
					// @ts-ignore
					delete layer.pauseTime
					// @ts-ignore
					delete layer.templateData
				}
			} else if (cmdName === 'executeFunction') {
				let layer: IFunctionLayer = this.ensureLayer(
					channel,
					layerNo
				) as IFunctionLayer

				// @ts-ignore special hack:
				if (command.returnValue !== true) {
					// save state:
					layer.content = LayerContentType.FUNCTION
					// @ts-ignore special: nl.media used for diffing
					layer.media = command.media
				}
			}
		})

		// console.log('after applyCommandsToState', currentState.channels['1'])
		// console.log(commands)
		// console.log(commands[0])
	}
	getDiff (newState: State, currentTime: number): DiffCommandGroups {
		// needs to be initialised
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}
		let currentState = this._currentStateStorage.fetchState()
		return this.diffStates(currentState, newState, currentTime)
	}

	/**
	 * Temporary, intermediate function, to deal with ordering of commands. (This might be replaced with something more permanent later)
	 * @param oldState
	 * @param newState
	 */
	public diffStatesOrderedCommands (
		oldState: InternalState,
		newState: State,
		currentTime: number
	): Array<IAMCPCommandVOWithContext> {
		const diff = this.diffStates(oldState, newState, currentTime)
		const fastCommands: Array<IAMCPCommandVOWithContext> = [] // fast to exec, and direct visual impact: PLAY 1-10
		const slowCommands: Array<IAMCPCommandVOWithContext> = [] // slow to exec, but direct visual impact: PLAY 1-10 FILE (needs to have all commands for that layer in the right order)
		const lowPrioCommands: Array<IAMCPCommandVOWithContext> = [] // slow to exec, and no direct visual impact: LOADBG 1-10 FILE

		for (const layer of diff) {
			let containsSlowCommand = false

			// filter out lowPrioCommands
			for (let i = 0; i < layer.cmds.length; i++) {
				if (
					layer.cmds[i]._commandName === 'LoadbgCommand' ||
					layer.cmds[i]._commandName === 'LoadDecklinkBgCommand' ||
					layer.cmds[i]._commandName === 'LoadRouteBgCommand' ||
					layer.cmds[i]._commandName === 'LoadHtmlPageBgCommand'
				) {
					lowPrioCommands.push(layer.cmds[i])
					layer.cmds.splice(i, 1)
					i-- // next entry now has the same index as this one.
				} else if (
					(layer.cmds[i]._commandName === 'PlayCommand' &&
						layer.cmds[i]._objectParams.clip) ||
					(layer.cmds[i]._commandName === 'PlayDecklinkCommand' &&
						layer.cmds[i]._objectParams.device) ||
					(layer.cmds[i]._commandName === 'PlayRouteCommand' &&
						layer.cmds[i]._objectParams.route) ||
					(layer.cmds[i]._commandName === 'PlayHtmlPageCommand' &&
						layer.cmds[i]._objectParams.url) ||
					layer.cmds[i]._commandName === 'LoadCommand' ||
					layer.cmds[i]._commandName === 'LoadDecklinkCommand' ||
					layer.cmds[i]._commandName === 'LoadRouteCommand' ||
					layer.cmds[i]._commandName === 'LoadHtmlPageCommand'
				) {
					containsSlowCommand = true
				}
			}

			if (containsSlowCommand) {
				slowCommands.push(...layer.cmds)
			} else {
				fastCommands.push(...layer.cmds)
			}
		}

		return [...fastCommands, ...slowCommands, ...lowPrioCommands]
	}

	/** */
	public diffStates (
		oldState: InternalState,
		newState: State,
		currentTime: number
	): DiffCommandGroups {
		// console.log('diffStates')
		// console.log('newState', newState)
		// console.log('oldState', oldState)
		// needs to be initialised
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}

		let commands: DiffCommandGroups = []

		let setTransition = (
			options: any | null,
			channel: Channel,
			oldLayer: ILayerBase,
			content: any,
			isRemove: boolean,
			isBg?: boolean
		) => {
			if (!options) options = {}
			const comesFromBG = (transitionObj: TransitionObject) => {
				if (oldLayer.nextUp && _.isObject(oldLayer.nextUp.media)) {
					let t0 = new Transition(transitionObj)
					let t1 = new Transition(
						(oldLayer.nextUp.media as TransitionObject).inTransition
					)
					return t0.getString() === t1.getString()
				}
				return false
			}

			if (_.isObject(content)) {
				let transition: Transition | undefined

				if (isRemove) {
					if (content.outTransition) {
						transition = new Transition(content.outTransition)
					}
				} else {
					if (oldLayer.playing && content.changeTransition) {
						transition = new Transition(content.changeTransition)
					} else if (
						content.inTransition &&
						(isBg || !comesFromBG(content.inTransition))
					) {
						transition = new Transition(content.inTransition)
					}
				}

				if (transition) {
					_.extend(options, transition.getOptions(channel.fps))
				}
			}

			return options
		}

		// ==============================================================================
		let setDefaultValue = (
			obj: any | Array<any>,
			key: string | Array<string>,
			value: any
		) => {
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

		let bundledCmds: {
			[bundleGroup: string]: Array<IAMCPCommandWithContext>;
		} = {}

		// Added/updated things:
		_.each(newState.channels, (newChannel: Channel, channelKey) => {
			let oldChannel: InternalChannel = oldState.channels[
				channelKey + ''
			] || { channelNo: newChannel.channelNo, layers: {} }

			_.each(newChannel.layers, (newLayer: ILayerBase, layerKey) => {
				let oldLayer: InternalLayer = oldChannel.layers[
					layerKey + ''
				] || {
					content: LayerContentType.NOTHING,
					id: '',
					layerNo: newLayer.layerNo
				}

				if (newLayer) {
					// this.log('diff ' + channelKey + '-' + layerKey, newLayer, oldLayer)

					// console.log('newLayer ' + channelKey + '-' + layerKey)
					// console.log(newLayer)
					// console.log('old layer')
					// console.log(oldLayer)

					let cmd:
						| IAMCPCommandWithContext
						| IAMCPCommandVOWithContext
						| undefined
					let additionalCmds: Array<IAMCPCommandWithContext> = []

					let diff = this.compareAttrs(newLayer, oldLayer, [
						'content'
					])

					if (!diff) {
						if (newLayer.content === LayerContentType.MEDIA) {
							let nl: IMediaLayer = newLayer as IMediaLayer
							let ol: IMediaLayer = oldLayer as IMediaLayer

							setDefaultValue(
								[nl, ol],
								['seek', 'length', 'inPoint', 'pauseTime'],
								0
							)
							setDefaultValue(
								[nl, ol],
								['looping', 'playing'],
								false
							)
							diff = this.compareAttrs(nl, ol, [
								'media',
								'playTime',
								'looping',
								'seek',
								'length',
								'inPoint',
								'pauseTime',
								'playing',
								'channelLayout'
							])
						} else if (
							newLayer.content === LayerContentType.TEMPLATE
						) {
							let nl: ITemplateLayer = newLayer as ITemplateLayer
							let ol: ITemplateLayer = oldLayer as ITemplateLayer

							setDefaultValue([nl, ol], ['templateType'], '')

							diff = this.compareAttrs(nl, ol, [
								'media',
								'templateType'
							])
						} else if (
							newLayer.content === LayerContentType.HTMLPAGE
						) {
							let nl: IHtmlPageLayer = newLayer as IHtmlPageLayer
							let ol: IHtmlPageLayer = oldLayer as IHtmlPageLayer

							setDefaultValue([nl, ol], ['media'], '')

							diff = this.compareAttrs(nl, ol, ['media'])
						} else if (
							newLayer.content === LayerContentType.INPUT
						) {
							let nl: IInputLayer = newLayer as IInputLayer
							let ol: IInputLayer = oldLayer as IInputLayer

							diff = this.compareAttrs(nl, ol, ['media'])

							setDefaultValue(
								[nl.input, ol.input],
								['device', 'format', 'channelLayout'],
								''
							)

							if (!diff) {
								diff = this.compareAttrs(nl.input, ol.input, [
									'device',
									'format'
								])
							}
						} else if (
							newLayer.content === LayerContentType.ROUTE
						) {
							let nl: IRouteLayer = newLayer as IRouteLayer
							let ol: IRouteLayer = oldLayer as IRouteLayer

							setDefaultValue(
								[nl.route, ol.route],
								['channel', 'layer'],
								0
							)

							diff = this.compareAttrs(nl.route, ol.route, [
								'channel',
								'layer',
								'channelLayout'
							])
							if (!diff) {
								diff = this.compareAttrs(nl, ol, ['delay'])
							}
						} else if (
							newLayer.content === LayerContentType.RECORD
						) {
							let nl: IRecordLayer = newLayer as IRecordLayer
							let ol: IRecordLayer = oldLayer as IRecordLayer

							setDefaultValue([nl, ol], ['encoderOptions'], '')

							diff = this.compareAttrs(nl, ol, [
								'media',
								'playTime',
								'encoderOptions'
							])
						} else if (
							newLayer.content === LayerContentType.FUNCTION
						) {
							let nl: IFunctionLayer = newLayer as IFunctionLayer
							let ol: IFunctionLayer = oldLayer as IFunctionLayer

							diff = this.compareAttrs(nl, ol, ['media'])
						}
					}
					if (diff) {
						// Added things:
						this.log(
							'ADD: ' +
								newChannel.channelNo +
								'-' +
								newLayer.layerNo +
								' ' +
								newLayer.content +
								' | ' +
								diff
						)

						let options: OptionsInterface = {
							channel: newChannel.channelNo,
							layer: newLayer.layerNo,
							noClear: !!newLayer.noClear
						}

						setTransition(
							options,
							newChannel,
							oldLayer,
							newLayer.media,
							false
						)

						if (
							newLayer.content === LayerContentType.MEDIA &&
							newLayer.media
						) {
							let nl: IMediaLayer = newLayer as IMediaLayer
							let ol: IMediaLayer = oldLayer as IMediaLayer

							let timeSincePlay = this.getTimeSincePlay(
								nl,
								currentTime
							)

							let diffMediaFromBg = this.compareAttrs(
								nl,
								ol.nextUp,
								['media']
							)
							if (options.transition) {
								diffMediaFromBg = 'transition'
							} // transition changed, so we need to reset

							const oldUseLayer: IMediaLayer | NextUp =
								ol.nextUp && !diffMediaFromBg // current media is the one in background
									? ol.nextUp
									: ol

							let oldTimeSincePlay =
								ol.nextUp && !diffMediaFromBg
									? 0
									: this.getTimeSincePlay(ol, currentTime)

							const {
								inPointFrames,
								lengthFrames,
								seekFrames,
								looping,
								channelLayout
							} = this.calculatePlayAttributes(
								timeSincePlay,
								nl,
								newChannel,
								oldChannel
							)

							const {
								inPointFrames: oldInPointFrames,
								lengthFrames: oldLengthFrames,
								seekFrames: oldSeekFrames,
								looping: oldLooping,
								channelLayout: oldChannelLayout
							} = this.calculatePlayAttributes(
								oldTimeSincePlay,
								oldUseLayer,
								newChannel,
								oldChannel
							)

							if (nl.playing) {
								nl.pauseTime = 0

								// let oldSeek = this.calculateSeek(newChannel, oldChannel, ol, oldTimeSincePlay)
								const newMedia = this.compareAttrs(nl, ol, [
									'media'
								])
								const seekDiff = this.frames2Time(
									Math.abs(oldSeekFrames - seekFrames),
									newChannel,
									oldChannel
								)
								const seekIsSmall: boolean =
									seekDiff < this.minTimeSincePlay

								if (!newMedia && ol.pauseTime && seekIsSmall) {
									// cmd = new AMCP.ResumeCommand(options as any)
									cmd = this.addContext(
										new AMCP.ResumeCommand(options as any),
										`Seek is small (${seekDiff})`,
										nl
									)
								} else {
									let context: string = ''
									if (newMedia && diffMediaFromBg) {
										context = `Media diff from bg: ${newMedia} (${diffMediaFromBg})`
									}
									if (
										(inPointFrames || 0) !==
										(oldInPointFrames || 0)
									) {
										context = `Inpoints diff (${inPointFrames}, ${oldInPointFrames})`
									} // temporary, until CALL IN command works satisfactory in CasparCG
									if (
										(lengthFrames || 0) !==
										(oldLengthFrames || 0)
									) {
										context = `Length diff (${lengthFrames}, ${lengthFrames})`
									} // temporary, until CALL LENGTH command works satisfactory in CasparCG
									if (!seekIsSmall) {
										context = `Seek diff is large (${seekDiff})`
									}
									if (looping !== oldLooping) {
										context = `Looping diff (${looping}, ${oldLooping})`
									} // temporary, until CALL LOOP works satisfactory in CasparCG
									if (channelLayout !== oldChannelLayout) {
										context = `ChannelLayout diff (${channelLayout}, ${oldChannelLayout})`
									} // temporary, until CallCommand with channelLayout is implemented in ccg-conn (& casparcg?)
									if (context) {
										context += ` (${diff})`
										// console.log('oldTimeSincePlay', oldTimeSincePlay)
										// console.log('ol', ol)
										// console.log('oldUseLayer', oldUseLayer)
										// console.log('nl', nl)

										// console.log('(newMedia && diffMediaFromBg)', (newMedia && diffMediaFromBg))
										// console.log('inPoint !== oldInPoint', inPoint !== oldInPoint, inPoint, oldInPoint)
										// console.log('length !== oldLength', length !== oldLength, length, oldLength)
										// console.log('!seekIsSmall', !seekIsSmall, oldSeek, seek)
										// console.log('looping !== oldLooping', looping !== oldLooping, looping ,oldLooping)
										// console.log('channelLayout !== oldChannelLayout', channelLayout !== oldChannelLayout, channelLayout, oldChannelLayout)

										cmd = this.addContext(
											new AMCP.PlayCommand(
												this.fixPlayCommandInput(
													_.extend(options, {
														clip: (
															nl.media || ''
														).toString(),
														in: inPointFrames,
														seek: seekFrames,
														length:
															lengthFrames ||
															undefined,
														loop: !!nl.looping,
														channelLayout:
															nl.channelLayout,
														clearOn404:
															nl.clearOn404
													})
												)
											),
											context,
											nl
										)
									} else if (!diffMediaFromBg) {
										cmd = this.addContext(
											new AMCP.PlayCommand({
												...options
											}),
											`No Media diff from bg (${nl.media})`,
											nl
										)
									} else {
										cmd = this.addContext(
											new AMCP.ResumeCommand(
												options as any
											),
											`Resume otherwise (${diff})`,
											nl
										)
										if (
											oldSeekFrames !== seekFrames &&
											!nl.looping
										) {
											additionalCmds.push(
												this.addContext(
													new AMCP.CallCommand(
														_.extend(options, {
															seek: seekFrames
														})
													),
													`Seek diff (${seekFrames}, ${oldSeekFrames})`,
													nl
												)
											)
										}
										if (ol.looping !== nl.looping) {
											additionalCmds.push(
												this.addContext(
													new AMCP.CallCommand(
														_.extend(options, {
															loop: !!nl.looping
														})
													),
													`Loop diff (${nl.looping}, ${ol.looping})`,
													nl
												)
											)
										}
										if (
											ol.channelLayout !==
											nl.channelLayout
										) {
											additionalCmds.push(
												this.addContext(
													new AMCP.CallCommand(
														_.extend(options, {
															channelLayout: !!nl.channelLayout
														})
													),
													`ChannelLayout diff (${nl.channelLayout}, ${ol.channelLayout})`,
													nl
												)
											)
										}
									}
								}
							} else {
								let context: string = ''
								if (_.isNull(timeSincePlay)) {
									context = `TimeSincePlay is null (${diff})`
								}
								if (
									nl.pauseTime &&
									timeSincePlay! > this.minTimeSincePlay
								) {
									context = `pauseTime is set (${diff})`
								}
								if (
									context &&
									!this.compareAttrs(nl, ol, ['media'])
								) {
									cmd = this.addContext(
										new AMCP.PauseCommand(
											_.extend(options, {
												pauseTime: nl.pauseTime
											})
										),
										context,
										nl
									)
								} else {
									if (diffMediaFromBg) {
										cmd = this.addContext(
											new AMCP.LoadCommand(
												_.extend(options, {
													clip: (
														nl.media || ''
													).toString(),
													seek: seekFrames,
													length:
														lengthFrames ||
														undefined,
													loop: !!nl.looping,

													pauseTime: nl.pauseTime,
													channelLayout:
														nl.channelLayout,
													clearOn404: nl.clearOn404
												})
											),
											`Load / Pause otherwise (${diff})`,
											nl
										)
									} else {
										cmd = this.addContext(
											new AMCP.LoadCommand({
												...options
											}),
											`No Media diff from bg (${nl.media})`,
											nl
										)
									}
								}
							}
						} else if (
							newLayer.content === LayerContentType.TEMPLATE &&
							newLayer.media !== null
						) {
							let nl: ITemplateLayer = newLayer as ITemplateLayer
							// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

							cmd = this.addContext(
								new AMCP.CGAddCommand(
									_.extend(options, {
										templateName: (
											nl.media || ''
										).toString(),
										flashLayer: 1,
										playOnLoad: nl.playing,
										data: nl.templateData || undefined,

										cgStop: nl.cgStop,
										templateType: nl.templateType
									})
								),
								`Add Template (${diff})`,
								nl
							)
						} else if (
							newLayer.content === LayerContentType.HTMLPAGE &&
							newLayer.media !== null
						) {
							let nl: IHtmlPageLayer = newLayer as IHtmlPageLayer
							// let ol: CasparCG.ITemplateLayer = oldLayer as CasparCG.ITemplateLayer

							cmd = this.addContext(
								new AMCP.PlayHtmlPageCommand(
									_.extend(options, {
										url: (nl.media || '').toString()
									})
								),
								`Add HTML page (${diff})`,
								nl
							)
						} else if (
							newLayer.content === LayerContentType.INPUT &&
							newLayer.media !== null
						) {
							let nl: IInputLayer = newLayer as IInputLayer
							// let ol: CasparCG.IInputLayer = oldLayer as CasparCG.IInputLayer

							let inputType: string =
								(nl.input &&
									nl.media &&
									(nl.media || '').toString()) ||
								'decklink'
							let device: number | null =
								nl.input && nl.input.device
							let format: string | null =
								(nl.input && nl.input.format) || null
							let channelLayout: string | null =
								(nl.input && nl.input.channelLayout) || null

							if (inputType === 'decklink') {
								_.extend(options, {
									device: device,
									format: format || undefined,
									filter: nl.filter,
									channelLayout: channelLayout || undefined
								})

								cmd = this.addContext(
									new AMCP.PlayDecklinkCommand(
										options as any
									),
									`Add decklink (${diff})`,
									nl
								)
							}
						} else if (
							newLayer.content === LayerContentType.ROUTE
						) {
							let nl: IRouteLayer = newLayer as IRouteLayer
							let olNext: IRouteLayer = oldLayer.nextUp as any

							if (nl.route) {
								let routeChannel: number = nl.route.channel
								let routeLayer: number | null =
									nl.route.layer || null
								let mode = nl.mode
								let framesDelay: number | undefined = nl.delay
									? Math.floor(
											this.time2Frames(
												nl.delay,
												newChannel,
												oldChannel
											) / 1000
									  )
									: undefined
								let diffMediaFromBg =
									!olNext || !olNext.route
										? true
										: !(
												nl.route.channel ===
													olNext.route.channel &&
												nl.route.layer ===
													olNext.route.layer &&
												nl.delay === olNext.delay
										  )

								if (diffMediaFromBg) {
									_.extend(options, {
										routeChannel: routeChannel,
										routeLayer: routeLayer,

										command:
											'PLAY ' +
											options.channel +
											'-' +
											options.layer +
											' route://' +
											routeChannel +
											(routeLayer
												? '-' + routeLayer
												: '') +
											(mode ? ' ' + mode : '') +
											(framesDelay
												? ' FRAMES_DELAY ' + framesDelay
												: '') +
											(options.transition
												? ' ' +
												  new Transition()
														.fromCommand(
													{
														_objectParams: options
													},
															oldChannel.fps
														)
														.getString(
															oldChannel.fps
														)
												: ''),
										customCommand: 'route'
									})

									// cmd = new AMCP.CustomCommand(options as any)

									cmd = this.addContext(
										new AMCP.PlayRouteCommand(
											_.extend(options, {
												route: nl.route,
												mode,
												channelLayout:
													nl.route.channelLayout,
												framesDelay
											})
										),
										`Route: diffMediaFromBg (${diff})`,
										nl
									)
								} else {
									cmd = this.addContext(
										new AMCP.PlayCommand({ ...options }),
										`Route: no diffMediaFromBg (${diff})`,
										nl
									)
								}
							}
						} else if (
							newLayer.content === LayerContentType.RECORD &&
							newLayer.media !== null
						) {
							let nl: IRecordLayer = newLayer as IRecordLayer
							// let ol: CasparCG.IRecordLayer = oldLayer as CasparCG.IRecordLayer

							let media: any = nl.media
							let encoderOptions: any = nl.encoderOptions || ''
							let playTime: any = nl.playTime

							_.extend(options, {
								media: media, // file name
								encoderOptions: encoderOptions,
								playTime: playTime,

								command:
									'ADD ' +
									options.channel +
									' FILE ' +
									media +
									' ' +
									encoderOptions,

								customCommand: 'add file'
							})

							cmd = this.addContext(
								new AMCP.CustomCommand(options as any),
								`Record (${diff})`,
								nl
							)
						} else if (
							newLayer.content === LayerContentType.FUNCTION
						) {
							let nl: IFunctionLayer = newLayer as IFunctionLayer
							// let ol: CasparCG.IFunctionLayer = oldLayer as CasparCG.IFunctionLayer
							if (nl.media && nl.executeFcn) {
								cmd = {
									channel: options.channel,
									layer: options.layer,
									_commandName: 'executeFunction',
									// @ts-ignore special: nl.media used for diffing
									media: nl.media,
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
								cmd = this.addContext(
									cmd as any,
									`Function (${diff})`,
									nl
								)
							}
						} else {
							// oldLayer had content, newLayer had no content, newLayer has a nextup
							if (
								oldLayer.content === LayerContentType.MEDIA ||
								oldLayer.content === LayerContentType.INPUT ||
								oldLayer.content ===
									LayerContentType.HTMLPAGE ||
								oldLayer.content === LayerContentType.ROUTE
								// || oldLayer.content === CasparCG.LayerContentType.MEDIA ???
							) {
								if (
									_.isObject(oldLayer.media) &&
									(oldLayer.media as TransitionObject)
										.outTransition
								) {
									cmd = this.addContext(
										new AMCP.PlayCommand({
											channel: oldChannel.channelNo,
											layer: oldLayer.layerNo,
											clip: 'empty',
											...new Transition(
												(oldLayer.media as TransitionObject).outTransition
											).getOptions(oldChannel.fps)
										}),
										`No new content, but old outTransition (${newLayer.content})`,
										oldLayer
									)
								} else {
									cmd = this.addContext(
										new AMCP.StopCommand(options as any),
										`No new content (${newLayer.content})`,
										oldLayer
									)
								}
							} else if (
								oldLayer.content === LayerContentType.TEMPLATE
							) {
								let ol = oldLayer as ITemplateLayer
								if (ol.cgStop) {
									cmd = this.addContext(
										new AMCP.CGStopCommand({
											...(options as any),
											flashLayer: 1
										}),
										`No new content, but old cgCgStop (${newLayer.content})`,
										oldLayer
									)
								} else {
									cmd = this.addContext(
										new AMCP.ClearCommand(options as any),
										`No new content (${newLayer.content})`,
										oldLayer
									)
								}
							} else if (
								oldLayer.content === LayerContentType.RECORD
							) {
								cmd = this.addContext(
									new AMCP.CustomCommand({
										layer: oldLayer.layerNo,
										channel: oldChannel.channelNo,
										command:
											'REMOVE ' +
											oldChannel.channelNo +
											' FILE',
										customCommand: 'remove file'
									}),
									`No new content (${newLayer.content})`,
									oldLayer
								)
							}
						}
					} else if (newLayer.content === LayerContentType.TEMPLATE) {
						let nl: ITemplateLayer = newLayer as ITemplateLayer
						let ol: ITemplateLayer = oldLayer as ITemplateLayer

						diff = this.compareAttrs(nl, ol, ['templateData'])

						if (diff) {
							// Updated things:

							this.log(
								'UPDATE: ' +
									newChannel.channelNo +
									'-' +
									nl.layerNo +
									' ' +
									nl.content +
									' ' +
									diff
							)

							let options: any = {}
							options.channel = newChannel.channelNo
							options.layer = nl.layerNo

							if (nl.content === LayerContentType.TEMPLATE) {
								cmd = this.addContext(
									new AMCP.CGUpdateCommand(
										_.extend(options, {
											flashLayer: 1,
											data: nl.templateData || undefined
										})
									),
									`Updated templateData`,
									newLayer
								)
							}
						}
					}
					// ------------------------------------------------------------
					// Background layer:
					// console.log('oldLayer', oldLayer.nextUp)
					// console.log('newLayer', newLayer.nextUp)
					let bgDiff = this.compareAttrs(
						newLayer.nextUp,
						oldLayer.nextUp,
						['content']
					)
					let noClear = false
					if (!bgDiff && newLayer.nextUp) {
						if (
							newLayer.nextUp.content ===
								LayerContentType.MEDIA ||
							newLayer.nextUp.content ===
								LayerContentType.INPUT ||
							newLayer.nextUp.content ===
								LayerContentType.HTMLPAGE ||
							newLayer.nextUp.content === LayerContentType.ROUTE
						) {
							let nl: IMediaLayer = newLayer.nextUp as any
							let ol: IMediaLayer = oldLayer.nextUp as any
							setDefaultValue([nl, ol], ['auto'], false)
							bgDiff = this.compareAttrs(nl, ol, [
								'auto',
								'channelLayout'
							])
						}

						if (
							!bgDiff &&
							newLayer.nextUp.content === LayerContentType.MEDIA
						) {
							let nl: IMediaLayer = newLayer.nextUp as IMediaLayer
							let ol: IMediaLayer = oldLayer.nextUp as IMediaLayer

							setDefaultValue(
								[nl, ol],
								['seek', 'length', 'inPoint'],
								0
							)

							bgDiff = this.compareAttrs(nl, ol, [
								'media',
								'seek',
								'length',
								'inPoint'
							])
						}

						if (
							!bgDiff &&
							newLayer.nextUp &&
							oldLayer.nextUp &&
							(typeof newLayer.nextUp.media !== 'string' ||
								typeof oldLayer.nextUp.media !== 'string')
						) {
							let nMedia = newLayer.nextUp.media
							let oMedia = oldLayer.nextUp.media

							bgDiff = this.compareAttrs(nMedia, oMedia, [
								'inTransition',
								'outTransition',
								'changeTransition'
							])
						}

						if (
							!bgDiff &&
							newLayer.nextUp &&
							'route' in newLayer.nextUp &&
							oldLayer.nextUp &&
							'route' in oldLayer.nextUp
						) {
							let nRoute = newLayer.nextUp.route
							let oRoute = oldLayer.nextUp.route

							bgDiff = this.compareAttrs(nRoute, oRoute, [
								'channel',
								'layer'
							])

							if (bgDiff) noClear = true
						}

						// @todo: should this be a flag set during the generation of the commands for the foreground layer? /Balte
						const fgNotChanged = new Set([
							'PauseCommand',
							'ResumeCommand',
							'CallCommand',
							'StopCommand'
						])
						if (
							!bgDiff &&
							newLayer.nextUp &&
							diff &&
							cmd &&
							!fgNotChanged.has(cmd.name)
						) {
							bgDiff = 'Foreground Layer Changed'
						}
					}
					if (bgDiff) {
						let options: OptionsInterface = {
							channel: newChannel.channelNo,
							layer: newLayer.layerNo,
							noClear: !!newLayer.noClear
						}
						if (newLayer.nextUp) {
							this.log(
								'ADD BG ' +
									newChannel.channelNo +
									'-' +
									newLayer.layerNo,
								newLayer.nextUp.content
							)

							console.log('bgDiff', bgDiff)
							console.log(newLayer.nextUp, oldLayer.nextUp)

							// make sure the layer is empty before trying to load something new
							// this prevents weird behaviour when files don't load correctly
							if (
								oldLayer.nextUp &&
								!(oldLayer.nextUp as IMediaLayer).clearOn404 &&
								!noClear
							) {
								additionalCmds.push(
									this.addContext(
										new AMCP.LoadbgCommand({
											channel: newChannel.channelNo,
											layer: newLayer.layerNo,
											clip: 'EMPTY'
										}),
										`Old nextUp was set, clear it first (${oldLayer.nextUp.media})`,
										newLayer
									)
								)
							}

							setTransition(
								options,
								newChannel,
								newLayer,
								newLayer.nextUp.media,
								false,
								true
							)

							if (
								newLayer.nextUp.content ===
								LayerContentType.MEDIA
							) {
								const layer = newLayer.nextUp as IMediaLayer &
									NextUp

								const {
									inPointFrames,
									lengthFrames,
									seekFrames,
									looping,
									channelLayout
								} = this.calculatePlayAttributes(
									0,
									layer,
									newChannel,
									oldChannel
								)

								additionalCmds.push(
									this.addContext(
										new AMCP.LoadbgCommand(
											_.extend(
												options,
												this.fixPlayCommandInput({
													auto: layer.auto,
													clip: (
														newLayer.nextUp.media ||
														''
													).toString(),
													in: inPointFrames,
													seek: seekFrames,
													length:
														lengthFrames ||
														undefined,
													loop: !!looping,
													channelLayout: channelLayout,
													clearOn404:
														layer.clearOn404
												})
											)
										),
										`Nextup media (${newLayer.nextUp.media})`,
										newLayer
									)
								)
							} else if (
								newLayer.nextUp.content ===
								LayerContentType.HTMLPAGE
							) {
								const layer = newLayer.nextUp as IHtmlPageLayer &
									NextUp
								additionalCmds.push(
									this.addContext(
										new AMCP.LoadHtmlPageBgCommand(
											_.extend(options, {
												auto: layer.auto,
												url: (
													newLayer.nextUp.media || ''
												).toString()
											})
										),
										`Nextup HTML (${newLayer.nextUp.media})`,
										newLayer
									)
								)
							} else if (
								newLayer.nextUp.content ===
								LayerContentType.INPUT
							) {
								const layer = newLayer.nextUp as IInputLayer &
									NextUp
								additionalCmds.push(
									this.addContext(
										new AMCP.LoadDecklinkBgCommand(
											_.extend(options, {
												auto: layer.auto,
												device: layer.input.device,
												format: layer.input.format,
												filter: layer.filter,
												channelLayout:
													layer.input.channelLayout
											})
										),
										`Nextup Decklink (${layer.input.device})`,
										newLayer
									)
								)
							} else if (
								newLayer.nextUp.content ===
								LayerContentType.ROUTE
							) {
								const layer = newLayer.nextUp as IRouteLayer &
									NextUp
								additionalCmds.push(
									this.addContext(
										new AMCP.LoadRouteBgCommand(
											_.extend(options, {
												route: layer.route,
												mode: layer.mode,
												channelLayout: layer.route
													? layer.route.channelLayout
													: undefined,
												framesDelay: layer.delay
													? Math.floor(
															this.time2Frames(
																layer.delay,
																newChannel,
																oldChannel
															) / 1000
													  )
													: undefined
											})
										),
										`Nextup Route (${layer.route})`,
										newLayer
									)
								)
							}
						} else if (
							this.compareAttrs(oldLayer.nextUp, newLayer, [
								'media'
							])
						) {
							// this.log('REMOVE BG')
							// console.log('REMOVE BG', oldLayer.nextUp, newLayer)
							// additionalCmds.push(new AMCP.LoadbgCommand({
							// 	channel: newChannel.channelNo,
							// 	layer: newLayer.layerNo,
							// 	clip: 'EMPTY'
							// }))
						}
					}
					// -------------------------------------------------------------
					// Mixer commands:
					if (!newLayer.mixer) newLayer.mixer = new Mixer()
					if (!oldLayer.mixer) oldLayer.mixer = new Mixer()

					let compareMixerValues = (
						layer: ILayerBase,
						oldLayer: InternalLayer,
						attr: string,
						attrs?: Array<string>
					): string | null => {
						let val0: any = Mixer.getValue(
							(layer.mixer || {})[attr]
						)
						let val1: any = Mixer.getValue(
							(oldLayer.mixer || {})[attr]
						)

						if (attrs) {
							let diff: string | null = null

							if (val0 && val1) {
								_.each(attrs, function (a) {
									if (val0[a] !== val1[a]) {
										diff = `${a}: ${val0[a]} != ${val1[a]}`
									}
								})
								return diff
							} else {
								if ((val0 && !val1) || (!val0 && val1)) {
									return `${attr}: ${val0} != ${val1}`
								}
							}
						} else if (_.isObject(val0) || _.isObject(val1)) {
							// @todo is this used anymore?
							if (!_.isObject(val0) && _.isObject(val1)) {
								return `${attr}: val0 is object, but val1 is not`
							} else if (_.isObject(val0) && !_.isObject(val1)) {
								return `${attr}: val1 is object, but val0 is not`
							} else {
								let omitAttrs = [
									'inTransition',
									'changeTransition',
									'outTransition'
								]

								const omit0 = _.omit(val0, omitAttrs)
								const omit1 = _.omit(val1, omitAttrs)
								if (!_.isEqual(omit0, omit1)) {
									return `${attr}: ${val0} != ${val1}`
								}
							}
						} else {
							if (val0 !== val1) {
								return `${attr}: ${val0} !== ${val1}`
							}
						}
						return null
					}

					let pushMixerCommand = (
						attr: string,
						Command: any,
						subValue?: Array<string> | string
					) => {
						let diff = compareMixerValues(
							newLayer,
							oldLayer,
							attr,
							_.isArray(subValue) ? subValue : undefined
						)
						if (diff) {
							this.log(
								'pushMixerCommand change: ' + attr,
								subValue,
								'oldLayer.mixer',
								oldLayer.mixer,
								'newLayer.mixer',
								newLayer.mixer,
								'oldAttr',
								Mixer.getValue((oldLayer.mixer || {})[attr]),
								'newAttr',
								Mixer.getValue((newLayer.mixer || {})[attr])
							)

							// this.log('pushMixerCommand change: ' + attr, subValue)
							// this.log('oldLayer.mixer',oldLayer.mixer)
							// this.log('newLayer.mixer',newLayer.mixer)
							// this.log('oldAttr',Mixer.getValue((oldLayer.mixer || {})[attr]))
							// this.log('newAttr', Mixer.getValue((newLayer.mixer || {})[attr]))

							let options: any = {}
							options.channel = newChannel.channelNo
							if (newLayer.layerNo !== -1) {
								options.layer = newLayer.layerNo
							}

							let o: any = Mixer.getValue(
								(newLayer.mixer || {})[attr]
							)
							if (
								newLayer.mixer &&
								_.has(newLayer.mixer, attr) &&
								!_.isUndefined(o)
							) {
								setTransition(
									options,
									newChannel,
									oldLayer,
									newLayer.mixer,
									false
								)
							} else {
								setTransition(
									options,
									newChannel,
									oldLayer,
									newLayer.mixer,
									true
								)
								o = Mixer.getDefaultValues(attr)
								options._defaultOptions = true // this is used in ApplyCommands to set state to "default", and not use the mixer values
							}
							// this.log('o', o)
							if (_.isArray(subValue)) {
								_.each(subValue, (sv) => {
									options[sv] = o[sv]
								})
							} else if (_.isString(subValue)) {
								if (_.isObject(o) && o._transition) {
									options[subValue] = o._value
								} else {
									options[subValue] = o
								}
							}
							// if (_.isObject(o) && o._spread) {
							// 	_.extend(options,_.omit(o,['_spread']))
							// } else {
							// 	options[attr] = o
							// }

							this.log('options', options)
							if (
								newLayer &&
								newLayer.mixer &&
								newLayer.mixer.bundleWithCommands
							) {
								options['bundleWithCommands'] =
									newLayer.mixer.bundleWithCommands
								let key =
									newLayer.mixer.bundleWithCommands + ''
								if (!bundledCmds[key]) bundledCmds[key] = []

								options['defer'] = true

								bundledCmds[key].push(
									this.addContext(
										new Command(
											options
										) as CommandNS.IAMCPCommand,
										`Bundle: ${diff}`,
										newLayer
									)
								)
							} else {
								additionalCmds.push(
									this.addContext(
										new Command(
											options
										) as CommandNS.IAMCPCommand,
										`Mixer: ${diff}`,
										newLayer || oldLayer
									)
								)
							}
						}
					}

					pushMixerCommand('anchor', AMCP.MixerAnchorCommand, [
						'x',
						'y'
					])
					pushMixerCommand(
						'blendmode',
						AMCP.MixerBlendCommand,
						'blendmode'
					)
					pushMixerCommand(
						'brightness',
						AMCP.MixerBrightnessCommand,
						'brightness'
					)
					pushMixerCommand('chroma', AMCP.MixerChromaCommand, [
						'keyer',
						'threshold',
						'softness',
						'spill'
					])
					pushMixerCommand('clip', AMCP.MixerClipCommand, [
						'x',
						'y',
						'width',
						'height'
					])
					pushMixerCommand(
						'contrast',
						AMCP.MixerContrastCommand,
						'contrast'
					)
					pushMixerCommand('crop', AMCP.MixerCropCommand, [
						'left',
						'top',
						'right',
						'bottom'
					])
					pushMixerCommand('fill', AMCP.MixerFillCommand, [
						'x',
						'y',
						'xScale',
						'yScale'
					])
					// grid
					pushMixerCommand('keyer', AMCP.MixerKeyerCommand, 'keyer')
					pushMixerCommand('levels', AMCP.MixerLevelsCommand, [
						'minInput',
						'maxInput',
						'gamma',
						'minOutput',
						'maxOutput'
					])
					if (newLayer.layerNo === -1) {
						pushMixerCommand(
							'mastervolume',
							AMCP.MixerMastervolumeCommand,
							'mastervolume'
						)
					}
					// mipmap
					pushMixerCommand(
						'opacity',
						AMCP.MixerOpacityCommand,
						'opacity'
					)
					pushMixerCommand(
						'perspective',
						AMCP.MixerPerspectiveCommand,
						[
							'topLeftX',
							'topLeftY',
							'topRightX',
							'topRightY',
							'bottomRightX',
							'bottomRightY',
							'bottomLeftX',
							'bottomLeftY'
						]
					)
					pushMixerCommand(
						'rotation',
						AMCP.MixerRotationCommand,
						'rotation'
					)
					pushMixerCommand(
						'saturation',
						AMCP.MixerSaturationCommand,
						'saturation'
					)
					if (newLayer.layerNo === -1) {
						pushMixerCommand(
							'straightAlpha',
							AMCP.MixerStraightAlphaOutputCommand,
							'straight_alpha_output'
						)
					}
					pushMixerCommand(
						'volume',
						AMCP.MixerVolumeCommand,
						'volume'
					)

					let cmds: Array<IAMCPCommandVOWithContext> = []
					if (cmd) {
						if (this.isIAMCPCommand(cmd)) {
							cmds.push({
								...cmd.serialize(),
								context: cmd.context
							})
						} else {
							cmds.push(cmd)
						}
					}

					_.each(additionalCmds, (addCmd) => {
						cmds.push({
							...addCmd.serialize(),
							context: addCmd.context
						})
					})

					commands.push({
						cmds: cmds,
						additionalLayerState: newLayer
					})
				}
			})
		})
		// ==============================================================================
		// Removed things:

		_.each(oldState.channels, (oldChannel, channelKey) => {
			let newChannel = newState.channels[channelKey] || {
				channelNo: oldChannel.channelNo,
				layers: {}
			}

			_.each(oldChannel.layers, (oldLayer, layerKey) => {
				let newLayer: ILayerBase = newChannel.layers[layerKey + ''] || {
					content: LayerContentType.NOTHING,
					id: '',
					layerNo: oldLayer.layerNo
				}
				if (newLayer) {
					// console.log('oldLayer', oldLayer)
					// console.log('newLayer', newLayer)
					let cmds: IAMCPCommandWithContext[] = []
					if (
						!newLayer.content &&
						oldLayer.content !== LayerContentType.NOTHING
					) {
						this.log(
							'REMOVE ' +
								channelKey +
								'-' +
								layerKey +
								': ' +
								oldLayer.content +
								' | ' +
								newLayer.content
						)
						this.log(oldLayer)

						if (oldLayer.noClear) {
							// hack: don't do the clear command:
							this.log('NOCLEAR is set!')
						} else {
							let noCommand = false
							let cmd: IAMCPCommandWithContext | null = null

							if (oldLayer.content === LayerContentType.RECORD) {
								cmd = this.addContext(
									new AMCP.CustomCommand({
										layer: oldLayer.layerNo,
										channel: oldChannel.channelNo,
										command:
											'REMOVE ' +
											oldChannel.channelNo +
											' FILE',
										customCommand: 'remove file'
									}),
									`Old was recording`,
									oldLayer
								)
							} else if (
								typeof oldLayer.media === 'object' &&
								oldLayer.media !== null
							) {
								if (oldLayer.media.outTransition) {
									cmd = this.addContext(
										new AMCP.PlayCommand({
											channel: oldChannel.channelNo,
											layer: oldLayer.layerNo,
											clip: 'empty',
											...new Transition(
												oldLayer.media.outTransition
											).getOptions(oldChannel.fps)
										}),
										`Old was media and has outTransition`,
										oldLayer
									)
								}
							}

							if (!cmd) {
								if (
									oldLayer.content ===
									LayerContentType.TEMPLATE
								) {
									let ol: ITemplateLayer = oldLayer as ITemplateLayer

									if (ol.cgStop) {
										cmd = this.addContext(
											new AMCP.CGStopCommand({
												channel: oldChannel.channelNo,
												layer: oldLayer.layerNo,
												flashLayer: 1
											}),
											`Old was template and had cgStop`,
											oldLayer
										)
									}
								}
							}
							if (
								oldLayer.content === LayerContentType.FUNCTION
							) {
								// Functions only trigger action when they start, no action on end
								// send nothing
								noCommand = true
							} else if (
								oldLayer.content === LayerContentType.MEDIA &&
								oldLayer.media &&
								oldLayer.media.valueOf() + '' === 'empty'
							) {
								// the old layer is an empty, thats essentially something that is cleared
								// (or an out transition)
								// send nothing then
								noCommand = true
							}

							if (!noCommand) {
								if (!cmd) {
									// ClearCommand:
									cmd = this.addContext(
										new AMCP.ClearCommand({
											channel: oldChannel.channelNo,
											layer: oldLayer.layerNo
										}),
										`Clear old stuff`,
										oldLayer
									)
								}

								if (cmd) {
									cmds.push(cmd)
								}
							}
						}
					}
					if (
						oldLayer.nextUp &&
						!newLayer.nextUp &&
						this.compareAttrs(oldLayer.nextUp, newLayer, ['media'])
					) {
						let prevClearCommand = _.find(cmds, (cmd) => {
							return !!(cmd instanceof AMCP.ClearCommand)
						})
						if (!prevClearCommand) {
							// if ClearCommand is run, it clears bg too
							this.log(
								'REMOVE nextUp ' +
									channelKey +
									'-' +
									layerKey +
									': ' +
									oldLayer.nextUp +
									' | ' +
									newLayer.nextUp
							)
							// console.log('REMOVE nextUp ' + channelKey + '-' + layerKey, oldLayer.nextUp, newLayer.nextUp)
							// console.log('oldLayer', oldLayer)
							// console.log('newLayer', newLayer)

							cmds.push(
								this.addContext(
									new AMCP.LoadbgCommand({
										channel: oldChannel.channelNo,
										layer: oldLayer.layerNo,
										clip: 'EMPTY'
									}),
									`Clear only old nextUp`,
									oldLayer
								)
							)
						}
					}
					if (cmds.length) {
						commands.push({
							cmds: _.map(cmds, (cmd) => {
								return {
									...cmd.serialize(),
									context: cmd.context
								}
							})
						})
					}
				}
			})
		})

		// bundled commands:
		_.each(bundledCmds, (bundle) => {
			let channels = _.uniq(_.pluck(bundle, 'channel'))

			_.each(channels, (channel) => {
				bundle.push(
					this.addContext(
						new AMCP.MixerCommitCommand({
							channel: Number(channel)
						}),
						`Bundle commit`,
						null
					)
				)
			})

			let cmds: IAMCPCommandVOWithContext[] = []

			_.each(bundle, (cmd) => {
				cmds.push({
					...cmd.serialize(),
					context: cmd.context
				})
			})

			commands.push({ cmds: cmds })
		})

		// console.log('commands', commands)

		return commands
	}

	valueOf (): InternalState {
		return this.getState()
	}
	toString (): string {
		return JSON.stringify(this.getState())
	}

	/** */
	public get isInitialised (): boolean {
		return this._isInitialised
	}

	/** */
	public setIsInitialised (initialised: boolean, currentTime: number) {
		if (this._isInitialised !== initialised) {
			this._isInitialised = initialised
			if (this._isInitialised) {
				this.applyCommands(this.bufferedCommands, currentTime)
				this.bufferedCommands = []
			}
		}
	}
	// /**
	//  * Apply attributes to a the state
	//  * @param channelNo Channel number
	//  * @param layerNo Layer number
	//  * @param stateData
	//  */
	// private _applyState (channelNo: number, layerNo: number, stateData: {[key: string]: any}): void {

	// 	let state = this.getState()

	// 	let channel: Channel | undefined = _.find(state.channels, (channel) => {
	// 		return channel.channelNo === channelNo
	// 	})

	// 	if (channel) {
	// 		let layer: Layer | undefined = _.find(channel.layers, (layer) => {
	// 			return layer.layerNo === layerNo
	// 		})
	// 		if (layer) {
	// 			_.extend(layer, stateData)
	// 		}
	// 	}
	// }
	/**   */
	private frames2Time (
		frames: number,
		newChannel: Channel,
		oldChannel?: Channel
	): number {
		return (
			frames / (newChannel.fps || (oldChannel ? oldChannel.fps : 0) || 50)
		)
	}
	private time2Frames (
		frames: number,
		newChannel: Channel,
		oldChannel?: Channel
	): number {
		return Math.floor(
			frames * (newChannel.fps || (oldChannel ? oldChannel.fps : 0) || 0)
		)
	}
	/**
	 * Calculate seek time needed to make the clip to play in sync
	 * Returns seek, in frames
	 */
	private calculateSeek (
		newChannel: Channel,
		oldChannel: Channel,
		layer: IMediaLayer | NextUpMedia,
		timeSincePlay: number | null
	): number {
		if (layer.looping && !layer.length) {
			// if we don't know the length of the loop, we can't seek..
			return 0
		}
		const seekStart: number =
			(layer.seek !== undefined ? layer.seek : layer.inPoint) || 0

		let seekFrames: number = Math.max(
			0,
			this.time2Frames(
				seekStart + (timeSincePlay || 0),
				newChannel,
				oldChannel
			)
		)
		let inPointFrames: number | undefined =
			layer.inPoint !== undefined
				? this.time2Frames(layer.inPoint, newChannel, oldChannel)
				: undefined
		let lengthFrames: number | undefined =
			layer.length !== undefined
				? this.time2Frames(layer.length, newChannel, oldChannel)
				: undefined

		if (layer.looping) {
			let seekSinceInPoint = seekFrames - (inPointFrames || 0)

			if (seekSinceInPoint > 0 && lengthFrames) {
				seekFrames =
					(inPointFrames || 0) + (seekSinceInPoint % lengthFrames)
			}
		}
		return seekFrames
	}
	private calculatePlayAttributes (
		timeSincePlay: number | null,
		nl: IMediaLayer | NextUp,
		newChannel: Channel,
		oldChannel: Channel
	): {
		inPointFrames: number | undefined;
		lengthFrames: number | undefined;
		seekFrames: number;
		looping: boolean;
		channelLayout: string | undefined;
	} {
		let inPointFrames: number | undefined
		let lengthFrames: number | undefined
		let seekFrames: number = 0
		let channelLayout: string | undefined
		let looping: boolean = false

		if (nl.content === LayerContentType.MEDIA) {
			looping = !!nl.looping
			inPointFrames =
				nl.inPoint !== undefined
					? this.time2Frames(nl.inPoint, newChannel, oldChannel)
					: undefined
			lengthFrames =
				nl.length !== undefined
					? this.time2Frames(nl.length, newChannel, oldChannel)
					: undefined
			seekFrames = this.calculateSeek(
				newChannel,
				oldChannel,
				nl,
				timeSincePlay
			)
		}
		if (nl.content === LayerContentType.MEDIA) {
			channelLayout = nl.channelLayout
		}
		if (looping) {
			if (!seekFrames) seekFrames = 0
			if (!inPointFrames) inPointFrames = 0
		} else {
			if (!inPointFrames && !seekFrames) inPointFrames = undefined
		}

		return {
			inPointFrames,
			lengthFrames,
			seekFrames,
			looping,
			channelLayout
		}
	}
	private getTimeSincePlay (layer: IMediaLayer, currentTime: number) {
		let timeSincePlay: number | null =
			layer.playTime === undefined
				? 0
				: (layer.pauseTime || currentTime) - (layer.playTime || 0)
		if (timeSincePlay < this.minTimeSincePlay) {
			timeSincePlay = 0
		}

		if (_.isNull(layer.playTime)) {
			// null indicates the start time is not relevant, like for a LOGICAL object, or an image
			timeSincePlay = null
		}
		return timeSincePlay
	}
	private fixPlayCommandInput<T extends any> (o: T): T {
		const o2: any = {}
		_.each(_.keys(o), (key: string) => {
			const value: any = o[key]
			if (value !== undefined) o2[key] = value
		})
		return o2
	}
	private log (...args: Array<any>): void {
		if (this._externalLog) {
			this._externalLog(...args)
		} else {
			console.log(...args)
		}
	}
	/** */
	private ensureLayer (
		channel: InternalChannel,
		layerNo: number
	): InternalLayer {
		if (!(layerNo > 0 || layerNo === -1)) {
			// -1 is a "spare layer" for non-layer bound things, like master volume
			throw new Error(
				"State.ensureLayer: tried to get layer '" +
					layerNo +
					"' on channel '" +
					channel +
					"'"
			)
		}
		let layer: InternalLayer = channel.layers[layerNo + '']
		if (!layer) {
			layer = {
				layerNo: layerNo,
				id: '',
				content: LayerContentType.NOTHING
			}
			channel.layers[layer.layerNo + ''] = layer
		}
		return layer
	}

	private compareAttrs (
		obj0: any,
		obj1: any,
		attrs: Array<string>,
		strict?: boolean
	): null | string {
		let difference: null | string = null

		let diff0 = ''
		let diff1 = ''

		let getValue: any = function (val: any) {
			if (val && val.getString) return val.getString()
			return Mixer.getValue(val)
		}
		let cmp = (a: any, b: any, name: any) => {
			if (name === 'playTime') {
				return Math.abs(a - b) > this.minTimeSincePlay
			} else {
				return !_.isEqual(a, b)
			}
		}
		if (obj0 && obj1) {
			if (strict) {
				_.each(attrs, (a: string) => {
					if (obj0[a].valueOf() !== obj1[a].valueOf()) {
						diff0 = obj0[a].valueOf() + ''
						diff1 = obj1[a].valueOf() + ''

						if (diff0 && diff0.length > 20) {
							diff0 = diff0.slice(0, 20) + '...'
						}
						if (diff1 && diff1.length > 20) {
							diff1 = diff1.slice(0, 20) + '...'
						}

						difference = a + ': ' + diff0 + '!==' + diff1
					}
				})
			} else {
				_.each(attrs, (a: string) => {
					if (cmp(getValue(obj0[a]), getValue(obj1[a]), a)) {
						diff0 = getValue(obj0[a]) + ''
						diff1 = getValue(obj1[a]) + ''

						if (diff0 && diff0.length > 20) {
							diff0 = diff0.slice(0, 20) + '...'
						}
						if (diff1 && diff1.length > 20) {
							diff1 = diff1.slice(0, 20) + '...'
						}

						difference = a + ': ' + diff0 + '!=' + diff1
					}
				})
			}
		} else {
			if ((obj0 && !obj1) || (!obj0 && obj1)) {
				difference = '' + !!obj0 + ' t/f ' + !!obj1
			}
		}
		return difference
	}
	private addContext<T extends CommandNS.IAMCPCommandVO> (
		cmd: T,
		context: string,
		layer: ILayerBase | null
	): IAMCPCommandVOWithContext
	private addContext<T extends CommandNS.IAMCPCommand> (
		cmd: T,
		context: string,
		layer: ILayerBase | null
	): IAMCPCommandWithContext
	private addContext<
		T extends CommandNS.IAMCPCommandVO & CommandNS.IAMCPCommand
	> (
		cmd: T,
		context: string,
		layer: ILayerBase | null
	): IAMCPCommandVOWithContext & IAMCPCommandWithContext {
		// @ts-ignore
		cmd.context = {
			context,
			layerId: layer ? layer.id : ''
		}
		return cmd as any
	}
	private isIAMCPCommand (cmd: any): cmd is CommandNS.IAMCPCommand {
		return cmd && typeof cmd.serialize === 'function'
	}
}
export class CasparCGState extends CasparCGState0 {
	/**
	 * Set the current state to provided state
	 * @param state The new state
	 */
	setState (state: InternalState): void {
		super.setState(clone(state))
	}
	/**
	 * Get the gurrent state
	 * @param  {true}}   options [description]
	 * @return {InternalState} The current state
	 */
	getState (): InternalState {
		return clone(super.getState())
	}
}
