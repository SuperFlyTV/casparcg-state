"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("underscore");
var casparcg_connection_1 = require("casparcg-connection");
var StateObject;
(function (StateObject) {
    /** */
    var Mappings = /** @class */ (function () {
        function Mappings() {
            this.layers = {};
        }
        return Mappings;
    }());
    StateObject.Mappings = Mappings;
    var Mapping = /** @class */ (function () {
        function Mapping() {
        }
        return Mapping;
    }());
    StateObject.Mapping = Mapping;
    /** */
    var CasparCG = /** @class */ (function () {
        function CasparCG() {
            this.channels = {}; //Array<Channel> = [new Channel()];
        }
        return CasparCG;
    }());
    StateObject.CasparCG = CasparCG;
    /** */
    var Channel = /** @class */ (function () {
        function Channel() {
            this.channelNo = 1;
            this.layers = {}; //layers: Array<Layer> = [];
        }
        return Channel;
    }());
    StateObject.Channel = Channel;
    /** */
    var Layer = /** @class */ (function () {
        function Layer() {
        }
        return Layer;
    }());
    StateObject.Layer = Layer;
    /** */
    var Mixer = /** @class */ (function () {
        function Mixer() {
        }
        Mixer.getValue = function (val) {
            if (_.isObject(val) && val.valueOf)
                return val.valueOf();
            return val;
        };
        Mixer.supportedAttributes = function () {
            return [
                'anchor',
                'blend',
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
                'bundleWithCommands'
            ];
        };
        ;
        Mixer.getDefaultValues = function (attr) {
            // this is a temporary function, to replaced by some logic from ccg-connection
            switch (attr) {
                case 'anchor':
                    return {
                        x: 0,
                        y: 0
                    };
                case 'blend':
                    return casparcg_connection_1.Enum.BlendMode.NORMAL;
                case 'brightness':
                    return 1;
                case 'chroma':
                    return {
                        keyer: casparcg_connection_1.Enum.Chroma.NONE,
                        threshold: 0,
                        softness: 0,
                        spill: 0
                    };
                case 'clip':
                    return {
                        x: 0,
                        y: 0,
                        width: 1,
                        height: 1
                    };
                case 'contrast':
                    return 1;
                case 'crop':
                    return {
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0
                    };
                case 'fill':
                    return {
                        x: 0,
                        y: 0,
                        xScale: 1,
                        yScale: 1
                    };
                // grid
                case 'keyer':// Layer mask
                    return false;
                case 'levels':
                    return {
                        minInput: 0,
                        maxInput: 1,
                        gamma: 1,
                        minOutput: 0,
                        maxOutput: 1,
                    };
                case 'mastervolume':
                    return 1;
                // mipmap
                case 'opacity':
                    return 1;
                case 'perspective':
                    return {
                        topLeftX: 0,
                        topLeftY: 0,
                        topRightX: 1,
                        topRightY: 0,
                        bottomRightX: 1,
                        bottomRightY: 1,
                        bottomLeftX: 0,
                        bottomLeftY: 1
                    };
                case 'rotation':
                    return 0;
                case 'saturation':
                    return 1;
                case 'straightAlpha':
                    return false;
                case 'volume':
                    return 1;
                default:
                    // code...
                    break;
            }
            return null;
        };
        ;
        return Mixer;
    }());
    StateObject.Mixer = Mixer;
    /** */
    var Next = /** @class */ (function () {
        function Next() {
        }
        return Next;
    }());
    StateObject.Next = Next;
    var Transition = /** @class */ (function () {
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
    var TransitionObject = /** @class */ (function () {
        /** */
        function TransitionObject(value) {
            if (!_.isUndefined(value)) {
                this._value = value;
            }
        }
        /** */
        TransitionObject.prototype.valueOf = function () {
            return this._value;
        };
        /** */
        TransitionObject.prototype.toString = function () {
            if (this._value)
                return this._value.toString();
            return '';
        };
        return TransitionObject;
    }());
    StateObject.TransitionObject = TransitionObject;
    /**
    * StateObjectStorage is used for exposing the internal state variable
    * By default, it is storing the state as an internal variable,
    * byt may be using an external storage function for fetching/storing the state.
    */
    var StateObjectStorage = /** @class */ (function () {
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
        ;
        StateObjectStorage.prototype.clearState = function () {
            if (this._externalStorage) {
                this._externalStorage("clear");
            }
            else {
                this._internalState = new CasparCG();
            }
        };
        ;
        return StateObjectStorage;
    }());
    StateObject.StateObjectStorage = StateObjectStorage;
})(StateObject = exports.StateObject || (exports.StateObject = {}));
