"use strict";
var _ = require("underscore");
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
    var Transition = (function () {
        /**
         *
         */
        function Transition(type, duration, easing, direction) {
            this.type = "mix";
            this.duration = 0;
            this.easing = "linear";
            this.direction = "right";
            // @todo: for all: string literal
            if (type) {
                this.type = type;
            }
            if (duration) {
                this.duration = duration;
            }
            if (easing) {
                this.easing = easing;
            }
            if (direction) {
                this.direction = direction;
            }
        }
        return Transition;
    }());
    StateObject.Transition = Transition;
    /** */
    var TransitionObject = (function () {
        /** */
        function TransitionObject(value) {
            if (value) {
                this._value = value;
            }
        }
        /** */
        TransitionObject.prototype.valueOf = function () {
            return this._value;
        };
        /** */
        TransitionObject.prototype.toString = function () {
            return this._value.toString();
        };
        return TransitionObject;
    }());
    StateObject.TransitionObject = TransitionObject;
    /**
    * StateObjectStorage is used for exposing the internal state variable
    * By default, it is storing the state as an internal variable,
    * byt may be using an external storage function for fetching/storing the state.
    */
    var StateObjectStorage = (function () {
        function StateObjectStorage() {
            this._internalState = new CasparCG();
        }
        StateObjectStorage.prototype.assignExternalStorage = function (fcn) {
            this._externalStorage = fcn;
        };
        ;
        StateObjectStorage.prototype.fetchState = function () {
            if (this._externalStorage) {
                return this._externalStorage("fetch", null);
            }
            else {
                /*return _Clone(this._internalState); */
                return _.clone(this._internalState); // temprary, we should do a deep clone here
            }
        };
        ;
        StateObjectStorage.prototype.storeState = function (data) {
            if (this._externalStorage) {
                this._externalStorage("store", data);
            }
            else {
                this._internalState = data;
            }
        };
        return StateObjectStorage;
    }());
    StateObject.StateObjectStorage = StateObjectStorage;
})(StateObject = exports.StateObject || (exports.StateObject = {}));
