import { CasparCGState, State } from '../'
import * as _ from 'underscore'
import { DiffCommandGroups } from '../lib/casparCGState'

export interface CGState {
	time: number
	log: boolean
	ccgState: CasparCGState
}
export function getCasparCGState(): CGState {
	let time = 1000
	// let logging: boolean = false
	// let externalLog = (...args: any[]) => {
	// 	if (logging) {
	// 		console.log(...args)
	// 	}
	// }
	return {
		set time(t) {
			time = t
		},
		get time(): number {
			return time
		},
		set log(_t: boolean) {
			// logging = t
		},
		ccgState: new CasparCGState({
			// externalLog: externalLog
		}),
	}
}
export function initState(c: CGState): void {
	c.ccgState.initStateFromChannelInfo(
		[
			{
				videoMode: 'PAL',
				fps: 50,
			},
		],
		c.time
	)
}
export function initStateMS(c: CGState): void {
	c.ccgState.initStateFromChannelInfo(
		[
			{
				videoMode: 'PAL',
				fps: 50,
			},
		],
		c.time
	)
}
export function getDiff(c: CGState, targetState: State, _loggingAfter?: boolean): DiffCommandGroups {
	const cc = c.ccgState.getDiff(targetState, c.time)

	const s = c.ccgState.getState()
	for (const [channelNo, channel] of Object.entries(targetState.channels)) {
		for (const [layerNo, layer] of Object.entries(channel.layers)) {
			s.channels[channelNo].layers[layerNo] = layer
		}
	}
	for (const [channelNo, channel] of Object.entries(s.channels)) {
		for (const [layerNo] of Object.entries(channel.layers)) {
			if (!targetState.channels[channelNo]) {
				delete s.channels[channelNo]
			} else if (!targetState.channels[channelNo].layers[layerNo]) {
				delete s.channels[channelNo].layers[layerNo]
			}
		}
	}
	c.ccgState.setState(s)

	// if (loggingAfter) c.log = true
	// applyCommands(c, cc)

	// // after applying, test again vs same state, no new commands should be generated:
	// console.log('second try')
	// let cc2 = c.ccgState.getDiff(targetState, c.time)
	// expect(cc2.length).toBeLessThanOrEqual(2)
	// if (cc2.length === 1) expect(cc2[0].cmds).toHaveLength(0)
	// if (cc2.length === 2) expect(cc2[1].cmds).toHaveLength(0)

	// if (loggingAfter) c.log = false
	return cc
}
export function stripContext<T extends { context: any }>(c: T): _._Omit<T, 'context'> {
	return _.omit(c, 'context')
}
