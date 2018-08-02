import * as _ from 'underscore'
import { CasparCG } from './api'
export class TransitionObject {
	_transition: true
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
		this._transition = true
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

	maskFile: string
	delay: number
	overlayFile: string

	constructor (typeOrTransition?: string | object, durationOrMaskFile?: number | string, easingOrDelay?: string | number, directionOrOverlayFile?: string) {
		let type: string

		if (_.isObject(typeOrTransition)) {
			let t: CasparCG.ITransition = typeOrTransition as CasparCG.ITransition
			type = t.type as string
			durationOrMaskFile = t.duration || t.maskFile
			easingOrDelay = t.easing || t.delay
			directionOrOverlayFile = t.direction || t.overlayFile
		} else {
			type = typeOrTransition as string
		}

		// @todo: for all: string literal
		if (type) {
			this.type = type
		}
		if (this.type === 'sting') {
			if (durationOrMaskFile) {
				this.maskFile = durationOrMaskFile as string
			}
			if (easingOrDelay) {
				this.delay = easingOrDelay as number
			}
			if (directionOrOverlayFile) {
				this.overlayFile = directionOrOverlayFile
			}
		} else {
			if (durationOrMaskFile) {
				this.duration = durationOrMaskFile as number
			}
			if (easingOrDelay) {
				this.easing = easingOrDelay as string
			}
			if (directionOrOverlayFile) {
				this.direction = directionOrOverlayFile
			}
		}
	}

	getOptions (fps?: number) {
		if (this.type === 'sting') {
			return {
				transition: 'STING',
				stingMaskFilename: this.maskFile,
				stingDelay: this.delay,
				stingOverlayFilename: this.overlayFile
			}
		} else {
			return {
				transition: this.type,
				transitionDuration: Math.round(this.duration * (fps || 50)),
				transitionEasing: this.easing,
				transitionDirection: this.direction
			}
		}
	}
}
