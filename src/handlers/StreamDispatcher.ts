import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    VoiceConnection,
    VoiceConnectionStatus,
    VoiceConnectionDisconnectReason
} from '@discordjs/voice';
import { StageChannel, VoiceChannel } from 'discord.js';
import { Duplex, Readable } from 'stream';
import { TypedEmitter as EventEmitter } from 'tiny-typed-emitter';
import { Track } from '../structures';
import { wait } from '../utils';

export interface VoiceEvents {
    error: (error: Error) => any;
    debug: (message: string) => any;
    start: (resource: AudioResource<Track>) => any;
    finish: (resource: AudioResource<Track>) => any;
}

class StreamDispatcher extends EventEmitter<VoiceEvents> {
    public readonly voiceConnection: VoiceConnection;
    public readonly audioPlayer: AudioPlayer;
    public channel: VoiceChannel | StageChannel;
    public audioResource?: AudioResource<Track>;
    private readyLock = false;
    public paused: boolean;

    constructor(
        connection: VoiceConnection,
        channel: VoiceChannel | StageChannel,
        public readonly connectionTimeout: number = 20000
    ) {
        super();

        this.voiceConnection = connection;
        this.audioPlayer = createAudioPlayer();
        this.channel = channel;
        this.paused = false;

        this.voiceConnection.on('stateChange', async (_, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (
                    newState.reason ===
                        VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
                ) {
                    try {
                        await entersState(
                            this.voiceConnection,
                            VoiceConnectionStatus.Connecting,
                            this.connectionTimeout
                        );
                    } catch {
                        this.voiceConnection.destroy();
                    }
                } else if (this.voiceConnection.rejoinAttempts < 5) {
                    await wait(
                        (this.voiceConnection.rejoinAttempts + 1) * 5000
                    );
                    this.voiceConnection.rejoin();
                } else {
                    this.voiceConnection.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                this.end();
            } else if (
                !this.readyLock &&
                (newState.status === VoiceConnectionStatus.Connecting ||
                    newState.status === VoiceConnectionStatus.Signalling)
            ) {
                this.readyLock = true;
                try {
                    await entersState(
                        this.voiceConnection,
                        VoiceConnectionStatus.Ready,
                        this.connectionTimeout
                    );
                } catch {
                    if (
                        this.voiceConnection.state.status !==
                        VoiceConnectionStatus.Destroyed
                    )
                        this.voiceConnection.destroy();
                } finally {
                    this.readyLock = false;
                }
            }
        });

        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Playing) {
                if (!this.paused)
                    return void this.emit('start', this.audioResource);
            } else if (
                newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle
            ) {
                if (!this.paused) {
                    void this.emit('finish', this.audioResource);
                    this.audioResource = null;
                }
            }
        });

        this.audioPlayer.on('debug', (m) => void this.emit('debug', m));
        this.audioPlayer.on('error', (error) => void this.emit('error', error));
        this.voiceConnection.on('debug', (m) => void this.emit('debug', m));
        this.voiceConnection.on(
            'error',
            (error) => void this.emit('error', error)
        );
        this.voiceConnection.subscribe(this.audioPlayer);
    }

    createStream(
        src: Readable | Duplex | string,
        ops?: { type?: StreamType; data?: any }
    ) {
        this.audioResource = createAudioResource(src, {
            inputType: ops?.type ?? StreamType.Arbitrary,
            metadata: ops?.data,
            inlineVolume: true
        });

        return this.audioResource;
    }

    get status() {
        return this.audioPlayer.state.status;
    }

    disconnect() {
        try {
            this.audioPlayer.stop(true);
            this.voiceConnection.destroy();
        } catch {}
    }

    end() {
        this.audioPlayer.stop();
    }

    pause(interpolateSilence?: boolean) {
        const success = this.audioPlayer.pause(interpolateSilence);
        this.paused = success;
        return success;
    }

    resume() {
        const success = this.audioPlayer.unpause();
        this.paused = !success;
        return success;
    }

    async playStream(resource: AudioResource<Track> = this.audioResource) {
        if (!this.audioResource) this.audioResource = resource;
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Ready) {
            try {
                await entersState(
                    this.voiceConnection,
                    VoiceConnectionStatus.Ready,
                    this.connectionTimeout
                );
            } catch (err) {
                return void this.emit('error', err);
            }
        }

        try {
            this.audioPlayer.play(resource);
        } catch (e) {
            this.emit('error', e);
        }

        return this;
    }

    setVolume(value: number) {
        if (
            !this.audioResource ||
            isNaN(value) ||
            value < 0 ||
            value > Infinity
        )
            return false;

        this.audioResource.volume.setVolumeLogarithmic(value / 100);
        return true;
    }

    get volume() {
        if (!this.audioResource || !this.audioResource.volume) return 100;
        const currentVol = this.audioResource.volume.volume;
        return Math.round(Math.pow(currentVol, 1 / 1.660964) * 100);
    }

    get streamTime() {
        if (!this.audioResource) return 0;
        return this.audioResource.playbackDuration;
    }
}

export default StreamDispatcher;
