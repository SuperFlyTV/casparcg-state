"use strict";
var _ = require("underscore");
// state NS
var StateObject_1 = require("./lib/StateObject");
var StateObjectStorage = StateObject_1.StateObject.StateObjectStorage;
var Channel = StateObject_1.StateObject.Channel;
var Layer = StateObject_1.StateObject.Layer;
// import Mixer = StateNS.Mixer;
var Next = StateObject_1.StateObject.Next;
var TransitionObject = StateObject_1.StateObject.TransitionObject;
// AMCP NS
var casparcg_connection_1 = require("casparcg-connection");
/** */
var CasparCGState = (function () {
    /** */
    function CasparCGState(config) {
        var _this = this;
        this.minTimeSincePlay = 0.2;
        // private _currentState: CasparCG = new CasparCG(); // replaced by this._currentStateStorage
        this._currentStateStorage = new StateObjectStorage();
        // set the callback for handling time messurement
        if (config && config.currentTime) {
            this._getCurrentTimeFunction = config.currentTime;
        }
        else {
            this._getCurrentTimeFunction = function () { return Date.now() / 1000; };
        }
        // set the callback for handling media duration query
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
        // set the callback for handling externalStorage
        if (config && config.externalStorage) {
            this._currentStateStorage.assignExternalStorage(config.externalStorage);
        }
    }
    /** */
    CasparCGState.prototype.initStateFromConfig = function (config) {
        var currentState = this._currentStateStorage.fetchState();
        _.each(config.channels, function (channel, i) {
            var existingChannel = _.findWhere(currentState.channels, { channelNo: i + 1 });
            if (!existingChannel) {
                existingChannel = new Channel();
                existingChannel.channelNo = i + 1;
                currentState.channels.push(existingChannel);
            }
            existingChannel.videoMode = channel["videoMode"]; // @todo: fix this shit
            existingChannel.layers = [];
        });
        // Save new state:
        this._currentStateStorage.storeState(currentState);
    };
    /** */
    CasparCGState.prototype.setState = function (state) {
        this._currentStateStorage.storeState(state);
    };
    /** */
    CasparCGState.prototype.getState = function (options) {
        if (options === void 0) { options = { full: true }; }
        var currentState = this._currentStateStorage.fetchState();
        // return state without defaults added:
        if (!options.full) {
            return currentState;
        }
        else {
            // add defaults to state and then return it:
            // @todo: iterate and generate default values;
            return currentState;
        }
    };
    /** */
    CasparCGState.prototype.applyCommands = function (commands) {
        // iterates over commands and applies new state to current state
        var _this = this;
        var currentState = this._currentStateStorage.fetchState();
        commands.forEach(function (command) {
            console.log('state: applyCommand ' + command._commandName);
            console.log(command._objectParams);
            var channel = _.findWhere(currentState.channels, { channelNo: command.channel });
            var layer;
            if (!channel) {
                throw new Error("Missing channel with channel number \"" + command.channel + "\"");
            }
            var channelFPS = 50; // todo: change this
            var cmdName = command._commandName;
            switch (cmdName) {
                case "PlayCommand":
                case "LoadCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    var seek = command._objectParams['seek'];
                    var playDeltaTime = (seek || 0) / channelFPS;
                    if (command._objectParams['clip']) {
                        layer.content = 'media';
                        layer.playing = (cmdName == 'PlayCommand');
                        if (command._objectParams['transition']) {
                            layer.media = new TransitionObject();
                            layer.media._value = command._objectParams['clip'];
                            if (command._objectParams['transition'])
                                layer.media.transition.type = command._objectParams['transition'];
                            if (command._objectParams['transitionDuration'])
                                layer.media.transition.duration = +command._objectParams['transitionDuration'];
                            if (command._objectParams['transitionEasing'])
                                layer.media.transition.easeing = command._objectParams['transitionEasing'];
                            if (command._objectParams['transitionDirection'])
                                layer.media.transition.direction = command._objectParams['transitionDirection'];
                        }
                        else {
                            layer.media = command._objectParams['clip'];
                        }
                        layer.looping = !!command._objectParams['loop'];
                        layer.playTime = _this._getCurrentTimeFunction() - playDeltaTime;
                        _this._getMediaDuration(layer.media.toString(), channel.channelNo, layer.layerNo);
                    }
                    else {
                        if (cmdName == 'PlayCommand' && layer.content == 'media' && layer.media && layer.pauseTime && layer.playTime) {
                            // resuming a paused clip
                            layer.playing = true;
                            var playedTime = layer.playTime - layer.pauseTime;
                            layer.playTime = _this._getCurrentTimeFunction() - playedTime; // "move" the clip to new start time
                        }
                    }
                    break;
                case "PauseCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.playing = false;
                    layer.pauseTime = _this._getCurrentTimeFunction();
                    break;
                case "ClearCommand":
                    if (command.layer > 0) {
                        channel.layers = [];
                        break;
                    }
                    else {
                        layer = _this.ensureLayer(channel, command.layer);
                        layer.next = null;
                    }
                // no break;
                case "StopCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.playing = false;
                    layer.content = '';
                    layer.media = '';
                    layer.playTime = 0;
                    layer.pauseTime = 0;
                    break;
                case "LoadbgCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.next = new Next();
                    if (command._objectParams['clip']) {
                        layer.next.content = 'media';
                        if (command._objectParams['transition']) {
                            layer.media = new TransitionObject();
                            layer.media._value = command._objectParams['clip'];
                            if (command._objectParams['transition'])
                                layer.media.transition.type = command._objectParams['transition'];
                            if (command._objectParams['transitionDuration'])
                                layer.media.transition.duration = +command._objectParams['transitionDuration'];
                            if (command._objectParams['transitionEasing'])
                                layer.media.transition.easeing = command._objectParams['transitionEasing'];
                            if (command._objectParams['transitionDirection'])
                                layer.media.transition.direction = command._objectParams['transitionDirection'];
                        }
                        else {
                            layer.next.media = command._objectParams['clip'];
                        }
                        layer.next.looping = !!command._objectParams['loop'];
                    }
                    break;
                case "CGAddCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    // Note: we don't support flashLayer for the moment
                    if (command._objectParams['templateName']) {
                        layer.content = 'template'; // @todo: string literal
                        layer.media = command._objectParams['templateName'];
                        //layer.templateType // we don't know if it's flash or html 
                        layer.playTime = _this._getCurrentTimeFunction();
                        if (command._objectParams['playOnLoad']) {
                            layer.playing = true;
                            layer.templateFcn = 'play';
                            layer.templateData = command._objectParams['data'] || null;
                        }
                        else {
                            layer.playing = false;
                            // todo: is data sent to template here also?
                            layer.templateFcn = '';
                            layer.templateData = null;
                        }
                    }
                    break;
                case "CGUpdateCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    if (layer.content == 'template') {
                        layer.templateFcn = 'update';
                        layer.templateData = command._objectParams['data'] || null;
                    }
                    break;
                case "CGPlayCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.playing = true;
                    layer.templateFcn = 'play';
                    layer.templateData = null;
                    break;
                case "CGStopCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    layer.templateFcn = 'stop';
                    layer.playing = false;
                    break;
                case "CGInvokeCommand":
                    layer = _this.ensureLayer(channel, command.layer);
                    if (command._objectParams['method']) {
                        layer.templateFcn = 'invoke';
                        layer.templateData = { method: command._objectParams['method'] };
                    }
                    break;
                case "CGRemoveCommand":
                case "CGClearCommand":
                    // note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
                    layer = _this.ensureLayer(channel, command.layer);
                    // todo: what's the difference between this and StopCommand?
                    layer.playing = false;
                    layer.content = '';
                    layer.media = '';
                    layer.playTime = 0;
                    layer.pauseTime = 0;
                    layer.templateData = null;
                    break;
            }
        });
        // Save new state:
        this._currentStateStorage.storeState(currentState);
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
        if (!(layerNo > 0)) {
            throw "State.ensureLayer: tried to get layer '" + layerNo + "' on channel '" + channel + "'";
        }
        var layer = _.findWhere(channel.layers, { layerNo: layerNo });
        if (!layer) {
            layer = new Layer();
            layer.layerNo = layerNo;
            channel.layers.push(layer);
        }
        return layer;
    };
    /** */
    CasparCGState.prototype.getDiff = function (newState) {
        var currentState = this._currentStateStorage.fetchState();
        return this.diffStates(currentState, newState);
    };
    CasparCGState.prototype.compareAttrs = function (obj0, obj1, attrs, strict) {
        var areSame = true;
        if (strict) {
            _.each(attrs, function (a) {
                if (obj0[a] !== obj1[a])
                    areSame = false;
            });
        }
        else {
            _.each(attrs, function (a) {
                if (obj0[a] != obj1[a])
                    areSame = false;
            });
        }
        return areSame;
    };
    /** */
    CasparCGState.prototype.diffStates = function (oldState, newState) {
        var _this = this;
        console.log('diffStates,');
        var commands = [];
        var time = this._getCurrentTimeFunction();
        // ==============================================================================
        // Added things:
        _.each(newState.channels, function (channel, channelKey) {
            var channelFps = 50; // @todo: fix this, based on channel.videoMode
            var oldChannel = oldState.channels[channelKey] || (new Channel);
            _.each(channel.layers, function (layer, layerKey) {
                var oldLayer = oldChannel.layers[layerKey] || (new Layer);
                if (layer) {
                    if (!_this.compareAttrs(layer, oldLayer, ['content', 'media', 'templateType', 'playTime'])) {
                        console.log('Something should be played');
                        var cmd = void 0;
                        var options = {};
                        options.channel = channel.channelNo;
                        options.layer = layer.layerNo;
                        if (typeof layer.media == 'object' && layer.media.transition) {
                            options.transition = layer.media.transition.type;
                            options.transitionDuration = Math.round(layer.media.transition.duration * channelFps);
                            options.transitionEasing = layer.media.transition.easeing;
                            options.transitionDirection = layer.media.transition.direction;
                        }
                        if (layer.content == 'media') {
                            var timeSincePlay = (layer.pauseTime || time) - layer.playTime;
                            if (timeSincePlay < _this.minTimeSincePlay) {
                                timeSincePlay = 0;
                            }
                            console.log('timeSincePlay ' + timeSincePlay);
                            console.log(time + '  ' + layer.playTime);
                            if (layer.looping) {
                                // we don't support looping and seeking at the same time right now..
                                timeSincePlay = 0;
                            }
                            if (layer.playing) {
                                cmd = new casparcg_connection_1.AMCP.PlayCommand(_.extend(options, {
                                    clip: layer.media,
                                    seek: Math.max(0, Math.floor(timeSincePlay * channelFps)),
                                    loop: !!layer.looping
                                }));
                            }
                            else {
                                if (layer.pauseTime && (time - layer.pauseTime) < _this.minTimeSincePlay) {
                                    cmd = new casparcg_connection_1.AMCP.PauseCommand(options);
                                }
                                else {
                                    cmd = new casparcg_connection_1.AMCP.LoadCommand(_.extend(options, {
                                        clip: layer.media,
                                        seek: Math.max(0, Math.floor(timeSincePlay * channelFps)),
                                        loop: !!layer.looping
                                    }));
                                }
                            }
                        }
                        else if (layer.content == 'template') {
                            cmd = new casparcg_connection_1.AMCP.CGAddCommand(_.extend(options, {
                                templateName: layer.media,
                                playOnLoad: layer.playing,
                                data: layer.templateData || undefined
                            }));
                        }
                        else {
                            if (oldLayer.content == 'media' || oldLayer.content == 'media') {
                                cmd = new casparcg_connection_1.AMCP.StopCommand(options);
                            }
                        }
                        if (cmd) {
                            console.log(cmd.serialize());
                            commands.push(cmd.serialize());
                        }
                    }
                    else if (layer.content == 'template'
                        && !_this.compareAttrs(layer, oldLayer, ['templateFcn'])) {
                    }
                }
            });
        });
        // ==============================================================================
        // Removed things:
        _.each(oldState.channels, function (oldChannel, channelKey) {
            var channel = newState.channels[channelKey] || (new Channel);
            if (!channel.layers.length) {
                if (oldChannel.layers.length) {
                    console.log('clear channel ' + channel.channelNo);
                    // ClearCommand:
                    var cmd = new casparcg_connection_1.AMCP.ClearCommand({
                        channel: channel.channelNo
                    });
                    commands.push(cmd.serialize());
                }
            }
            else {
                _.each(oldChannel.layers, function (oldLayer, layerKey) {
                    oldLayer;
                    var layer = channel.layers[layerKey] || (new Layer);
                    if (layer) {
                        if (!layer.content && oldLayer.content) {
                            var cmd = void 0;
                            console.log('clear layer ' + layer.layerNo);
                            // ClearCommand:
                            cmd = new casparcg_connection_1.AMCP.ClearCommand({
                                channel: channel.channelNo,
                                layer: layer.layerNo,
                            });
                            if (cmd) {
                                commands.push(cmd.serialize());
                            }
                        }
                    }
                });
            }
        });
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
