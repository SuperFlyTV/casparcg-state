"use strict";
var _ = require("underscore");
// state NS
var StateObject_1 = require("./lib/StateObject");
var CasparCG = StateObject_1.StateObject.CasparCG;
var Channel = StateObject_1.StateObject.Channel;
var Layer = StateObject_1.StateObject.Layer;
/** */
var CasparCGState = (function () {
    /** */
    function CasparCGState(config) {
        var _this = this;
        this._currentState = new CasparCG();
        // sets callback for handling time messurement
        if (config && config.currentTime) {
            this._getCurrentTimeFunction = config.currentTime;
        }
        else {
            this._getCurrentTimeFunction = function () { return Date.now() / 1000; };
        }
        // setting callback for handling media duration query
        if (config && config.getMediaDurationCallback) {
            this._getMediaDuration = function (clip, channelNo, layerNo) {
                config.getMediaDurationCallback(clip, function (duration) {
                    _this.applyState(channelNo, layerNo, { duration: duration });
                });
            };
        }
        else {
            this._getMediaDuration = function (clip, channelNo, layerNo) { clip; _this.applyState(channelNo, layerNo, { duration: null }); };
        }
    }
    /** */
    CasparCGState.prototype.initStateFromConfig = function (config) {
        var _this = this;
        _.each(config.channels, function (channel, i) {
            var existingChannel = _.findWhere(_this._currentState.channels, { channelNo: i + 1 });
            if (!existingChannel) {
                existingChannel = new Channel();
                existingChannel.channelNo = i + 1;
                _this._currentState.channels.push(existingChannel);
            }
            existingChannel.videoMode = channel["videoMode"]; // @todo: fix this shit
            existingChannel.layers = [];
        });
    };
    /** */
    CasparCGState.prototype.setState = function (state) {
        this._currentState = state;
    };
    /** */
    CasparCGState.prototype.getState = function (options) {
        if (options === void 0) { options = { full: true }; }
        // return full state
        if (options.full) {
            return this._currentState;
        }
        // strip defaults and return slim state
        return this._currentState; // @todo: iterate and generate;
    };
    /** */
    CasparCGState.prototype.applyCommands = function (commands) {
        var _this = this;
        // iterates over commands and applies new state to current state
        commands.forEach(function (command) {
            var channel = _.findWhere(_this._currentState.channels, { channelNo: command.channel });
            var layer;
            if (!channel) {
                throw new Error("Missing channel with channel number \"" + command.channel + "\"");
            }
            switch (command._commandName) {
                case "PlayCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.playing = true;
                    if (command._objectParams["clip"]) {
                        layer.content = "video"; // @todo: string literal
                        layer.media = command._objectParams["clip"] ? command._objectParams["clip"] : "";
                    }
                    layer.playTime = _this._getCurrentTimeFunction();
                    _this._getMediaDuration(layer.media.toString(), channel.channelNo, layer.layerNo);
                    break;
            }
        });
    };
    /** */
    CasparCGState.prototype.applyState = function (channelNo, layerNo, stateData) {
        channelNo;
        layerNo;
        stateData;
        console.log("apply state (async?): ", stateData);
    };
    /** */
    CasparCGState.prototype.ensureLayer = function (channel, layerNo) {
        var layer = _.findWhere(channel.layers, { layer: layerNo });
        if (!layer) {
            layer = new Layer();
            layer.layerNo = layerNo;
            channel.layers.push(layer);
        }
        return layer;
    };
    /** */
    CasparCGState.prototype.getDiff = function (newState) {
        return CasparCGState.diffStates(this._currentState, newState);
    };
    /** */
    CasparCGState.diffStates = function (oldState, newState) {
        oldState;
        newState;
        var commands = [];
        return commands;
    };
    /** */
    CasparCGState.prototype.valueOf = function () {
        return this.getState({ full: true });
    };
    /** */
    CasparCGState.prototype.toString = function () {
        return JSON.stringify(this.getState({ full: true }));
    };
    return CasparCGState;
}());
exports.CasparCGState = CasparCGState;
