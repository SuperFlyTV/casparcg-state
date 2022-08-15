import { Direction, TransitionTween, TransitionType } from 'casparcg-connection/dist/enums'
import { TransitionParameters } from 'casparcg-connection/dist/parameters'
import * as _ from 'underscore'
import { TransitionOptions } from './api'
import { time2Frames } from './util'

export class TransitionObject {
	_transition: true
	_value?: string | number | boolean
	inTransition?: TransitionOptions
	changeTransition?: TransitionOptions
	outTransition?: TransitionOptions

	/** */
	constructor(
		value?: string | number | boolean,
		options?: {
			inTransition?: TransitionOptions
			changeTransition?: TransitionOptions
			outTransition?: TransitionOptions
		}
	) {
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
	valueOf(): string | number | boolean {
		return this._value ?? 'Transition Object'
	}

	/** */
	toString(): string {
		if (this._value) return this._value.toString()
		return ''
	}
}

export class Transition implements TransitionOptions {
	type = TransitionType.Mix
	duration = 0
	easing = TransitionTween.LINEAR
	direction = Direction.Right

	maskFile = ''
	delay = 0
	overlayFile = ''
	audioFadeStart = 0
	audioFadeDuration = 0

	customOptions: any = undefined

	constructor(
		typeOrTransition?: TransitionType | object,
		durationOrMaskFile?: number | string,
		easingOrDelay?: TransitionTween | number,
		directionOrOverlayFile?: Direction | string,
		audioFadeStart?: number,
		audioFadeDuration?: number
	) {
		let type: TransitionType

		if (_.isObject(typeOrTransition)) {
			const t: TransitionOptions = typeOrTransition as TransitionOptions
			type = t.type as TransitionType

			const isSting = (type + '').match(/sting/i)

			durationOrMaskFile = isSting ? t.maskFile : t.duration
			easingOrDelay = isSting ? (t.delay as number) : (t.easing as TransitionTween)
			directionOrOverlayFile = isSting ? t.overlayFile : t.direction
			audioFadeStart = isSting ? t.audioFadeStart : undefined
			audioFadeDuration = isSting ? t.audioFadeDuration : undefined

			this.customOptions = t.customOptions
		} else {
			type = typeOrTransition as TransitionType
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
			if (audioFadeStart) {
				this.audioFadeStart = audioFadeStart
			}
			if (audioFadeDuration) {
				this.audioFadeDuration = audioFadeDuration
			}
		} else {
			if (durationOrMaskFile) {
				this.duration = durationOrMaskFile as number
			}
			if (easingOrDelay) {
				this.easing = easingOrDelay as TransitionTween
			}
			if (directionOrOverlayFile) {
				this.direction = directionOrOverlayFile as Direction
			}
		}
	}

	getOptions(fps?: number): { transition: TransitionParameters } {
		if ((this.type + '').match(/sting/i)) {
			const stingProperties: TransitionParameters['stingProperties'] = {
				maskFile: this.maskFile,
			}

			if (this.delay) stingProperties.delay = this.time2Frames(this.delay, fps)
			if (this.audioFadeStart) {
				stingProperties.audioFadeStart = this.time2Frames(this.audioFadeStart, fps)
			}
			if (this.audioFadeDuration) {
				stingProperties.audioFadeDuration = this.time2Frames(this.audioFadeDuration, fps)
			}

			return {
				transition: {
					transitionType: TransitionType.Sting,
					duration: 0,
					stingProperties,
				},
			}
		} else {
			const o: TransitionParameters = {
				transitionType: this.type,
				duration: this.time2Frames(this.duration || 0, fps),
				tween: this.easing,
				direction: this.direction,
			}
			// if (this.customOptions) o['customOptions'] = this.customOptions
			return { transition: o }
		}
	}

	getString(fps?: number): string {
		if ((this.type + '').match(/sting/i)) {
			if (this.audioFadeStart || this.audioFadeDuration) {
				let str = 'STING ('

				if (this.maskFile) str += `MASK="${this.maskFile}" `
				if (this.overlayFile) str += `OVERLAY="${this.overlayFile}" `
				if (this.delay) str += `TRIGGER_POINT="${this.time2Frames(this.delay, fps)}" `
				if (this.audioFadeStart) str += `AUDIO_FADE_START="${this.time2Frames(this.audioFadeStart, fps)}" `
				if (this.audioFadeDuration) str += `AUDIO_FADE_DURATION="${this.time2Frames(this.audioFadeDuration, fps)}" `

				str = str.substr(0, str.length - 1) + ')'

				return str
			}
			return ['STING', this.maskFile, this.time2Frames(this.delay || 0, fps), this.overlayFile].join(' ')
		} else {
			return [this.type, this.time2Frames(this.duration || 0, fps), this.easing, this.direction].join(' ')
		}
	}

	private time2Frames(time: number, fps?: number): number {
		return time2Frames(time, fps)
	}
}
