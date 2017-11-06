import { StateObject as StateNS } from "./lib/StateObject";
import CasparCG = StateNS.CasparCG;
import Layer = StateNS.Layer;
import { Command as CommandNS } from "casparcg-connection";
import IAMCPCommandVO = CommandNS.IAMCPCommandVO;
/** */
export declare class CasparCGState {
    private minTimeSincePlay;
    private _currentStateStorage;
    private _currentTimeFunction;
    private _getMediaDuration;
    private _isInitialised;
    bufferedCommands: Array<{
        cmd: IAMCPCommandVO;
        additionalLayerState?: Layer;
    }>;
    private _externalLog?;
    /** */
    constructor(config?: {
        currentTime?: () => number;
        getMediaDurationCallback?: (clip: string, callback: (duration: number) => void) => void;
        externalStorage?: (action: string, data: Object | null) => CasparCG;
        externalLog?: (arg0?: any, arg1?: any, arg2?: any, arg3?: any) => void;
    });
    private log(arg0?, arg1?, arg2?, arg3?);
    /** */
    initStateFromChannelInfo(channels: any): void;
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
    setState(state: CasparCG): void;
    softClearState(): void;
    clearState(): void;
    /** */
    getState(options?: {
        full: boolean;
    }): CasparCG;
    /** */
    applyCommands(commands: Array<{
        cmd: IAMCPCommandVO;
        additionalLayerState?: Layer;
    }>): void;
    applyCommandsToState(currentState: any, commands: Array<{
        cmd: IAMCPCommandVO;
        additionalLayerState?: Layer;
    }>): void;
    /** */
    applyState(channelNo: number, layerNo: number, stateData: {
        [key: string]: any;
    }): void;
    /** */
    private ensureLayer(channel, layerNo);
    /** */
    getDiff(newState: CasparCG): Array<{
        cmds: Array<IAMCPCommandVO>;
        additionalLayerState?: Layer;
    }>;
    private compareAttrs(obj0, obj1, attrs, strict?);
    /** */
    diffStates(oldState: CasparCG, newState: CasparCG): Array<{
        cmds: Array<IAMCPCommandVO>;
        additionalLayerState?: Layer;
    }>;
    /** */
    valueOf(): CasparCG;
    /** */
    toString(): string;
    /** */
    /** */
    isInitialised: boolean;
}
