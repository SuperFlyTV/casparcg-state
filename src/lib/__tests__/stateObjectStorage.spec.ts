import { StateObjectStorage, InternalState } from '../stateObjectStorage'
import { LayerContentType } from '../api'

test('test StateObjectStorage', () => {
	const sos = new StateObjectStorage()

	const state0: InternalState = {
		channels: {
			'1': {
				channelNo: 1,
				videoMode: 'PAL',
				fps: 50,
				layers: {
					'10': {
						id: 'abc',
						layerNo: 1,
						content: LayerContentType.NOTHING
					}
				}
			}
		}
	}

	sos.storeState(state0)

	expect(sos.fetchState()).toEqual(state0)

	sos.clearState()
	const empty: InternalState = {
		channels: {}
	}

	expect(sos.fetchState()).toMatchObject(empty)
})

test('test externalStorage', () => {
	const state0: InternalState = {
		channels: {
			'2': {
				channelNo: 1,
				videoMode: 'PAL',
				fps: 50,
				layers: {
					'55': {
						id: 'abc',
						layerNo: 1,
						content: LayerContentType.NOTHING
					}
				}
			}
		}
	}
	const sos = new StateObjectStorage()

	let myExternalStorage: any = {}
	const fcn = jest.fn((action: string, data: Record<string, any> | null) => {
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

	const stateReturned = sos.fetchState()

	expect(stateReturned).toEqual(state0)

	sos.clearState()

	expect(sos.fetchState()).toEqual({})
})
