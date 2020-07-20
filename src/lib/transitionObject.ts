import * as _ from 'underscore'
import { ITransition } from './api'

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
export class Transition implements ITransition {

	type: string = 'mix'
	duration: number = 0
	easing: string = 'linear'
	direction: string = 'right'

	maskFile: string = ''
	delay: number = 0
	overlayFile: string = ''
	audioFadeStart?: number = 0
	audioFadeDuration?: number = 0

	constructor (typeOrTransition?: string | object, durationOrMaskFile?: number | string, easingOrDelay?: string | number, directionOrOverlayFile?: string, audioFadeStart?: number, audioFadeDuration?: number) {
		let type: string

		if (_.isObject(typeOrTransition)) {
			let t: ITransition = typeOrTransition as ITransition
			type = t.type as string

			const isSting = (type + '').match(/sting/i)

			durationOrMaskFile = isSting ? t.maskFile : t.duration
			easingOrDelay = isSting ? t.delay : t.easing
			directionOrOverlayFile = isSting ? t.overlayFile : t.direction
			audioFadeStart = isSting ? t.audioFadeStart : undefined
			audioFadeDuration = isSting ? t.audioFadeDuration : undefined
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

	getOptions (fps?: number) {
		if ((this.type + '').match(/sting/i)) {
			if (this.audioFadeStart || this.audioFadeDuration) {
				return {
					transition: 'sting',
					stingTransitionProperties: {
						maskFile: this.maskFile,
						delay: this.time2Frames(this.delay, fps),
						overlayFile: this.overlayFile,
						audioFadeStart: this.audioFadeStart ? this.time2Frames(this.audioFadeStart, fps) : undefined,
						audioFadeDuration: this.audioFadeDuration ? this.time2Frames(this.audioFadeDuration, fps) : undefined
					}
				}
			}
			return {
				transition: 'sting',
				stingMaskFilename: this.maskFile,
				stingDelay: this.time2Frames(this.delay, fps),
				stingOverlayFilename: this.overlayFile
			}
		} else {
			return {
				transition: this.type,
				transitionDuration: this.time2Frames(this.duration, fps),
				transitionEasing: this.easing,
				transitionDirection: this.direction
			}
		}
	}

	getString (fps?: number): string {
		if ((this.type + '').match(/sting/i)) {
			if (this.audioFadeStart || this.audioFadeDuration) {
				let str = 'STING ('

				if (this.maskFile) str += `MASK="${this.maskFile}" `
				if (this.overlayFile) str += `OVERLAY="${this.overlayFile}" `
				if (this.delay) str += `TRIGGER_POINT="${this.time2Frames(this.delay, fps || 50)}" `
				if (this.audioFadeStart) str += `AUDIO_FADE_START="${this.time2Frames(this.audioFadeStart, fps || 50)}" `
				if (this.audioFadeDuration) str += `AUDIO_FADE_DURATION="${this.time2Frames(this.audioFadeDuration, fps || 50)}" `

				str = str.substr(0, str.length - 1) + ')'

				return str
			}
			return [
				'STING',
				this.maskFile,
				this.time2Frames(this.delay, fps || 50),
				this.overlayFile
			].join(' ')
		} else {
			return [
				this.type,
				this.time2Frames(this.duration, fps || 50),
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
					this.delay = this.frames2Time(command._objectParams.stingDelay, fps || 50)
				}
				if (command._objectParams.stingOverlayFilename) {
					this.overlayFile = command._objectParams.stingOverlayFilename
				}
				if (command._objectParams.audioFadeStart) {
					this.audioFadeStart = this.frames2Time(command._objectParams.audioFadeStart, fps || 50)
				}
				if (command._objectParams.audioFadeDuration) {
					this.audioFadeDuration = this.frames2Time(command._objectParams.audioFadeDuration, fps || 50)
				}
			} else {
				if (command._objectParams.transition) {
					this.type = command._objectParams.transition
				}
				if (command._objectParams.transitionDuration) {
					this.duration = this.frames2Time(command._objectParams.transitionDuration, fps || 50)
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

	private frames2Time (
		frames: number,
		fps?: number
	): number {
		// ms = frames * (1000 / fps)
		fps = fps ? (fps < 1 ? 1 / fps : fps) : 25
		return frames * (1000 / fps)
	}
	private time2Frames (
		time: number,
		fps?: number
	): number {
		// frames = ms / (1000 / fps)
		fps = fps ? (fps < 1 ? 1 / fps : fps) : 25
		time = time < 15 ? time * 1000 : time // less than 1 frame
		console.log(`${time}ms is ${Math.floor(time / (1000 / fps))} frames`)
		return Math.floor(time / (1000 / fps))
	}
}
