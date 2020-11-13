import * as _ from 'underscore'
import { TransitionOptions } from './api'
import { frames2Time, time2Frames } from './util'

export class TransitionObject {
	_transition: true
	_value: string | number | boolean
	inTransition: TransitionOptions
	changeTransition: TransitionOptions
	outTransition: TransitionOptions

	/** */
	constructor(
		value?: any,
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
		return this._value
	}

	/** */
	toString(): string {
		if (this._value) return this._value.toString()
		return ''
	}
}

export class Transition implements TransitionOptions {
	type = 'mix'
	duration = 0
	easing = 'linear'
	direction = 'right'

	maskFile = ''
	delay = 0
	overlayFile = ''
	audioFadeStart = 0
	audioFadeDuration = 0

	customOptions: any = undefined

	constructor(
		typeOrTransition?: string | object,
		durationOrMaskFile?: number | string,
		easingOrDelay?: string | number,
		directionOrOverlayFile?: string,
		audioFadeStart?: number,
		audioFadeDuration?: number
	) {
		let type: string

		if (_.isObject(typeOrTransition)) {
			const t: TransitionOptions = typeOrTransition as TransitionOptions
			type = t.type as string

			const isSting = (type + '').match(/sting/i)

			durationOrMaskFile = isSting ? t.maskFile : t.duration
			easingOrDelay = isSting ? t.delay : t.easing
			directionOrOverlayFile = isSting ? t.overlayFile : t.direction
			audioFadeStart = isSting ? t.audioFadeStart : undefined
			audioFadeDuration = isSting ? t.audioFadeDuration : undefined

			this.customOptions = t.customOptions
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
				this.easing = easingOrDelay as string
			}
			if (directionOrOverlayFile) {
				this.direction = directionOrOverlayFile
			}
		}
	}

	getOptions(fps?: number) {
		if ((this.type + '').match(/sting/i)) {
			if (this.audioFadeStart || this.audioFadeDuration) {
				return {
					transition: 'sting',
					stingTransitionProperties: {
						maskFile: this.maskFile,
						delay: this.time2Frames(this.delay || 0, fps),
						overlayFile: this.overlayFile,
						audioFadeStart: this.audioFadeStart
							? this.time2Frames(this.audioFadeStart, fps)
							: undefined,
						audioFadeDuration: this.audioFadeDuration
							? this.time2Frames(this.audioFadeDuration, fps)
							: undefined
					}
				}
			}
			return {
				transition: 'sting',
				stingMaskFilename: this.maskFile,
				stingDelay: this.time2Frames(this.delay || 0, fps),
				stingOverlayFilename: this.overlayFile
			}
		} else {
			const o: any = {
				transition: this.type,
				transitionDuration: this.time2Frames(this.duration || 0, fps),
				transitionEasing: this.easing,
				transitionDirection: this.direction
			}
			if (this.customOptions) o['customOptions'] = this.customOptions
			return o
		}
	}

	getString(fps?: number): string {
		if ((this.type + '').match(/sting/i)) {
			if (this.audioFadeStart || this.audioFadeDuration) {
				let str = 'STING ('

				if (this.maskFile) str += `MASK="${this.maskFile}" `
				if (this.overlayFile) str += `OVERLAY="${this.overlayFile}" `
				if (this.delay) str += `TRIGGER_POINT="${this.time2Frames(this.delay, fps)}" `
				if (this.audioFadeStart)
					str += `AUDIO_FADE_START="${this.time2Frames(this.audioFadeStart, fps)}" `
				if (this.audioFadeDuration)
					str += `AUDIO_FADE_DURATION="${this.time2Frames(this.audioFadeDuration, fps)}" `

				str = str.substr(0, str.length - 1) + ')'

				return str
			}
			return [
				'STING',
				this.maskFile,
				this.time2Frames(this.delay || 0, fps),
				this.overlayFile
			].join(' ')
		} else {
			return [
				this.type,
				this.time2Frames(this.duration || 0, fps),
				this.easing,
				this.direction
			].join(' ')
		}
	}

	fromCommand(command: any, fps?: number): Transition {
		if (command._objectParams) {
			if ((command._objectParams.transition + '').match(/sting/i)) {
				this.type = 'sting'
				if (command._objectParams.stingMaskFilename) {
					this.maskFile = command._objectParams.stingMaskFilename
				}
				if (command._objectParams.stingDelay) {
					this.delay = this.frames2Time(command._objectParams.stingDelay, fps)
				}
				if (command._objectParams.stingOverlayFilename) {
					this.overlayFile = command._objectParams.stingOverlayFilename
				}
				if (command._objectParams.audioFadeStart) {
					this.audioFadeStart = this.frames2Time(command._objectParams.audioFadeStart, fps)
				}
				if (command._objectParams.audioFadeDuration) {
					this.audioFadeDuration = this.frames2Time(command._objectParams.audioFadeDuration, fps)
				}
			} else {
				if (command._objectParams.transition) {
					this.type = command._objectParams.transition
				}
				if (command._objectParams.transitionDuration) {
					this.duration = this.frames2Time(command._objectParams.transitionDuration, fps)
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

	private frames2Time(frames: number, fps?: number): number {
		return frames2Time(frames, fps)
	}
	private time2Frames(time: number, fps?: number): number {
		return time2Frames(time, fps)
	}
}
