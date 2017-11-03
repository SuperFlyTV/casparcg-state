import { Enum as CCG_Enum } from "casparcg-connection";
export declare namespace StateObject {
    /** */
    class Mappings {
        layers: {
            [GLayer: string]: Mapping;
        };
    }
    class Mapping {
        channel: number;
        layer: number;
    }
    /** */
    class CasparCG {
        channels: {
            [channel: string]: Channel;
        };
    }
    /** */
    class Channel {
        channelNo: number;
        videoMode: string | null;
        fps: number;
        layers: {
            [layer: string]: Layer;
        };
    }
    /** */
    class Layer {
        layerNo: number;
        content: string | null;
        media: string | TransitionObject | null;
        input: {
            device: number;
            format?: string;
            channelLayout?: string;
        } | null;
        route: {
            channel: number;
            layer: number | null;
        } | null;
        playing: boolean;
        looping: boolean;
        seek: number;
        playTime: number | null;
        pauseTime: number;
        duration: number;
        next: Next | null;
        mixer: Mixer;
        templateType?: string;
        templateFcn: string;
        templateData: Object | null;
        cgStop?: boolean;
        executeFcn?: string;
        executeData?: any;
        oscDevice?: number;
        inMessage?: {
            url: string;
            args?: {};
        } | null;
        outMessage?: {
            url: string;
            args?: {};
        } | null;
        noClear?: boolean;
    }
    /** */
    class Mixer {
        static getValue(val: any): any;
        static supportedAttributes(): Array<string>;
        static getDefaultValues(attr: string): Object | number | boolean | null;
        inTransition: Object;
        changeTransition: Object;
        outTransition: Object;
        anchor?: {
            x: number;
            y: number;
        } | TransitionObject;
        blend?: CCG_Enum.BlendMode | TransitionObject;
        brightness?: number | TransitionObject;
        chroma?: {
            keyer: CCG_Enum.Chroma;
            threshold: number;
            softness: number;
            spill: number;
        } | TransitionObject;
        clip?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | TransitionObject;
        contrast?: number | TransitionObject;
        crop?: {
            left: number;
            top: number;
            right: number;
            bottom: number;
        } | TransitionObject;
        fill?: {
            x: number;
            y: number;
            xScale: number;
            yScale: number;
        } | TransitionObject;
        keyer?: boolean | TransitionObject;
        levels?: {
            minInput: number;
            maxInput: number;
            gamma: number;
            minOutput: number;
            maxOutput: number;
        } | TransitionObject;
        mastervolume?: number | TransitionObject;
        opacity?: number | TransitionObject;
        perspective?: {
            topLeftX: number;
            topLeftY: number;
            topRightX: number;
            topRightY: number;
            bottomRightX: number;
            bottomRightY: number;
            bottomLeftX: number;
            bottomLeftY: number;
        } | TransitionObject;
        rotation?: number | TransitionObject;
        saturation?: number | TransitionObject;
        straightAlpha?: boolean | TransitionObject;
        volume?: number | TransitionObject;
        bundleWithCommands?: number;
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
        constructor(value?: any);
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
        clearState(): void;
    }
}
