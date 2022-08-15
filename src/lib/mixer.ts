import * as _ from 'underscore'
import { Enum as CCGEnum } from 'casparcg-connection'
import { TransitionObject } from './transitionObject'
import { TransitionOptions } from './api'

export interface Chroma {
	enable: boolean
	targetHue: number
	hueWidth: number
	minSaturation: number
	minBrightness: number
	softness: number
	spillSuppress: number
	spillSuppressSaturation: number
	showMask: boolean
}
export interface Perspective {
	topLeftX: number
	topLeftY: number
	topRightX: number
	topRightY: number
	bottomRightX: number
	bottomRightY: number
	bottomLeftX: number
	bottomLeftY: number
}
export class Mixer {
	[key: string]: any
	inTransition?: TransitionOptions
	changeTransition?: TransitionOptions
	outTransition?: TransitionOptions

	anchor?: { x: number; y: number } | TransitionObject
	blendmode?: CCGEnum.BlendMode | TransitionObject
	brightness?: number | TransitionObject
	chroma?: TransitionObject | Chroma

	clip?: { x: number; y: number; width: number; height: number } | TransitionObject
	contrast?: number | TransitionObject
	crop?: { left: number; top: number; right: number; bottom: number } | TransitionObject
	fill?: { x: number; y: number; xScale: number; yScale: number } | TransitionObject
	// grid
	keyer?: boolean | TransitionObject
	levels?:
		| { minInput: number; maxInput: number; gamma: number; minOutput: number; maxOutput: number }
		| TransitionObject
	mastervolume?: number | TransitionObject
	// mipmap
	opacity?: number | TransitionObject
	perspective?: Perspective | TransitionObject

	rotation?: number | TransitionObject
	saturation?: number | TransitionObject
	straightAlpha?: boolean | TransitionObject
	volume?: number | TransitionObject

	bundleWithCommands?: number // special function: bundle and DEFER with other mixer-commands

	public static getValue(val: unknown): unknown {
		if (_.isObject(val) && val.valueOf) return val.valueOf()
		return val
	}
	public static supportedAttributes(): Array<string> {
		return [
			'anchor',
			'blendmode',
			'brightness',
			'chroma',
			'clip',
			'contrast',
			'crop',
			'fill',
			'keyer',
			'levels',
			'mastervolume',
			'opacity',
			'perspective',
			'rotation',
			'saturation',
			'straightAlpha',
			'volume',
			'bundleWithCommands',
		]
	}

	public static getDefaultValues(attr: string): Record<string, unknown> | number | boolean | string | null {
		// this is a temporary function, to replaced by some logic from ccg-connection
		switch (attr) {
			case 'anchor':
				return {
					_spread: true,
					x: 0,
					y: 0,
				}

			case 'blendmode':
				return CCGEnum.BlendMode.Normal
			case 'brightness':
				return 1

			case 'chroma':
				return {
					_spread: true,
					enable: false,
					targetHue: 0,
					hueWidth: 0,
					minSaturation: 0,
					minBrightness: 0,
					softness: 0,
					spillSuppress: 0,
					spillSuppressSaturation: 0,
					showMask: false,
				}

			case 'clip':
				return {
					_spread: true,
					x: 0,
					y: 0,
					width: 1,
					height: 1,
				}
			case 'contrast':
				return 1
			case 'crop':
				return {
					_spread: true,
					left: 0,
					top: 0,
					right: 0,
					bottom: 0,
				}
			case 'fill':
				return {
					_spread: true,
					x: 0,
					y: 0,
					xScale: 1,
					yScale: 1,
				}
			// grid
			case 'keyer': // Layer mask
				return false
			case 'levels':
				return {
					_spread: true,
					minInput: 0,
					maxInput: 1,
					gamma: 1,
					minOutput: 0,
					maxOutput: 1,
				}
			case 'mastervolume':
				return 1
			// mipmap
			case 'opacity':
				return 1
			case 'perspective':
				return {
					_spread: true,
					topLeftX: 0,
					topLeftY: 0,
					topRightX: 1,
					topRightY: 0,
					bottomRightX: 1,
					bottomRightY: 1,
					bottomLeftX: 0,
					bottomLeftY: 1,
				}
			case 'rotation':
				return 0
			case 'saturation':
				return 1
			case 'straightAlpha':
				return false
			case 'volume':
				return 1

			default:
				// code...
				break
		}
		return null
	}
}
