import {
	StateObjectStorage
} from '../stateObjectStorage'
import { CasparCG } from '../api'
import { CasparCGFull as CF } from '../interfaces'

test('test StateObjectStorage', () => {
	let sos = new StateObjectStorage()

	let state0: CF.State = {
		channels: {
			'1': {
				channelNo: 1,
				videoMode: 'PAL',
				fps: 50,
				layers: {
					'10': {
						layerNo: 1,
						content: CasparCG.LayerContentType.NOTHING

					}
				}
			}
		}
	}

	sos.storeState(state0)

	expect(sos.fetchState()).toEqual(state0)

	sos.clearState()
	let empty = new CF.State()

	expect(sos.fetchState()).toMatchObject(empty)
})

test('test externalStorage', () => {
	let state0: CF.State = {
		channels: {
			'2': {
				channelNo: 1,
				videoMode: 'PAL',
				fps: 50,
				layers: {
					'55': {
						layerNo: 1,
						content: CasparCG.LayerContentType.NOTHING

					}
				}
			}
		}
	}
	let sos = new StateObjectStorage()

	let myExternalStorage: any = {}
	let fcn = jest.fn((action: string, data: Object | null) => {
		if (action === 'store') {
			myExternalStorage = data
		} else if (action === 'fetch') {
			return myExternalStorage
		} else if (action === 'clear') {
			myExternalStorage = {}
		}
	})

	sos.assignExternalStorage(fcn)

	sos.storeState(state0)

	expect(fcn).toHaveBeenCalledTimes(1)
	expect(fcn).toHaveBeenCalledWith('store', state0)

	let stateReturned = sos.fetchState()

	expect(stateReturned).toEqual(state0)

	sos.clearState()

	expect(sos.fetchState()).toEqual({})

})
