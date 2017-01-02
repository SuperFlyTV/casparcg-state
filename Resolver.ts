import {CasparCGState} from "./lib/CasparCGState";

/** */
export class Resolver {

	private currentState: CasparCGState;

	/** */
	setState(state: CasparCGState): void {
		this.currentState = state;
	}

	/** */
	getState(options: {full: boolean} = {full: true}): CasparCGState {
		// return full state
		if (options.full) {
			return this.currentState;
		}

		// strip defaults and return slim state
		
	}

	/** */
	applyCommands(commands: Array<CasparCGCommand>): void {

	}


	/** */
	getDiff(): Array<CasparCGCommand> {
		let commands: Array<CasparCGCommand> = [];

		return commands;
	}

	/** */
	static diffStates(oldState: CasparCGState, newState: CasparCGState): Array<CasparCGCommand> {
		let commands: Array<CasparCGCommand> = [];

		return commands;
	}

}