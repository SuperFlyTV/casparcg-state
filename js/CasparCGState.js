"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("underscore");
// state NS
var StateObject_1 = require("./lib/StateObject");
var StateObjectStorage = StateObject_1.StateObject.StateObjectStorage;
var Transition = StateObject_1.StateObject.Transition;
var Channel = StateObject_1.StateObject.Channel;
var Layer = StateObject_1.StateObject.Layer;
var Mixer = StateObject_1.StateObject.Mixer;
var Next = StateObject_1.StateObject.Next;
var TransitionObject = StateObject_1.StateObject.TransitionObject;
//import * as CCG_conn from "casparcg-connection";
// AMCP NS
var casparcg_connection_1 = require("casparcg-connection");
var CasparCGStateVersion = "2017-11-06 19:15";
// config NS
// import {Config as ConfigNS} from "casparcg-connection";
// import CasparCGConfig207 = ConfigNS.v207.CasparCGConfigVO;
// import CasparCGConfig210 = ConfigNS.v21x.CasparCGConfigVO;
/** */
var CasparCGState = /** @class */ (function () {
    /** */
    function CasparCGState(config) {
        var _this = this;
        this.minTimeSincePlay = 0.2;
        // private _currentState: CasparCG = new CasparCG(); // replaced by this._currentStateStorage
        this._currentStateStorage = new StateObjectStorage();
        this.bufferedCommands = [];
        // set the callback for handling time messurement
        if (config && config.currentTime) {
            this._currentTimeFunction = config.currentTime;
        }
        else {
            this._currentTimeFunction = function () { return Date.now() / 1000; };
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
        this.log("CasparCGState version: " + CasparCGStateVersion);
        if (config && config.externalLog) {
            this._externalLog = config.externalLog;
        }
    }
    CasparCGState.prototype.log = function (arg0, arg1, arg2, arg3) {
        if (this._externalLog) {
            this._externalLog(arg0, arg1, arg2, arg3);
        }
        else {
            console.log(arg0, arg1, arg2, arg3);
        }
    };
    /** */
    CasparCGState.prototype.initStateFromChannelInfo = function (channels) {
        var _this = this;
        var currentState = this._currentStateStorage.fetchState();
        _.each(channels, function (channel, i) {
            //let existingChannel = _.findWhere(currentState.channels, {channelNo: i + 1});
            var existingChannel = currentState.channels[(i + 1) + ''];
            if (!existingChannel) {
                existingChannel = new Channel();
                existingChannel.channelNo = i + 1;
                //currentState.channels.push(existingChannel);
                currentState.channels[existingChannel.channelNo] = existingChannel;
            }
            existingChannel.videoMode = channel["format"];
            existingChannel.fps = channel["frameRate"];
            if (!existingChannel.videoMode)
                _this.log("State: No channel videoMode given!");
            if (!existingChannel.fps)
                _this.log("State: No channel FPS given!");
            existingChannel.layers = {};
        });
        // Save new state:
        this._currentStateStorage.storeState(currentState);
        this.isInitialised = true;
    };
    /** *
    public initStateFromConfig(config: CasparCGConfig207 | CasparCGConfig210) {
        let currentState = this._currentStateStorage.fetchState();

        _.each(config.channels, (channel, i) => {
            //let existingChannel = _.findWhere(currentState.channels, {channelNo: i + 1});
            let existingChannel = currentState.channels[(i+1)+''];
            if (!existingChannel) {
                existingChannel = new Channel();
                existingChannel.channelNo = i + 1;
                //currentState.channels.push(existingChannel);
                currentState.channels[existingChannel.channelNo] = existingChannel;
            }

            existingChannel.videoMode = channel["videoMode"];	// @todo: fix this shit
            existingChannel.layers = {};
        });

        // Save new state:
        this._currentStateStorage.storeState(currentState);
        this.isInitialised = true;
    }*/
    /** */
    CasparCGState.prototype.setState = function (state) {
        this._currentStateStorage.storeState(state);
    };
    CasparCGState.prototype.softClearState = function () {
        // a soft clear, ie clears any content, but keeps channel settings
        var currentState = this._currentStateStorage.fetchState();
        _.each(currentState.channels, function (channel) {
            channel.layers = {};
        });
        // Save new state:
        this._currentStateStorage.storeState(currentState);
    };
    CasparCGState.prototype.clearState = function () {
        this._currentStateStorage.clearState();
    };
    /** */
    CasparCGState.prototype.getState = function (options) {
        if (options === void 0) { options = { full: true }; }
        // needs to be initialised
        if (!this.isInitialised) {
            throw new Error("CasparCG State is not initialised");
        }
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
        // Applies commands to current state
        // buffer commands until we are initialised
        if (!this.isInitialised) {
            this.bufferedCommands = this.bufferedCommands.concat(commands);
            return;
        }
        var currentState = this._currentStateStorage.fetchState();
        // Applies commands to target state	
        this.applyCommandsToState(currentState, commands);
        // Save new state:
        this._currentStateStorage.storeState(currentState);
    };
    CasparCGState.prototype.applyCommandsToState = function (currentState, commands) {
        //console.log('applyCommandsToState',commands);
        // iterates over commands and applies new state to provided state object
        var _this = this;
        var setMixerState = function (channel, command, attr, subValue) {
            var layer = _this.ensureLayer(channel, command.layer);
            if (!layer.mixer)
                layer.mixer = new Mixer();
            /*
            console.log('setMixerState '+attr);
            console.log(subValue);
            console.log(command)
            */
            if ((command._objectParams || {})['_defaultOptions']) {
                // the command sent, contains "default parameters"
                delete layer.mixer[attr];
            }
            else {
                if (_.isArray(subValue)) {
                    var o_1 = {};
                    _.each(subValue, function (sv) {
                        o_1[sv] = command._objectParams[sv];
                    });
                    layer.mixer[attr] = new TransitionObject(o_1);
                }
                else if (_.isString(subValue)) {
                    //let o:any = {value: command._objectParams[subValue]};
                    var o = command._objectParams[subValue];
                    layer.mixer[attr] = new TransitionObject(o);
                }
            }
        };
        commands.forEach(function (i) {
            var command = i.cmd;
            var channelNo = (command._objectParams || {})['channel'] || command.channel;
            var layerNo = (command._objectParams || {})['layer'] || command.layer;
            var channel = currentState.channels[channelNo + ''];
            var layer;
            if (!channel) {
                // Create new empty channel:
                channel = new Channel();
                channel.channelNo = channelNo;
                currentState.channels[channel.channelNo + ''] = channel;
                //throw new Error(`Missing channel with channel number "${command.channel}"`);
            }
            var cmdName = command._commandName;
            switch (cmdName) {
                case "PlayCommand":
                case "LoadCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    var seek = command._objectParams['seek'];
                    var playDeltaTime = (seek || 0) / channel.fps;
                    if (command._objectParams['clip']) {
                        layer.content = 'media';
                        layer.playing = (cmdName == 'PlayCommand');
                        layer.media = new TransitionObject(command._objectParams['clip']);
                        if (command._objectParams['transition']) {
                            layer.media.inTransition = new Transition(command._objectParams['transition'], +(command._objectParams['transitionDuration'] || 0), command._objectParams['transitionEasing'], command._objectParams['transitionDirection']);
                        }
                        layer.looping = !!command._objectParams['loop'];
                        if (i.additionalLayerState) {
                            layer.playTime = i.additionalLayerState.playTime;
                        }
                        else {
                            layer.playTime = _this._currentTimeFunction() - playDeltaTime;
                        }
                        layer.pauseTime = Number(command._objectParams['pauseTime']) || 0;
                        _this._getMediaDuration((layer.media || '').toString(), channel.channelNo, layer.layerNo);
                    }
                    else {
                        if (cmdName == 'PlayCommand' && layer.content == 'media' && layer.media && layer.pauseTime && layer.playTime) {
                            // resuming a paused clip
                            layer.playing = true;
                            var playedTime = layer.playTime - layer.pauseTime;
                            layer.playTime = _this._currentTimeFunction() - playedTime; // "move" the clip to new start time
                            layer.pauseTime = 0;
                        }
                    }
                    if (i.additionalLayerState && i.additionalLayerState.media) {
                        _.extend(layer.media, { outTransition: i.additionalLayerState.media["outTransition"] });
                    }
                    layer.noClear = command._objectParams['noClear'];
                    break;
                case "PauseCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    layer.playing = false;
                    layer.pauseTime = _this._currentTimeFunction();
                    break;
                case "ClearCommand":
                    if (layerNo > 0) {
                        layer = _this.ensureLayer(channel, layerNo);
                        layer.next = null;
                    }
                    else {
                        channel.layers = {};
                        break;
                    }
                // no break;
                case "StopCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    layer.playing = false;
                    layer.content = null;
                    layer.media = null;
                    layer.playTime = 0;
                    layer.pauseTime = 0;
                    break;
                case "LoadbgCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    layer.next = new Next();
                    if (command._objectParams['clip']) {
                        layer.next.content = 'media';
                        layer.media = new TransitionObject(command._objectParams['clip']);
                        if (command._objectParams['transition']) {
                            layer.media.inTransition = new Transition(command._objectParams['transition'], +(command._objectParams['transitionDuration'] || 0), command._objectParams['transitionEasing'], command._objectParams['transitionDirection']);
                        }
                        layer.next.looping = !!command._objectParams['loop'];
                    }
                    break;
                case "CGAddCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    // Note: we don't support flashLayer for the moment
                    if (command._objectParams['templateName']) {
                        layer.content = 'template'; // @todo: string literal
                        layer.media = command._objectParams['templateName'];
                        layer.cgStop = !!command._objectParams['cgStop'];
                        layer.templateType = command._objectParams['templateType'] || undefined;
                        //layer.templateType // we don't know if it's flash or html 
                        // layer.playTime = this._currentTimeFunction();
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
                        layer.noClear = command._objectParams['noClear'];
                    }
                    break;
                case "CGUpdateCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    if (layer.content == 'template') {
                        layer.templateFcn = 'update';
                        layer.templateData = command._objectParams['data'] || null;
                    }
                    break;
                case "CGPlayCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    layer.playing = true;
                    layer.templateFcn = 'play';
                    layer.templateData = null;
                    layer.noClear = command._objectParams['noClear'];
                    break;
                case "CGStopCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    //layer.templateFcn = 'stop';
                    //layer.playing = false;
                    layer.content = null;
                    layer.playing = false;
                    layer.media = null;
                    break;
                case "CGInvokeCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    if (command._objectParams['method']) {
                        layer.templateFcn = 'invoke';
                        layer.templateData = { method: command._objectParams['method'] };
                    }
                    break;
                case "CGRemoveCommand":
                case "CGClearCommand":
                    // note: since we don't support flashlayers, CGRemoveCommand == CGClearCommand
                    layer = _this.ensureLayer(channel, layerNo);
                    // todo: what's the difference between this and StopCommand?
                    layer.playing = false;
                    layer.content = null;
                    layer.media = null;
                    // layer.playTime = 0;
                    layer.pauseTime = 0;
                    layer.templateData = null;
                    break;
                case "PlayDecklinkCommand":
                    layer = _this.ensureLayer(channel, layerNo);
                    layer.content = 'input';
                    layer.media = 'decklink';
                    layer.input = {
                        device: command._objectParams['device'],
                        format: command._objectParams['format'],
                    };
                    //filter: command._objectParams['filter'],
                    //channelLayout: command._objectParams['channelLayout'],
                    layer.playing = true;
                    layer.playTime = null; // playtime is irrelevant
                    layer.noClear = command._objectParams['noClear'];
                    break;
                case "MixerAnchorCommand":
                    setMixerState(channel, command, 'anchor', ['x', 'y']);
                    break;
                case "MixerBlendCommand":
                    setMixerState(channel, command, 'blend', 'blend');
                    break;
                case "MixerBrightnessCommand":
                    setMixerState(channel, command, 'brightness', 'brightness');
                    break;
                case "MixerChromaCommand":
                    setMixerState(channel, command, 'chroma', ['keyer', 'threshold', 'softness', 'spill']);
                    break;
                case "MixerClipCommand":
                    setMixerState(channel, command, 'clip', ['x', 'y', 'width', 'height']);
                    break;
                case "MixerContrastCommand":
                    setMixerState(channel, command, 'contrast', 'contrast');
                    break;
                case "MixerCropCommand":
                    setMixerState(channel, command, 'crop', ['left', 'top', 'right', 'bottom']);
                    break;
                case "MixerFillCommand":
                    setMixerState(channel, command, 'fill', ['x', 'y', 'xScale', 'yScale']);
                    break;
                // grid
                case "MixerKeyerCommand":
                    setMixerState(channel, command, 'keyer', 'keyer');
                    break;
                case "MixerLevelsCommand":
                    setMixerState(channel, command, 'levels', ['minInput', 'maxInput', 'gamma', 'minOutput', 'maxOutput']);
                    break;
                case "MixerMastervolumeCommand":
                    setMixerState(channel, command, 'mastervolume', 'mastervolume');
                    break;
                // mipmap
                case "MixerOpacityCommand":
                    setMixerState(channel, command, 'opacity', 'opacity');
                    break;
                case "MixerPerspectiveCommand":
                    setMixerState(channel, command, 'perspective', ['topLeftX', 'topLeftY', 'topRightX', 'topRightY', 'bottomRightX', 'bottomRightY', 'bottomLeftX', 'bottomLeftY']);
                    break;
                case "MixerRotationCommand":
                    setMixerState(channel, command, 'rotation', 'rotation');
                    break;
                case "MixerSaturationCommand":
                    setMixerState(channel, command, 'saturation', 'saturation');
                    break;
                case "MixerStraightAlphaOutputCommand":
                    setMixerState(channel, command, 'straightAlpha', 'state');
                    break;
                case "MixerVolumeCommand":
                    setMixerState(channel, command, 'volume', 'volume');
                    break;
                /*

                    ResumeCommand

                    CallCommand
                    SwapCommand
                    AddCommand
                    RemoveCommand
                    SetCommand
                    ChannelGridCommand

                    bye
                    kill
                    restart
                */
                case "CustomCommand":
                    // specials/temporary workaraounds:
                    switch (command._objectParams['customCommand']) {
                        case "route":
                            layer = _this.ensureLayer(channel, layerNo);
                            layer.content = 'route';
                            layer.media = 'route';
                            //let route:Object = <Object>co;
                            var routeChannel = command._objectParams['routeChannel'];
                            var routeLayer = command._objectParams['routeLayer'];
                            layer.route = {
                                channel: parseInt(routeChannel),
                                layer: (routeLayer ? parseInt(routeLayer) : null)
                            };
                            layer.playing = true;
                            layer.playTime = null; // playtime is irrelevant
                            break;
                        //
                        case "add file":
                            layer = _this.ensureLayer(channel, layerNo);
                            layer.content = 'record';
                            layer.media = String(command._objectParams['media']);
                            layer.encoderOptions = String(command._objectParams['encoderOptions'] || '');
                            layer.playing = true;
                            layer.playTime = Number(command._objectParams['playTime']) || null;
                            break;
                        case "remove file":
                            layer = _this.ensureLayer(channel, layerNo);
                            layer.playing = false;
                            layer.content = null;
                            layer.media = null;
                            delete layer.encoderOptions;
                            // layer.playTime = 0;
                            layer.pauseTime = 0;
                            layer.templateData = null;
                            break;
                    }
                    break;
                case "executeFunction":
                    layer = _this.ensureLayer(channel, layerNo);
                    if (command['returnValue'] !== true) {
                        // save state:
                        layer.content = 'function';
                        layer.media = command['media'];
                    }
                    break;
            }
        });
    };
    /** */
    CasparCGState.prototype.applyState = function (channelNo, layerNo, stateData) {
        channelNo;
        layerNo;
        stateData;
        /*let channel: Channel = _.findWhere(this.getState().channels, {channelNo: channelNo});
        let layer: Layer = _.findWhere(channel.layers, {layerNo: layerNo});
        _.extend(layer, stateData);*/
    };
    /** */
    CasparCGState.prototype.ensureLayer = function (channel, layerNo) {
        if (!(layerNo > 0)) {
            throw "State.ensureLayer: tried to get layer '" + layerNo + "' on channel '" + channel + "'";
        }
        var layer = channel.layers[layerNo + ''];
        if (!layer) {
            layer = new Layer();
            layer.layerNo = layerNo;
            channel.layers[layer.layerNo + ''] = layer;
        }
        return layer;
    };
    /** */
    CasparCGState.prototype.getDiff = function (newState) {
        // needs to be initialised
        if (!this.isInitialised) {
            throw new Error("CasparCG State is not initialised");
        }
        var currentState = this._currentStateStorage.fetchState();
        return this.diffStates(currentState, newState);
    };
    CasparCGState.prototype.compareAttrs = function (obj0, obj1, attrs, strict) {
        var _this = this;
        var difference = null;
        var diff0 = '';
        var diff1 = '';
        var getValue = function (val) {
            //if (_.isObject(val)) return val.valueOf();
            //if (val.valueOf) return val.valueOf();
            //return val;
            return Mixer.getValue(val);
        };
        var cmp = function (a, b, name) {
            if (name == 'playTime') {
                return Math.abs(a - b) > _this.minTimeSincePlay;
            }
            return a != b;
        };
        if (obj0 && obj1) {
            if (strict) {
                _.each(attrs, function (a) {
                    if (obj0[a].valueOf() !== obj1[a].valueOf()) {
                        diff0 = obj0[a].valueOf() + '';
                        diff1 = obj1[a].valueOf() + '';
                        if (diff0 && diff0.length > 20)
                            diff0 = diff0.slice(0, 20) + '...';
                        if (diff1 && diff1.length > 20)
                            diff1 = diff1.slice(0, 20) + '...';
                        difference = a + ': ' + diff0 + '!==' + diff1;
                    }
                });
            }
            else {
                _.each(attrs, function (a) {
                    if (cmp(getValue(obj0[a]), getValue(obj1[a]), a)) {
                        diff0 = getValue(obj0[a]) + '';
                        diff1 = getValue(obj1[a]) + '';
                        if (diff0 && diff0.length > 20)
                            diff0 = diff0.slice(0, 20) + '...';
                        if (diff1 && diff1.length > 20)
                            diff1 = diff1.slice(0, 20) + '...';
                        difference = a + ': ' + diff0 + '!=' + diff1;
                    }
                });
            }
        }
        else {
            if ((obj0 && !obj1)
                ||
                    (!obj0 && obj1))
                difference = '' + (!!obj0) + ' t/f ' + (!!obj1);
        }
        //if (difference && difference.length>40) difference = difference.slice(0,40)+'...';
        return difference;
    };
    /** */
    CasparCGState.prototype.diffStates = function (oldState, newState) {
        var _this = this;
        // needs to be initialised
        if (!this.isInitialised) {
            throw new Error("CasparCG State is not initialised");
        }
        //console.log('diffStates -----------------------------');
        //console.log(newState)
        var commands = [];
        var time = this._currentTimeFunction();
        var setTransition = function (options, channel, oldLayer, content) {
            channel;
            if (!options)
                options = {};
            if (_.isObject(content)) {
                var transition = void 0;
                if (oldLayer.playing && content.changeTransition) {
                    transition = content.changeTransition;
                }
                else if (content.inTransition) {
                    transition = content.inTransition;
                }
                if (transition) {
                    options['transition'] = transition.type;
                    options['transitionDuration'] = Math.round(transition.duration * (channel.fps || 50));
                    options['transitionEasing'] = transition.easing;
                    options['transitionDirection'] = transition.direction;
                }
            }
            return options;
        };
        // ==============================================================================
        var bundledCmds = {};
        // Added/updated things:
        _.each(newState.channels, function (channel, channelKey) {
            var oldChannel = oldState.channels[channelKey + ''] || (new Channel());
            _.each(channel.layers, function (layer, layerKey) {
                var oldLayer = oldChannel.layers[layerKey + ''] || (new Layer());
                if (layer) {
                    /*
                    console.log('new layer '+channelKey+'-'+layerKey);
                    console.log(layer)
                    console.log('old layer');
                    console.log(oldLayer)
                    */
                    var cmd = void 0;
                    var additionalCmds_1 = [];
                    var diff = _this.compareAttrs(layer, oldLayer, ['content']);
                    if (!diff) {
                        if (layer.content == 'media') {
                            if (!layer.seek)
                                layer.seek = 0;
                            if (!oldLayer.seek)
                                oldLayer.seek = 0;
                            diff = _this.compareAttrs(layer, oldLayer, ['media', 'playTime', 'looping', 'seek']);
                        }
                        else if (layer.content == 'template') {
                            diff = _this.compareAttrs(layer, oldLayer, ['media', 'templateType']);
                        }
                        else if (layer.content == 'input') {
                            diff = _this.compareAttrs(layer, oldLayer, ['media']);
                            if (!diff)
                                diff = _this.compareAttrs(layer.input, oldLayer.input, ['device', 'format']);
                        }
                        else if (layer.content == 'route') {
                            diff = _this.compareAttrs(layer.route, oldLayer.route, ['channel', 'layer']);
                        }
                        else if (layer.content == 'record') {
                            diff = _this.compareAttrs(layer, oldLayer, ['media', 'playTime', 'encoderOptions']);
                        }
                        else if (layer.content == 'function') {
                            diff = _this.compareAttrs(layer, oldLayer, ['media']);
                        }
                    }
                    if (diff) {
                        // Added things:
                        _this.log('ADD: ' + layer.content + ' | ' + diff);
                        var options = {};
                        options.channel = channel.channelNo;
                        options.layer = layer.layerNo;
                        if (layer.noClear)
                            options.noClear = layer.noClear;
                        setTransition(options, channel, oldLayer, layer.media);
                        if (layer.content == 'media' && layer.media !== null) {
                            var getTimeSincePlay = function (layer) {
                                var timeSincePlay = (layer.pauseTime || time) - (layer.playTime || 0);
                                if (timeSincePlay < _this.minTimeSincePlay) {
                                    timeSincePlay = 0;
                                }
                                if (layer.looping) {
                                    // we don't support looping and seeking at the same time right now..
                                    timeSincePlay = 0;
                                }
                                if (_.isNull(layer.playTime)) {
                                    timeSincePlay = null;
                                }
                                return timeSincePlay;
                            };
                            var getSeek = function (layer, timeSincePlay) {
                                return Math.max(0, Math.floor(((timeSincePlay || 0)
                                    +
                                        (layer.seek || 0))
                                    * (channel.fps || oldChannel.fps)));
                            };
                            var timeSincePlay = getTimeSincePlay(layer);
                            var seek = getSeek(layer, timeSincePlay);
                            if (layer.playing) {
                                var oldTimeSincePlay = getTimeSincePlay(oldLayer);
                                var oldSeek = getSeek(oldLayer, oldTimeSincePlay);
                                if (layer.media == oldLayer.media &&
                                    oldLayer.pauseTime &&
                                    Math.abs(oldSeek - seek) < _this.minTimeSincePlay) {
                                    cmd = new casparcg_connection_1.AMCP.PlayCommand(options);
                                }
                                else {
                                    cmd = new casparcg_connection_1.AMCP.PlayCommand(_.extend(options, {
                                        clip: (layer.media || '').toString(),
                                        seek: seek,
                                        loop: !!layer.looping
                                    }));
                                }
                            }
                            else {
                                if (((layer.pauseTime && (time - layer.pauseTime) < _this.minTimeSincePlay) ||
                                    _.isNull(timeSincePlay)) &&
                                    layer.media == oldLayer.media) {
                                    cmd = new casparcg_connection_1.AMCP.PauseCommand(options);
                                }
                                else {
                                    cmd = new casparcg_connection_1.AMCP.LoadCommand(_.extend(options, {
                                        clip: (layer.media || '').toString(),
                                        seek: seek,
                                        loop: !!layer.looping,
                                        pauseTime: layer.pauseTime
                                    }));
                                }
                            }
                        }
                        else if (layer.content == 'template' && layer.media !== null) {
                            cmd = new casparcg_connection_1.AMCP.CGAddCommand(_.extend(options, {
                                templateName: (layer.media || '').toString(),
                                flashLayer: 1,
                                playOnLoad: layer.playing,
                                data: layer.templateData || undefined,
                                cgStop: layer.cgStop,
                                templateType: layer.templateType
                            }));
                        }
                        else if (layer.content == 'input' && layer.media !== null) {
                            var inputType = (layer.input && layer.media && (layer.media || '').toString()) || 'decklink';
                            var device = (layer.input && layer.input.device);
                            var format = (layer.input && layer.input.format) || null;
                            var channelLayout = (layer.input && layer.input.channelLayout) || null;
                            if (inputType == 'decklink') {
                                _.extend(options, {
                                    device: device,
                                    //filter		// "ffmpeg filter"
                                    //channelLayout
                                    format: format,
                                    channelLayout: channelLayout
                                });
                                cmd = new casparcg_connection_1.AMCP.PlayDecklinkCommand(options);
                                /*cmd = new AMCP.CustomCommand(_.extend(options,{
                                    command: "PLAY "+options.channel+"-"+options.layer+" "+inputType+" DEVICE "+device+" FORMAT "+format,
                                }));
                                */
                            }
                        }
                        else if (layer.content == 'route' && layer.route) {
                            var routeChannel = layer.route.channel;
                            var routeLayer = layer.route.layer;
                            _.extend(options, {
                                routeChannel: routeChannel,
                                routeLayer: routeLayer,
                                command: ('PLAY ' + options.channel + '-' + options.layer +
                                    ' route://' +
                                    routeChannel +
                                    (routeLayer ? '-' + routeLayer : '') +
                                    (options.transition
                                        ? (' ' + options.transition + ' ' + options.transitionDuration + ' ' + options.transitionEasing)
                                        : '')),
                                customCommand: 'route',
                            });
                            cmd = new casparcg_connection_1.AMCP.CustomCommand(options);
                        }
                        else if (layer.content == 'record' && layer.media !== null) {
                            var media = layer.media;
                            var encoderOptions = layer.encoderOptions || '';
                            var playTime = layer.playTime;
                            _.extend(options, {
                                media: media,
                                encoderOptions: encoderOptions,
                                playTime: playTime,
                                command: ('ADD ' + options.channel + ' FILE ' + media + ' ' + encoderOptions),
                                customCommand: 'add file',
                            });
                            cmd = new casparcg_connection_1.AMCP.CustomCommand(options);
                        }
                        else if (layer.content == 'function' && layer.media && layer.executeFcn) {
                            cmd = {
                                channel: options.channel,
                                layer: options.layer,
                                _commandName: 'executeFunction',
                                media: layer.media,
                                externalFunction: true,
                            };
                            if (layer.executeFcn === 'special_osc') {
                                cmd = _.extend(cmd, {
                                    specialFunction: 'osc',
                                    oscDevice: layer.oscDevice,
                                    message: layer.inMessage,
                                });
                            }
                            else {
                                cmd = _.extend(cmd, {
                                    functionName: layer.executeFcn,
                                    functionData: layer.executeData,
                                    functionLayer: layer,
                                });
                            }
                        }
                        else {
                            if (oldLayer.content == 'media' || oldLayer.content == 'media') {
                                cmd = new casparcg_connection_1.AMCP.StopCommand(options);
                            }
                        }
                    }
                    else if (layer.content == 'template') {
                        diff = _this.compareAttrs(layer, oldLayer, ['templateData']);
                        if (diff) {
                            // Updated things:
                            _this.log('UPDATE: ' + layer.content + ' ' + diff);
                            var options = {};
                            options.channel = channel.channelNo;
                            options.layer = layer.layerNo;
                            if (layer.content == 'template') {
                                cmd = new casparcg_connection_1.AMCP.CGUpdateCommand(_.extend(options, {
                                    flashLayer: 1,
                                    data: layer.templateData || undefined,
                                }));
                            }
                        }
                    }
                    // -------------------------------------------------------------
                    // Mixer commands:
                    if (!layer.mixer)
                        layer.mixer = new Mixer();
                    if (!oldLayer.mixer)
                        oldLayer.mixer = new Mixer();
                    var compareMixerValues_1 = function (layer, oldLayer, attr, attrs) {
                        var val0 = Mixer.getValue(layer.mixer[attr]);
                        var val1 = Mixer.getValue(oldLayer.mixer[attr]);
                        if (attrs) {
                            var areSame = true;
                            if (val0 && val1) {
                                _.each(attrs, function (a) {
                                    if (val0[a] != val1[a])
                                        areSame = false;
                                });
                            }
                            else {
                                if ((val0 && !val1)
                                    ||
                                        (!val0 && val1)) {
                                    areSame = false;
                                }
                            }
                            return areSame;
                        }
                        if (_.isObject(val0) || _.isObject(val1)) {
                            if (_.isObject(val0) && _.isObject(val1)) {
                                var omitAttrs = ['inTransition', 'changeTransition', 'outTransition'];
                                return _.isEqual(_.omit(val0, omitAttrs), _.omit(val1, omitAttrs));
                            }
                            else
                                return false;
                        }
                        return (val0 == val1);
                    };
                    var pushMixerCommand = function (attr, Command, subValue) {
                        /*if (attr == 'fill') {
                            console.log('pushMixerCommand '+attr);
                            console.log(oldLayer.mixer)
                            console.log(layer.mixer)
                            console.log(subValue)
                        }*/
                        if (!compareMixerValues_1(layer, oldLayer, attr, (_.isArray(subValue)
                            ? subValue
                            : undefined))) {
                            /*
                            console.log('pushMixerCommand change: '+attr)
                            console.log(oldLayer.mixer)
                            console.log(Mixer.getValue(oldLayer.mixer[attr]));
                            console.log(layer.mixer)
                            console.log(Mixer.getValue(layer.mixer[attr]));
                            */
                            var options_1 = {};
                            options_1.channel = channel.channelNo;
                            options_1.layer = layer.layerNo;
                            //setTransition(options,channel,oldLayer,layer.mixer[attr]);
                            setTransition(options_1, channel, oldLayer, layer.mixer);
                            var o_2 = Mixer.getValue(layer.mixer[attr]);
                            if (_.has(layer.mixer, attr) && !_.isUndefined(o_2)) {
                                /*
                                console.log(attr);
                                console.log(o);
                                console.log(subValue);
                                */
                                if (_.isArray(subValue)) {
                                    _.each(subValue, function (sv) {
                                        options_1[sv] = o_2[sv];
                                    });
                                }
                                else if (_.isString(subValue)) {
                                    //options[subValue] = o.value;
                                    if (_.isObject(o_2)) {
                                        options_1[subValue] = o_2._value;
                                    }
                                    else {
                                        options_1[subValue] = o_2;
                                    }
                                }
                                if (layer.mixer.bundleWithCommands) {
                                    options_1['bundleWithCommands'] = layer.mixer.bundleWithCommands;
                                    var key = layer.mixer.bundleWithCommands + '';
                                    if (!bundledCmds[key])
                                        bundledCmds[key] = [];
                                    options_1['defer'] = true;
                                    bundledCmds[key].push(new Command(options_1));
                                }
                                else {
                                    additionalCmds_1.push(new Command(options_1));
                                }
                            }
                            else {
                                // @todo: implement
                                // reset this mixer?
                                // temporary workaround, default values
                                var defaultValue = Mixer.getDefaultValues(attr);
                                if (_.isObject(defaultValue)) {
                                    _.extend(options_1, defaultValue);
                                }
                                else {
                                    options_1[attr] = defaultValue;
                                    /*_.extend(options,{
                                        value:
                                    });*/
                                }
                                /*
                                console.log('defaultValues')
                                console.log(options)
                                */
                                options_1._defaultOptions = true; // this is used in ApplyCommands to set state to "default"
                                additionalCmds_1.push(new Command(options_1));
                            }
                        }
                    };
                    //if (this.compareAttrs(layer.mixer,oldLayer.mixer,Mixer.supportedAttributes())) {
                    pushMixerCommand('anchor', casparcg_connection_1.AMCP.MixerAnchorCommand, ['x', 'y']);
                    pushMixerCommand('blend', casparcg_connection_1.AMCP.MixerBlendCommand, 'blend');
                    pushMixerCommand('brightness', casparcg_connection_1.AMCP.MixerBrightnessCommand, 'brightness');
                    pushMixerCommand('chroma', casparcg_connection_1.AMCP.MixerChromaCommand, ['keyer', 'threshold', 'softness', 'spill']);
                    pushMixerCommand('clip', casparcg_connection_1.AMCP.MixerClipCommand, ['x', 'y', 'width', 'height']);
                    pushMixerCommand('contrast', casparcg_connection_1.AMCP.MixerContrastCommand, 'contrast');
                    pushMixerCommand('crop', casparcg_connection_1.AMCP.MixerCropCommand, ['left', 'top', 'right', 'bottom']);
                    pushMixerCommand('fill', casparcg_connection_1.AMCP.MixerFillCommand, ['x', 'y', 'xScale', 'yScale']);
                    // grid
                    pushMixerCommand('keyer', casparcg_connection_1.AMCP.MixerKeyerCommand, 'keyer');
                    pushMixerCommand('levels', casparcg_connection_1.AMCP.MixerLevelsCommand, ['minInput', 'maxInput', 'gamma', 'minOutput', 'maxOutput']);
                    pushMixerCommand('mastervolume', casparcg_connection_1.AMCP.MixerMastervolumeCommand, 'mastervolume');
                    // mipmap
                    pushMixerCommand('opacity', casparcg_connection_1.AMCP.MixerOpacityCommand, 'opacity');
                    pushMixerCommand('perspective', casparcg_connection_1.AMCP.MixerPerspectiveCommand, ['topLeftX', 'topLeftY', 'topRightX', 'topRightY', 'bottomRightX', 'bottomRightY', 'bottomLeftX', 'bottomLeftY']);
                    pushMixerCommand('rotation', casparcg_connection_1.AMCP.MixerRotationCommand, 'rotation');
                    pushMixerCommand('saturation', casparcg_connection_1.AMCP.MixerSaturationCommand, 'saturation');
                    pushMixerCommand('straightAlpha', casparcg_connection_1.AMCP.MixerStraightAlphaOutputCommand, 'state');
                    pushMixerCommand('volume', casparcg_connection_1.AMCP.MixerVolumeCommand, 'volume');
                    //}
                    var cmds = [];
                    if (cmd) {
                        if (cmd['serialize']) {
                            cmds.push(cmd['serialize']());
                        }
                        else {
                            cmds.push(cmd);
                        }
                    }
                    _.each(additionalCmds_1, function (addCmd) {
                        cmds.push(addCmd.serialize());
                    });
                    commands.push({ cmds: cmds, additionalLayerState: layer });
                }
            });
        });
        // ==============================================================================
        // Removed things:
        _.each(oldState.channels, function (oldChannel, channelKey) {
            var newChannel = newState.channels[channelKey] || (new Channel());
            _.each(oldChannel.layers, function (oldLayer, layerKey) {
                var newLayer = newChannel.layers[layerKey + ''] || (new Layer);
                if (newLayer) {
                    if (!newLayer.content && oldLayer.content) {
                        _this.log('REMOVE ' + channelKey + '-' + layerKey + ': ' + oldLayer.content);
                        if (oldLayer.noClear) {
                            // hack: don't do the clear command
                            _this.log('NOCLEAR is set!');
                        }
                        else {
                            var cmd = void 0;
                            if (oldLayer.content == 'record') {
                                cmd = new casparcg_connection_1.AMCP.CustomCommand({
                                    layer: oldLayer.layerNo,
                                    channel: oldChannel.channelNo,
                                    command: ('REMOVE ' + oldChannel.channelNo + ' FILE'),
                                    customCommand: 'remove file',
                                });
                            }
                            if (typeof oldLayer.media === 'object' && oldLayer.media !== null) {
                                if (oldLayer.media.outTransition) {
                                    cmd = new casparcg_connection_1.AMCP.PlayCommand({
                                        channel: oldChannel.channelNo,
                                        layer: oldLayer.layerNo,
                                        clip: "empty",
                                        transition: oldLayer.media.outTransition.type,
                                        transitionDuration: Math.round(+(oldLayer.media.outTransition.duration) * oldChannel.fps),
                                        transitionEasing: oldLayer.media.outTransition.easing,
                                        transitionDirection: oldLayer.media.outTransition.direction
                                    });
                                }
                            }
                            if (!cmd) {
                                if (oldLayer.content == 'template' && oldLayer.cgStop) {
                                    cmd = new casparcg_connection_1.AMCP.CGStopCommand({
                                        channel: oldChannel.channelNo,
                                        layer: oldLayer.layerNo,
                                        flashLayer: 1,
                                    });
                                }
                            }
                            if (!cmd) {
                                // ClearCommand:
                                cmd = new casparcg_connection_1.AMCP.ClearCommand({
                                    channel: oldChannel.channelNo,
                                    layer: oldLayer.layerNo,
                                });
                            }
                            if (cmd) {
                                commands.push({
                                    cmds: [
                                        cmd.serialize()
                                    ]
                                });
                            }
                        }
                    }
                }
            });
        });
        // bundled commands:
        _.each(bundledCmds, function (bundle) {
            var channels = _.uniq(_.pluck(bundle, 'channel'));
            _.each(channels, function (channel) {
                bundle.push(new casparcg_connection_1.AMCP.MixerCommitCommand({
                    channel: Number(channel)
                }));
            });
            var cmds = [];
            _.each(bundle, function (cmd) {
                cmds.push(cmd.serialize());
            });
            commands.push({ cmds: cmds });
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
    Object.defineProperty(CasparCGState.prototype, "isInitialised", {
        /** */
        get: function () {
            return this._isInitialised;
        },
        /** */
        set: function (initialised) {
            if (this._isInitialised !== initialised) {
                this._isInitialised = initialised;
                if (this._isInitialised) {
                    this.applyCommands(this.bufferedCommands);
                    this.bufferedCommands = [];
                }
            }
        },
        enumerable: true,
        configurable: true
    });
    return CasparCGState;
}());
exports.CasparCGState = CasparCGState;
