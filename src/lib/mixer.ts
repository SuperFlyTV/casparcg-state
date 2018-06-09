import * as _ from 'underscore'
import { Enum as CCG_Enum } from 'casparcg-connection'
import { TransitionObject } from './transitionObject'
import { CasparCG } from './api'
export class Mixer {
	[key: string]: any
	inTransition?: CasparCG.ITransition
	changeTransition?: CasparCG.ITransition
	outTransition?: CasparCG.ITransition

	anchor?: {x: number, y: number } | TransitionObject
	blendmode?: CCG_Enum.BlendMode | TransitionObject
	brightness?: number | TransitionObject
	chroma?: {
		keyer: CCG_Enum.Chroma,
		threshold: number,
		softness: number,
		spill: number

	} | TransitionObject
	clip?: {x: number, y: number, width: number, height: number } | TransitionObject
	contrast?: number | TransitionObject
	crop?: {left: number, top: number, right: number, bottom: number } | TransitionObject
	fill?: {x: number, y: number, xScale: number, yScale: number } | TransitionObject
	// grid
	keyer?: boolean | TransitionObject
	levels?: {minInput: number, maxInput: number, gamma: number, minOutput: number, maxOutput: number} | TransitionObject
	mastervolume?: number | TransitionObject
	// mipmap
	opacity?: number | TransitionObject
	perspective?: {
		topLeftX: number,
		topLeftY: number,
		topRightX: number,
		topRightY: number,
		bottomRightX: number,
		bottomRightY: number,
		bottomLeftX: number,
		bottomLeftY: number
	} | TransitionObject

	rotation?: number | TransitionObject
	saturation?: number | TransitionObject
	straightAlpha?: boolean | TransitionObject
	volume?: number | TransitionObject

	bundleWithCommands?: number // special function: bundle and DEFER with other mixer-commands

	public static getValue (val: any) {
		if (_.isObject(val) && val.valueOf) return val.valueOf()
		return val
	}
	public static supportedAttributes (): Array<string> {
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
			'bundleWithCommands']
	}

	public static getDefaultValues (attr: string): Object | number | boolean | null {
		// this is a temporary function, to replaced by some logic from ccg-connection
		switch (attr) {

			case 'anchor':
				return {
					_spread: true,
					x: 0,
					y: 0
				}

			case 'blendmode':
				return CCG_Enum.BlendMode.NORMAL
			case 'brightness':
				return 1

			case 'chroma':
				return {
					_spread: true,
					keyer: CCG_Enum.Chroma.NONE,
					threshold: 0,
					softness: 0,
					spill: 0
				}

			case 'clip':
				return {
					_spread: true,
					x: 0,
					y: 0,
					width: 1,
					height: 1
				}
			case 'contrast':
				return 1
			case 'crop':
				return {
					_spread: true,
					left: 0,
					top: 0,
					right: 0,
					bottom: 0
				}
			case 'fill':
				return {
					_spread: true,
					x: 0,
					y: 0,
					xScale: 1,
					yScale: 1
				}
			// grid
			case 'keyer': // Layer mask
				return false
			case 'levels':
				return {
					_spread: true,
					minInput: 	0,
					maxInput: 	1,
					gamma: 		1,
					minOutput: 	0,
					maxOutput: 	1

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
					bottomLeftY: 1
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
