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

	maskFile: string = ''
	delay: number = 0
	overlayFile: string = ''

	constructor (typeOrTransition?: string | object, durationOrMaskFile?: number | string, easingOrDelay?: string | number, directionOrOverlayFile?: string) {
		let type: string

		if (_.isObject(typeOrTransition)) {
			let t: CasparCG.ITransition = typeOrTransition as CasparCG.ITransition
			type = t.type as string

			const isSting = (type + '').match(/sting/i)

			durationOrMaskFile = isSting ? t.maskFile : t.duration
			easingOrDelay = isSting ? t.delay : t.easing
			directionOrOverlayFile = isSting ? t.overlayFile : t.direction
		} else {
			type = typeOrTransition as string
		}

		// @todo: for all: string literal
		if (type) {
			this.type = type
		}
		if ((this.type + '').match(/sting/i)) {
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
		if ((this.type + '').match(/sting/i)) {
			return {
				transition: 'sting',
				stingMaskFilename: this.maskFile,
				stingDelay: Math.round(this.delay * (fps || 50)),
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

	getString (fps?: number): string {
		if ((this.type + '').match(/sting/i)) {
			return [
				'STING',
				this.maskFile,
				Math.round(this.delay * (fps || 50)),
				this.overlayFile
			].join(' ')
		} else {
			return [
				this.type,
				Math.round(this.duration * (fps || 50)),
				this.easing,
				this.direction
			].join(' ')
		}
	}

	fromCommand (command: any, fps?: number): Transition {
		if (command._objectParams) {
			if ((command._objectParams.transition + '').match(/sting/i)) {
				this.type = 'sting'
				if (command._objectParams.stingMaskFilename) {
					this.maskFile = command._objectParams.stingMaskFilename
				}
				if (command._objectParams.stingDelay) {
					this.delay = command._objectParams.stingDelay / (fps || 50)
				}
				if (command._objectParams.stingOverlayFilename) {
					this.overlayFile = command._objectParams.stingOverlayFilename
				}
			} else {
				if (command._objectParams.transition) {
					this.type = command._objectParams.transition
				}
				if (command._objectParams.transitionDuration) {
					this.duration = command._objectParams.transitionDuration / (fps || 50)
				}
				if (command._objectParams.transitionEasing) {
					this.easing = command._objectParams.transitionEasing
				}
				if (command._objectParams.transitionDirection) {
					this.direction = command._objectParams.transitionDirection
				}
			}
		}
		return this
	}
}
