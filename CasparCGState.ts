// state NS
import {StateObject as stateNS} from "./lib/StateObject";
import CasparCG = stateNS.CasparCG;

// AMCP NS
import {Command as CommandNS} from "casparcg-connection";
import IAMCPCommandVO = CommandNS.IAMCPCommandVO;

/** */
export class CasparCGState {

	private currentState: CasparCG;

	/** */
	constructor() {

	}

	/** */
	setState(state: CasparCG): void {
		this.currentState = state;
	}

	/** */
	getState(options: {full: boolean} = {full: true}): CasparCG {
		// return full state
		if (options.full) {
			return this.currentState;
		}

		// strip defaults and return slim state
		return this.currentState; // @todo: foo;
	}

	/** */
	applyCommands(commands: Array<IAMCPCommandVO>): void {
		// iterates over commands and applies new state to current state
		commands.forEach((command) => {
			switch (command._commandName) {

			}
		});
	}

	/** */
	getDiff(newState: CasparCG): Array<IAMCPCommandVO> {
		return CasparCGState.diffStates(this.currentState, newState);
	}

	/** */
	static diffStates(oldState: CasparCG, newState: CasparCG): Array<IAMCPCommandVO> {
		console.log(oldState, newState);

		let commands: Array<IAMCPCommandVO> = [];

		return commands;
	}

}