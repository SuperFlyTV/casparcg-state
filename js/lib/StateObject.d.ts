export declare namespace StateObject {
    /** */
    class CasparCG {
        channels: Array<Channel>;
    }
    /** */
    class Channel {
        channelNo: number;
        videoMode: string | null;
        layers: Array<Layer>;
    }
    /** */
    class Layer {
        layerNo: number;
        content: string | null;
        media: string | TransitionObject | null;
        templateType?: string;
        playing: boolean;
        looping: boolean;
        playTime: number;
        pauseTime: number;
        duration: number;
        next: Next | null;
        mixer: Mixer;
        templateFcn: string;
        templateData: Object | null;
    }
    /** */
    class Mixer {
        opacity?: number | TransitionObject;
        volume?: number | TransitionObject;
    }
    /** */
    class Next {
        content: string;
        media: string | TransitionObject;
        looping: boolean;
        playTime: number;
        duration: number;
        auto: boolean;
    }
    class Transition {
        type: string;
        duration: number;
        easing: string;
        direction: string;
        /**
         *
         */
        constructor(type?: string, duration?: number, easing?: string, direction?: string);
    }
    /** */
    class TransitionObject {
        _value: string | number | boolean;
        inTransition: Transition;
        changeTransition: Transition;
        outTransition: Transition;
        /** */
        constructor(value?: string | number | boolean);
        /** */
        valueOf(): string | number | boolean;
        /** */
        toString(): string;
    }
    /**
    * StateObjectStorage is used for exposing the internal state variable
    * By default, it is storing the state as an internal variable,
    * byt may be using an external storage function for fetching/storing the state.
    */
    class StateObjectStorage {
        private _internalState;
        private _externalStorage;
        assignExternalStorage(fcn: (action: string, data: Object | null) => CasparCG): void;
        fetchState(): CasparCG;
        storeState(data: CasparCG): void;
    }
}
