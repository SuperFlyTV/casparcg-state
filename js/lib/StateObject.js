"use strict";
var StateObject;
(function (StateObject) {
    /** */
    var CasparCG = (function () {
        function CasparCG() {
            this.channels = [new Channel()];
        }
        return CasparCG;
    }());
    StateObject.CasparCG = CasparCG;
    /** */
    var Channel = (function () {
        function Channel() {
            this.channelNo = 1;
            this.layers = [];
        }
        return Channel;
    }());
    StateObject.Channel = Channel;
    /** */
    var Layer = (function () {
        function Layer() {
        }
        return Layer;
    }());
    StateObject.Layer = Layer;
    /** */
    var Mixer = (function () {
        function Mixer() {
        }
        return Mixer;
    }());
    StateObject.Mixer = Mixer;
    /** */
    var Next = (function () {
        function Next() {
        }
        return Next;
    }());
    StateObject.Next = Next;
    /** */
    var TransitionObject = (function () {
        function TransitionObject() {
            this.transition = { type: "", duration: 0, ease: "linear" }; // @todo: string literal on ease
        }
        return TransitionObject;
    }());
    StateObject.TransitionObject = TransitionObject;
})(StateObject = exports.StateObject || (exports.StateObject = {}));
