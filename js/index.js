"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./lib/StateObject"));
__export(require("./CasparCGState"));
/* =========================================*/
/* ========== TEST CODE ====================*


import {Command  as CommandNS, AMCP} from "casparcg-connection";
import IAMCPCommand = CommandNS.IAMCPCommand;


import {StateObject as stateNS} from "./lib/StateObject";

import {CasparCGState} from "./CasparCGState";

let myTestState0: CasparCGState = new CasparCGState();

// Make some test commands:
let myTestPlayCommand: IAMCPCommand = new AMCP.PlayCommand({
    channel: 1,
    layer: 10,
    opacity: .8
});

//myTestPlayCommand;
myTestState0.applyCommands([myTestPlayCommand.serialize()]);


let myState0: stateNS.CasparCG = myTestState0.getState();
console.log(new CasparCGState().diffStates(new CasparCGState().getState(), myState0));*/
