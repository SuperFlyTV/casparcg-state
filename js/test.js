"use strict";
/* =========================================*/
/* ========== TEST CODE ====================*/
Object.defineProperty(exports, "__esModule", { value: true });
var casparcg_connection_1 = require("casparcg-connection");
var CasparCGState_1 = require("./CasparCGState");
var myTestState0 = new CasparCGState_1.CasparCGState();
// Make some test commands: 
var myTestPlayCommand = new casparcg_connection_1.AMCP.PlayCommand({
    channel: 1,
    layer: 10,
    clip: "AMB"
});
myTestState0.applyCommands([{
        cmd: myTestPlayCommand.serialize()
    }
]);
var myState0 = myTestState0.getState();
var myTestState1 = new CasparCGState_1.CasparCGState();
myTestState1.setState(myState0);
var myState1 = myTestState1.getState();
console.log("myState0");
console.log(JSON.stringify(myState0));
console.log("myState1 (should be the same as myState0)");
console.log(JSON.stringify(myState1));
