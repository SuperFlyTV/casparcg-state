import * as _ from 'underscore'
import { AMCP } from 'casparcg-connection'

import {
	CasparCG,
	CasparCGState
} from '../index'

function initState (s: CasparCGState) {
	s.initStateFromChannelInfo([{videoMode: 'PAL', fps: 50}])
}
function applyCommands (s: CasparCGState, cc: any ) {

	let commands: any = []

	_.each(cc, (c: any) => {
		_.each(c.cmds, (cmd) => {
			commands.push({
				cmd: cmd,
				additionalLayerState: c.additionalLayerState
			})
		})
	})
	s.applyCommands(commands)

}
test('Play a video, then stop it', () => {
	let ccgState0 = new CasparCGState()
	initState(ccgState0)

	let layer10: CasparCG.IMediaLayer = {
		content: CasparCG.LayerContentType.MEDIA,
		layerNo: 10,
		media: 'AMB',
		playing: true,

		playTime: 1000
	}
	let channel1: CasparCG.Channel = {
		channelNo: 1,
		layers: {'10': layer10}
	}
	let targetState: CasparCG.State = {
		channels: {
			'1': channel1
		}
	}
	let cc0 = ccgState0.getDiff(targetState)

	expect(cc0).toHaveLength(1)
	expect(cc0[0].cmds).toHaveLength(1)
	expect(cc0[0].cmds[0]).toMatchObject((new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB'
	})).serialize())

	applyCommands(ccgState0, cc0)

	// Test again, no commands should be generated:
	let cc1 = ccgState0.getDiff(targetState)

	expect(cc1).toHaveLength(1)
	expect(cc1[0].cmds).toHaveLength(0)

	// Remove the layer from the state, this should generate a stop command:
	delete channel1.layers['10']

	let cc2 = ccgState0.getDiff(targetState)
	expect(cc2).toHaveLength(1)
	expect(cc2[0].cmds).toHaveLength(1)
	expect(cc2[0].cmds[0]).toMatchObject((new AMCP.ClearCommand({
		channel: 1,
		layer: 10
	})).serialize())
})

test('get & set state', () => {
	let ccgState0 = new CasparCGState()
	initState(ccgState0)

	// initialize:

	// Make some test commands:
	let myTestPlayCommand = new AMCP.PlayCommand({
		channel: 1,
		layer: 10,
		clip: 'AMB'
	})
	ccgState0.applyCommands([{
		cmd: myTestPlayCommand.serialize()
	}])

	let myState0 = ccgState0.getState()

	let ccgState1 = new CasparCGState()
	initState(ccgState1)

	ccgState1.setState(myState0)

	// let myState1 = ccgState1.getState()

	expect(ccgState0.getState()).toEqual(ccgState1.getState())

})
