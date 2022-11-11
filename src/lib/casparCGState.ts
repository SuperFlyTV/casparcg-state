import * as _ from 'underscore'
import {
	AMCPCommand,
	Command,
	Commands,
	PlayCommand,
	PlayDecklinkCommand,
	PlayRouteCommand,
	PlayHtmlCommand,
} from 'casparcg-connection'
// eslint-disable-next-line
const clone = require('fast-clone')

import { StateObjectStorage, InternalLayer, InternalState, InternalChannel } from './stateObjectStorage'
import { ChannelInfo, State } from './api'
import { addContext, addCommands, literal } from './util'
import { resolveEmptyState } from './resolvers/empty'
import { resolveForegroundState } from './resolvers/foreground'
import { resolveBackgroundState } from './resolvers/background'
import { resolveMixerState } from './resolvers/mixer'

const MIN_TIME_SINCE_PLAY = 150 // [ms]
const CasparCGStateVersion = '2017-11-06 19:15'

export interface OptionsInterface {
	channel: number
	layer: number
	transition?: any
	transitionDuration?: any
	transitionEasing?: any
}

export interface AMCPCommandWithContext extends Command<Commands, unknown> {
	context: {
		context: string
		/** The id of the layer the command originates from */
		layerId: string
	}
}
export interface DiffCommands {
	cmds: Array<AMCPCommandWithContext>
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
		cmd: AMCPCommand
		additionalLayerState?: InternalLayer
	}> = []

	public minTimeSincePlay: number = MIN_TIME_SINCE_PLAY // [ms]

	protected _currentStateStorage: StateObjectStorage = new StateObjectStorage()

	// private _getMediaDuration: (clip: string, channelNo: number, layerNo: number) => void
	private _isInitialised = false
	// private _externalLog?: (...args: Array<any>) => void

	/** */
	constructor(config?: {
		getMediaDurationCallback?: (clip: string, callback: (duration: number) => void) => void
		externalStorage?: (action: string, data?: Record<string, any> | null) => InternalState
		// externalLog?: (arg0?: any, arg1?: any, arg2?: any, arg3?: any) => void;
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
			this._currentStateStorage.assignExternalStorage(config.externalStorage)
		}

		// if (config && config.externalLog) {
		// 	this._externalLog = config.externalLog
		// }
	}
	get version(): string {
		return CasparCGStateVersion
	}

	/**
	 * Initializes the state by using channel info
	 * @param {any} channels [description]
	 */
	initStateFromChannelInfo(channels: Array<ChannelInfo>, currentTime: number): void {
		const currentState = this._currentStateStorage.fetchState()
		_.each(channels, (channel: ChannelInfo, i: number) => {
			if (!channel.videoMode) {
				throw Error('State: Missing channel.videoMode!')
			}
			if (!channel.fps) throw Error('State: Missing channel.fps!')

			if (!(_.isNumber(channel.fps) && channel.fps > 0)) {
				throw Error('State:Bad channel.fps, it should be a number > 0 (got ' + channel.fps + ')!')
			}

			let existingChannel: InternalChannel = currentState.channels[i + 1 + '']

			if (!existingChannel) {
				existingChannel = {
					channelNo: i + 1,
					videoMode: channel.videoMode,
					fps: channel.fps,
					layers: {},
				}
				currentState.channels[existingChannel.channelNo] = existingChannel
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
	setState(state: InternalState): void {
		this._currentStateStorage.storeState(state)
	}
	/**
	 * Get the gurrent state
	 * @param  {true}}   options [description]
	 * @return {InternalState} The current state
	 */
	getState(): InternalState {
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}

		return this._currentStateStorage.fetchState()
	}
	/**
	 * Resets / clears the current state
	 */
	clearState(): void {
		this._currentStateStorage.clearState()
		this.setIsInitialised(false, 0)
	}
	/**
	 * A soft clear, ie clears any content, but keeps channel settings
	 */
	softClearState(): void {
		const currentState = this._currentStateStorage.fetchState()
		_.each(currentState.channels, (channel) => {
			channel.layers = {}
		})
		// Save new state:
		this._currentStateStorage.storeState(currentState)
	}

	getDiff(newState: State, currentTime: number): DiffCommandGroups {
		// needs to be initialised
		if (!this.isInitialised) {
			throw new Error('CasparCG State is not initialised')
		}
		const currentState = this._currentStateStorage.fetchState()
		return CasparCGState0.diffStates(currentState, newState, currentTime, this.minTimeSincePlay)
	}

	/**
	 * Temporary, intermediate function, to deal with ordering of commands. (This might be replaced with something more permanent later)
	 * @param oldState
	 * @param newState
	 */
	static diffStatesOrderedCommands(
		oldState: InternalState,
		newState: State,
		currentTime: number,
		minTimeSincePlay = MIN_TIME_SINCE_PLAY
	): Array<AMCPCommandWithContext> {
		const diff = CasparCGState0.diffStates(oldState, newState, currentTime, minTimeSincePlay)
		const fastCommands: Array<AMCPCommandWithContext> = [] // fast to exec, and direct visual impact: PLAY 1-10
		const slowCommands: Array<AMCPCommandWithContext> = [] // slow to exec, but direct visual impact: PLAY 1-10 FILE (needs to have all commands for that layer in the right order)
		const lowPrioCommands: Array<AMCPCommandWithContext> = [] // slow to exec, and no direct visual impact: LOADBG 1-10 FILE

		for (const layer of diff) {
			let containsSlowCommand = false

			// filter out lowPrioCommands
			for (let i = 0; i < layer.cmds.length; i++) {
				if (
					layer.cmds[i].command === Commands.Loadbg ||
					layer.cmds[i].command === Commands.LoadbgDecklink ||
					layer.cmds[i].command === Commands.LoadbgRoute ||
					layer.cmds[i].command === Commands.LoadbgHtml
				) {
					lowPrioCommands.push(layer.cmds[i])
					layer.cmds.splice(i, 1)
					i-- // next entry now has the same index as this one.
				} else if (
					(layer.cmds[i].command === Commands.Play && (layer.cmds[i].params as PlayCommand['params']).clip) ||
					(layer.cmds[i].command === Commands.PlayDecklink &&
						(layer.cmds[i].params as PlayDecklinkCommand['params']).device) ||
					(layer.cmds[i].command === Commands.PlayRoute &&
						(layer.cmds[i].params as PlayRouteCommand['params']).route) ||
					(layer.cmds[i].command === Commands.PlayHtml && (layer.cmds[i].params as PlayHtmlCommand['params']).url) ||
					layer.cmds[i].command === Commands.Load // ||
					// layer.cmds[i].command === 'LoadDecklinkCommand' ||
					// layer.cmds[i].command === 'LoadRouteCommand' ||
					// layer.cmds[i].command === 'LoadHtmlPageCommand'
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
	static diffStates(
		oldState: InternalState,
		newState: State,
		currentTime: number,
		minTimeSincePlay = MIN_TIME_SINCE_PLAY
	): DiffCommandGroups {
		const commands: DiffCommandGroups = []

		const bundledCmds: {
			[bundleGroup: string]: Array<AMCPCommandWithContext>
		} = {}

		// Added/updated things:
		for (const [channelKey, newChannel] of Object.entries(newState.channels)) {
			for (const [layerKey, newLayer] of Object.entries(newChannel.layers)) {
				const fgChanges = resolveForegroundState(
					oldState,
					newState,
					channelKey,
					layerKey,
					currentTime,
					minTimeSincePlay
				)
				const bgChanges = resolveBackgroundState(oldState, newState, channelKey, layerKey, fgChanges.bgCleared)
				const mixerChanges = resolveMixerState(oldState, newState, channelKey, layerKey)

				const diffCmds: DiffCommands = {
					cmds: [...fgChanges.commands.cmds, ...bgChanges.commands.cmds, ...mixerChanges.commands.cmds],
					additionalLayerState: newLayer,
				}
				commands.push(diffCmds)

				for (const group of Object.keys(mixerChanges.bundledCmds)) {
					bundledCmds[group] = [...(bundledCmds[group] || []), ...mixerChanges.bundledCmds[group]]
				}
			}
		}
		// Removed things:
		for (const [channelKey, oldChannel] of Object.entries(oldState.channels)) {
			for (const layerKey of Object.keys(oldChannel.layers)) {
				const diff = resolveEmptyState(oldState, newState, channelKey, layerKey)
				if (diff.commands.cmds.length) commands.push(diff.commands)
			}
		}

		// bundled commands:
		_.each(bundledCmds, (bundle) => {
			const channels = _.uniq(bundle.map((c) => (c.params as any).channel))
			// const channels = _.uniq(_.pluck(bundle, 'channel'))

			_.each(channels, (channel) => {
				bundle.push(
					addContext(
						literal<AMCPCommand>({
							command: Commands.MixerCommit,
							params: {
								channel: Number(channel),
							},
						}),
						`Bundle commit`,
						null
					)
				)
			})

			const diffCmds: DiffCommands = {
				cmds: [],
			}
			addCommands(diffCmds, ...bundle)
			commands.push(diffCmds)
		})

		return commands
	}

	valueOf(): InternalState {
		return this.getState()
	}
	toString(): string {
		return JSON.stringify(this.getState())
	}

	/** */
	public get isInitialised(): boolean {
		return this._isInitialised
	}

	/** */
	public setIsInitialised(initialised: boolean, _currentTime: number): void {
		if (this._isInitialised !== initialised) {
			this._isInitialised = initialised
		}
	}

	// private log (...args: Array<any>): void {
	// 	if (this._externalLog) {
	// 		this._externalLog(...args)
	// 	} else {
	// 		console.log(...args)
	// 	}
	// }
}
export class CasparCGState extends CasparCGState0 {
	/**
	 * Set the current state to provided state
	 * @param state The new state
	 */
	setState(state: InternalState): void {
		super.setState(clone(state))
	}
	/**
	 * Get the gurrent state
	 * @param  {true}}   options [description]
	 * @return {InternalState} The current state
	 */
	getState(): InternalState {
		return clone(super.getState())
	}
}
