import {
	Channel,
	MediaLayer,
	NextUpMedia,
	NextUp,
	LayerContentType,
	LayerBase,
	TransitionObject,
	Transition,
	State
} from './api'
import * as _ from 'underscore'
import { Mixer } from './mixer'
import { AMCPCommandWithContext, AMCPCommandVOWithContext, DiffCommands } from './casparCGState'
import { Command as CommandNS } from 'casparcg-connection'
import { InternalLayer, InternalState } from './stateObjectStorage'

export function frames2Time(frames: number, fps: number | undefined): number {
	fps = fps || 25 // Set default:
	// ms = frames * (1000 / fps)
	fps = fps < 1 ? 1 / fps : fps
	return frames * (1000 / fps)
}
export function time2Frames(time: number, fps: number | undefined): number {
	fps = fps || 25 // Set default:
	// frames = ms / (1000 / fps)
	fps = fps < 1 ? 1 / fps : fps
	return Math.floor(time / (1000 / fps))
}
export function frames2TimeChannel(
	frames: number,
	newChannel: Channel,
	oldChannel?: Channel
): number {
	// ms = frames * (1000 / fps)
	const fps = newChannel.fps || (oldChannel ? oldChannel.fps : 0) || 25
	return frames2Time(frames, fps)
}
export function time2FramesChannel(
	time: number,
	newChannel: Channel,
	oldChannel?: Channel
): number {
	// frames = ms / (1000 / fps)
	const fps = newChannel.fps || (oldChannel ? oldChannel.fps : 0) || 25
	return time2Frames(time, fps)
}
/**
 * Calculate seek time needed to make the clip to play in sync
 * Returns seek, in frames
 */
export function calculateSeek(
	newChannel: Channel,
	oldChannel: Channel,
	layer: MediaLayer | NextUpMedia,
	timeSincePlay: number | null
): number {
	if (layer.looping && !layer.length) {
		// if we don't know the length of the loop, we can't seek..
		return 0
	}
	const seekStart: number = (layer.seek !== undefined ? layer.seek : layer.inPoint) || 0

	let seekFrames: number = Math.max(
		0,
		time2FramesChannel(seekStart + (timeSincePlay || 0), newChannel, oldChannel)
	)
	const inPointFrames: number | undefined =
		layer.inPoint !== undefined
			? time2FramesChannel(layer.inPoint, newChannel, oldChannel)
			: undefined
	const lengthFrames: number | undefined =
		layer.length !== undefined
			? time2FramesChannel(layer.length, newChannel, oldChannel)
			: undefined

	if (layer.looping) {
		const seekSinceInPoint = seekFrames - (inPointFrames || 0)

		if (seekSinceInPoint > 0 && lengthFrames) {
			seekFrames = (inPointFrames || 0) + (seekSinceInPoint % lengthFrames)
		}
	}
	return seekFrames
}
export function calculatePlayAttributes(
	timeSincePlay: number | null,
	nl: MediaLayer | NextUp,
	newChannel: Channel,
	oldChannel: Channel
): {
	inPointFrames: number | undefined
	lengthFrames: number | undefined
	seekFrames: number
	looping: boolean
	channelLayout: string | undefined
} {
	let inPointFrames: number | undefined
	let lengthFrames: number | undefined
	let seekFrames = 0
	let channelLayout: string | undefined
	let looping = false

	if (nl.content === LayerContentType.MEDIA) {
		looping = !!nl.looping
		inPointFrames =
			nl.inPoint !== undefined ? time2FramesChannel(nl.inPoint, newChannel, oldChannel) : undefined
		lengthFrames =
			nl.length !== undefined ? time2FramesChannel(nl.length, newChannel, oldChannel) : undefined
		seekFrames = calculateSeek(newChannel, oldChannel, nl, timeSincePlay)
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
export function getTimeSincePlay(layer: MediaLayer, currentTime: number, minTimeSincePlay: number) {
	let timeSincePlay: number | null =
		layer.playTime === undefined ? 0 : (layer.pauseTime || currentTime) - (layer.playTime || 0)
	if (timeSincePlay < minTimeSincePlay) {
		timeSincePlay = 0
	}

	if (_.isNull(layer.playTime)) {
		// null indicates the start time is not relevant, like for a LOGICAL object, or an image
		timeSincePlay = null
	}
	return timeSincePlay
}
export function fixPlayCommandInput<T extends object>(o: T): T {
	const o2: any = {}
	for (const key of Object.keys(o)) {
		const value: any = o[key as keyof T]
		if (value !== undefined) o2[key] = value
	}
	return o2
}
export function compareAttrs(
	obj0: any,
	obj1: any,
	attrs: Array<string>,
	minTimeSincePlay = 0.15, // [s]
	strict?: boolean
): null | string {
	let difference: null | string = null

	let diff0 = ''
	let diff1 = ''

	const getValue: any = function (val: any) {
		if (val && val._transition) return val._value
		if (val && val.getString) return val.getString()
		return Mixer.getValue(val)
	}
	const cmp = (a: any, b: any, name: any) => {
		if (name === 'playTime') {
			return Math.abs(a - b) > minTimeSincePlay
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
export function addContext<T extends CommandNS.IAMCPCommandVO>(
	cmd: T,
	context: string,
	layer: LayerBase | null
): AMCPCommandVOWithContext
export function addContext<T extends CommandNS.IAMCPCommand>(
	cmd: T,
	context: string,
	layer: LayerBase | null
): AMCPCommandWithContext
export function addContext<T extends CommandNS.IAMCPCommandVO | CommandNS.IAMCPCommand>(
	cmd: T,
	context: string,
	layer: LayerBase | null
): T & { context: AMCPCommandVOWithContext['context'] } {
	const returnCmd = cmd as T & { context: AMCPCommandVOWithContext['context'] }
	returnCmd.context = {
		context,
		layerId: layer ? layer.id : ''
	}
	return returnCmd
}
export function isIAMCPCommand(cmd: any): cmd is CommandNS.IAMCPCommand {
	return cmd && typeof cmd.serialize === 'function'
}
export function setTransition(
	options: any | null,
	channel: Channel,
	oldLayer: LayerBase,
	content: any,
	isRemove: boolean,
	isBg?: boolean
) {
	if (!options) options = {}
	const comesFromBG = (transitionObj: TransitionObject) => {
		if (oldLayer.nextUp && _.isObject(oldLayer.nextUp.media)) {
			const t0 = new Transition(transitionObj)
			const t1 = new Transition((oldLayer.nextUp.media as TransitionObject).inTransition)
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
			} else if (content.inTransition && (isBg || !comesFromBG(content.inTransition))) {
				transition = new Transition(content.inTransition)
			}
		}

		if (transition) {
			_.extend(options, transition.getOptions(channel.fps))
		}
	}

	return options
}
export function setDefaultValue(obj: any | Array<any>, key: string | Array<string>, value: any) {
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
export function compareMixerValues(
	layer: LayerBase,
	oldLayer: InternalLayer,
	attr: string,
	attrs?: Array<string>
): string | null {
	const val0: any = Mixer.getValue((layer.mixer || {})[attr])
	const val1: any = Mixer.getValue((oldLayer.mixer || {})[attr])

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
			const omitAttrs = ['inTransition', 'changeTransition', 'outTransition']

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
export function getChannel(state: State | InternalState, channelNo: string) {
	return state.channels[channelNo] || { channelNo: channelNo, layers: {} }
}
export function getLayer(state: State | InternalState, channelNo: string, layerNo: string) {
	const channel = getChannel(state, channelNo)
	return (
		channel.layers[layerNo] || {
			content: LayerContentType.NOTHING,
			id: '',
			layerNo: layerNo
		}
	)
}
export function addCommands(
	diff: DiffCommands,
	...commands: Array<AMCPCommandWithContext | AMCPCommandVOWithContext>
): void {
	for (const cmd of commands) {
		if (isIAMCPCommand(cmd)) {
			diff.cmds.push({
				...cmd.serialize(),
				context: cmd.context
			})
		} else {
			diff.cmds.push(cmd)
		}
	}
}
