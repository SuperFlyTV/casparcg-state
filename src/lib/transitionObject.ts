import * as _ from 'underscore'
export class TransitionObject {
	_value: string | number | boolean
	inTransition: Transition
	changeTransition: Transition
	outTransition: Transition

	/** */
	constructor (value?: any ) {
		if (!_.isUndefined(value)) {
			this._value = value
		}
	}

	/** */
	valueOf (): string | number | boolean {
		return this._value
	}

	/** */
	toString (): string {
		if (this._value) return this._value.toString()
		return ''
	}
}
export class Transition {

	type: string = 'mix'
	duration: number = 0
	easing: string = 'linear'
	direction: string = 'right'

	constructor (type?: string, duration?: number, easing?: string, direction?: string) {

		// @todo: for all: string literal
		if (type) {
			this.type = type
		}
		if (duration) {
			this.duration = duration
		}
		if (easing) {
			this.easing = easing
		}
		if (direction) {
			this.direction = direction
		}
	}
}
