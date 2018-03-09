import * as _ from 'underscore'
import { CasparCG } from './api'
export class TransitionObject {
	_value: string | number | boolean
	inTransition: Transition
	changeTransition: Transition
	outTransition: Transition

	/** */
	constructor (value?: any, options ?: {
		inTransition?: Transition,
		changeTransition?: Transition,
		outTransition?: Transition
	}) {
		if (!_.isUndefined(value)) {
			this._value = value
		}
		if (options) {
			if (options.inTransition) this.inTransition = options.inTransition
			if (options.changeTransition) this.changeTransition = options.changeTransition
			if (options.outTransition) this.outTransition = options.outTransition
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
export class Transition implements CasparCG.ITransition {

	type: string = 'mix'
	duration: number = 0
	easing: string = 'linear'
	direction: string = 'right'

	constructor (typeOrTransition?: string | object, duration?: number, easing?: string, direction?: string) {
		let type: string

		if (_.isObject(typeOrTransition)) {
			let t: CasparCG.ITransition = typeOrTransition as CasparCG.ITransition
			type = t.type as string
			duration = t.duration
			easing = t.easing
			direction = t.direction
		} else {
			type = typeOrTransition as string
		}

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
