export declare namespace StateObject {
    /** */
    class CasparCG {
        channels: Array<Channel>;
    }
    /** */
    class Channel {
        channelNo: number;
        videoMode: string;
        layers: Array<Layer>;
    }
    /** */
    class Layer {
        layerNo: number;
        content: string;
        media: string | TransitionObject;
        templateType?: string;
        playing: boolean;
        playTime: number;
        duration: number;
        next: Next | null;
        mixer: Mixer;
    }
    /** */
    class Mixer {
        opacity: number | TransitionObject;
        volume: number | TransitionObject;
    }
    /** */
    class Next {
        content: string;
        media: string | TransitionObject;
        playTime: number;
        duration: number;
        auto: boolean;
    }
    /** */
    class TransitionObject {
        _value: string | number | boolean;
        transition: {
            type: string;
            duration: number;
            ease: string;
        };
    }
}
