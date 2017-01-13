export {StateObject as StateObject} from "./lib/StateObject";
export * from "./CasparCGState";



/* =========================================*/
/* ========== TEST CODE ====================*/


//import {Command  as CommandNS, AMCP} from "casparcg-connection";
//import IAMCPCommand = CommandNS.IAMCPCommand;


//import {StateObject as stateNS} from "./lib/StateObject";

//import {CasparCGState as CCGState} from "./CasparCGState";


/*export namespace CasparCGState {
	public CasparCGState= CCGState;
	StateObject= stateNS;
}

export class CasparCG {
	channels: Array<Channel> = [new Channel()];
}
*/
/*
export interface CasparCGState {
	
	
	CasparCGState:CCGState;
	StateObject:stateNS;
}
*/

/*
let myTestState0: CCGState = new CCGState();

// Make some test commands: 
let myTestPlayCommand: IAMCPCommand = new AMCP.PlayCommand({
	channel: 1,
	layer: 10,
	clip: "AMB"
});


myTestState0.applyCommands([myTestPlayCommand.serialize()]);


let myState0: stateNS.CasparCG = myTestState0.getState();





let myTestState1: CCGState = new CCGState();

myTestState1.setState(myState0);

let myState1: stateNS.CasparCG = myTestState1.getState();

console.log("myState0");
console.log(JSON.stringify(myState0));
console.log("myState1 (should be the same as myState0)");
console.log(JSON.stringify(myState1));
*/

