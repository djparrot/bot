import {
    Collection,
    Guild,
    StageChannel,
    VoiceChannel,
    Snowflake,
    SnowflakeUtil,
    GuildChannelResolvable,
    CommandInteraction,
    TextChannel
} from 'discord.js';
import { StreamDispatcher } from '../handlers';
import { Track } from '.';
import {
    PlayerOptions,
    PlayerProgressbarOptions,
    PlayOptions,
    QueueFilters,
    QueueRepeatMode
} from '../interfaces';
import ytdl from 'discord-ytdl-core';
import { AudioResource, StreamType } from '@discordjs/voice';
import YouTube from 'youtube-sr';
import {
    FilterList,
    buildTimeCode,
    last,
    parseMS,
    createEmbed
} from '../utils';
import { Client } from '../extensions';
import { generateDependencyReport } from '@discordjs/voice';
import { opus, FFmpeg } from 'prism-media';

class Queue {
    public readonly guild: Guild;
    public readonly client: Client;
    public connection: StreamDispatcher;
    public tracks: Track[] = [];
    public previousTracks: Track[] = [];
    public options: PlayerOptions;
    public playing = false;
    public metadata?: CommandInteraction = null;
    public repeatMode: QueueRepeatMode = 0;
    public readonly id: Snowflake = SnowflakeUtil.generate();
    private _streamTime = 0;
    public _cooldownsTimeout = new Collection<string, NodeJS.Timeout>();
    private _activeFilters: any[] = [];
    private _filtersUpdate = false;
    #lastVolume = 0;
    #destroyed = false;

    constructor(client: Client, guild: Guild, options: PlayerOptions = {}) {
        this.client = client;
        this.guild = guild;
        this.options = {};

        Object.assign(
            this.options,
            {
                leaveOnEnd: true,
                leaveOnStop: true,
                leaveOnEmpty: false,
                leaveOnEmptyCooldown: 60000,
                autoSelfDeaf: true,
                ytdlOptions: {
                    highWaterMark: 1 << 25
                },
                initialVolume: 100,
                bufferingTimeout: 3000
            } as PlayerOptions,
            options
        );

        this.client.emit(
            'debug',
            `Queue initialized:\n\n${generateDependencyReport()}`
        );
    }

    get current() {
        if (this.#watchDestroyed()) return;
        return last(this.previousTracks);
    }

    get destroyed() {
        return this.#destroyed;
    }

    nowPlaying() {
        if (this.#watchDestroyed()) return;
        return this.current;
    }

    async connect(channel: GuildChannelResolvable) {
        if (this.#watchDestroyed()) return;
        const _channel = this.guild.channels.resolve(channel) as
            | StageChannel
            | VoiceChannel;
        const connection = await this.client.voiceUtils.connect(_channel, {
            deaf: this.options.autoSelfDeaf,
            maxTime: 20000
        });
        this.connection = connection;

        if (_channel.type === 'GUILD_STAGE_VOICE') {
            await _channel.guild.me.voice.setSuppressed(false).catch(() => {
                _channel.guild.me.voice.setRequestToSpeak(true).catch(() => {});
            });
        }

        this.connection.on('start', (resource) => {
            if (this.#watchDestroyed()) return;
            this.playing = true;
            if (!this._filtersUpdate && resource?.metadata) {
                // DONE: Send track started message
                this.metadata
                    .followUp({
                        ephemeral: true,
                        embeds: [
                            createEmbed()
                                .setAuthor('Now playing')
                                .setTitle(resource.metadata.title)
                                .setURL(resource.metadata.url)
                                .setThumbnail(resource.metadata.thumbnail)
                        ]
                    })
                    .catch(() => {});
            }
            this._filtersUpdate = false;
        });

        this.connection.on('finish', async (resource) => {
            if (this.#watchDestroyed()) return;
            this.playing = false;
            if (this._filtersUpdate) return;
            this._streamTime = 0;
            if (resource && resource.metadata)
                this.previousTracks.push(resource.metadata);

            // Track ended

            if (
                !this.tracks.length &&
                this.repeatMode === QueueRepeatMode.OFF
            ) {
                this.destroy();
                // DONE: Send queue ended message
                this.metadata
                    .followUp({
                        ephemeral: true,
                        content: 'Queue has ended!'
                    })
                    .catch(() => {});
            } else {
                if (this.repeatMode !== QueueRepeatMode.AUTOPLAY) {
                    if (this.repeatMode === QueueRepeatMode.TRACK)
                        return void this.play(last(this.previousTracks), {
                            immediate: true
                        });
                    if (this.repeatMode === QueueRepeatMode.QUEUE)
                        this.tracks.push(last(this.previousTracks));
                    const nextTrack = this.tracks.shift();
                    this.play(nextTrack, { immediate: true });
                    return;
                } else {
                    this._handleAutoplay(last(this.previousTracks));
                }
            }
        });

        return this;
    }

    destroy(disconnect = this.options.leaveOnStop) {
        if (this.#watchDestroyed()) return;
        if (this.connection) this.connection.end();
        if (disconnect) this.connection?.disconnect();
        this.client.queue.delete(this.guild.id);
        this.client.voiceUtils.cache.delete(this.guild.id);
        this.#destroyed = true;
    }

    skip() {
        if (this.#watchDestroyed()) return;
        if (!this.connection) return false;
        this._filtersUpdate = false;
        this.connection.end();
        return true;
    }

    addTrack(track: Track) {
        if (this.#watchDestroyed()) return;
        this.tracks.push(track);
    }

    addTracks(tracks: Track[]) {
        if (this.#watchDestroyed()) return;
        this.tracks.push(...tracks);
    }

    setPaused(paused?: boolean) {
        if (this.#watchDestroyed()) return;
        if (!this.connection) return false;
        return paused ? this.connection.pause(true) : this.connection.resume();
    }

    setBitrate(bitrate: number | 'auto') {
        if (this.#watchDestroyed()) return;
        if (!this.connection?.audioResource?.encoder) return;
        if (bitrate === 'auto')
            bitrate = this.connection.channel?.bitrate ?? 64000;
        this.connection.audioResource.encoder.setBitrate(bitrate);
    }

    setVolume(amount: number) {
        if (this.#watchDestroyed()) return;
        if (!this.connection) return false;
        this.#lastVolume = amount;
        this.options.initialVolume = amount;
        return this.connection.setVolume(amount);
    }

    setRepeatMode(mode: QueueRepeatMode) {
        if (this.#watchDestroyed()) return;
        if (mode === this.repeatMode) return false;
        this.repeatMode = mode;
        return true;
    }

    get volume() {
        if (this.#watchDestroyed()) return;
        if (!this.connection) return 100;
        return this.connection.volume;
    }

    set volume(amount: number) {
        this.setVolume(amount);
    }

    get streamTime() {
        if (this.#watchDestroyed()) return;
        if (!this.connection) return 0;
        const playbackTime = this._streamTime + this.connection.streamTime;
        const NC = this._activeFilters.includes('nightcore') ? 1.25 : null;
        const VW = this._activeFilters.includes('vaporwave') ? 0.8 : null;

        if (NC && VW) return playbackTime * (NC + VW);
        return NC ? playbackTime * NC : VW ? playbackTime * VW : playbackTime;
    }

    set streamTime(time: number) {
        if (this.#watchDestroyed()) return;
        this.seek(time);
    }

    getFiltersEnabled() {
        if (this.#watchDestroyed()) return;
        return FilterList.names.filter((x) => this._activeFilters.includes(x));
    }

    getFiltersDisabled() {
        if (this.#watchDestroyed()) return;
        return FilterList.names.filter((x) => !this._activeFilters.includes(x));
    }

    async setFilters(filters?: QueueFilters) {
        if (this.#watchDestroyed()) return;
        if (!filters || !Object.keys(filters).length) {
            const streamTime = this.streamTime;
            this._activeFilters = [];
            return await this.play(this.current, {
                immediate: true,
                filtersUpdate: true,
                seek: streamTime,
                encoderArgs: []
            });
        }

        const _filters = <(keyof QueueFilters)[]>[];

        for (const filter in filters) {
            if (filters[filter as keyof QueueFilters] === true)
                _filters.push(filter as keyof QueueFilters);
        }

        if (this._activeFilters.join('') === _filters.join('')) return;

        const newFilters = FilterList.create(_filters).trim();
        const streamTime = this.streamTime;
        this._activeFilters = _filters;

        return await this.play(this.current, {
            immediate: true,
            filtersUpdate: true,
            seek: streamTime,
            encoderArgs: !_filters.length ? undefined : ['-af', newFilters]
        });
    }

    async seek(position: number) {
        if (this.#watchDestroyed()) return;
        if (!this.playing || !this.current) return false;
        if (position < 1) position = 0;
        if (position >= this.current.durationMS) return this.skip();

        await this.play(this.current, {
            immediate: true,
            filtersUpdate: true, // to stop events
            seek: position
        });

        return true;
    }

    async back() {
        if (this.#watchDestroyed()) return;
        const prev = this.previousTracks[this.previousTracks.length - 2]; // because last item is the current track

        return await this.play(prev, { immediate: true });
    }

    clear() {
        if (this.#watchDestroyed()) return;
        this.tracks = [];
        this.previousTracks = [];
    }

    stop() {
        if (this.#watchDestroyed()) return;
        return this.destroy();
    }

    shuffle() {
        if (this.#watchDestroyed()) return;
        if (!this.tracks.length || this.tracks.length < 3) return false;
        const currentTrack = this.tracks.shift();

        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }

        this.tracks.unshift(currentTrack);

        return true;
    }

    remove(track: Track | Snowflake | number) {
        if (this.#watchDestroyed()) return;
        let trackFound: Track = null;
        if (typeof track === 'number') {
            trackFound = this.tracks[track];
            if (trackFound) {
                this.tracks = this.tracks.filter((t) => t.id !== trackFound.id);
            }
        } else {
            trackFound = this.tracks.find(
                (s) => s.id === (track instanceof Track ? track.id : track)
            );
            if (trackFound) {
                this.tracks = this.tracks.filter((s) => s.id !== trackFound.id);
            }
        }

        return trackFound;
    }

    jump(track: Track | number): void {
        if (this.#watchDestroyed()) return;
        // remove the track if exists
        const foundTrack = this.remove(track);
        this.tracks.unshift(this.current);
        this.tracks.unshift(foundTrack);

        return void this.skip();
    }

    insert(track: Track, index = 0) {
        this.tracks.splice(index, 0, track);
    }

    getPlayerTimestamp() {
        if (this.#watchDestroyed()) return;
        const currentStreamTime = this.streamTime;
        const totalTime = this.current.durationMS;

        const currentTimecode = buildTimeCode(parseMS(currentStreamTime));
        const endTimecode = buildTimeCode(parseMS(totalTime));

        return {
            current: currentTimecode,
            end: endTimecode,
            progress: Math.round((currentStreamTime / totalTime) * 100)
        };
    }

    createProgressBar(options: PlayerProgressbarOptions = { timecodes: true }) {
        if (this.#watchDestroyed()) return;
        const length =
            typeof options.length === 'number'
                ? options.length <= 0 || options.length === Infinity
                    ? 15
                    : options.length
                : 15;

        const index = Math.round(
            (this.streamTime / this.current.durationMS) * length
        );
        const indicator =
            typeof options.indicator === 'string' &&
            options.indicator.length > 0
                ? options.indicator
                : '🔘';
        const line =
            typeof options.line === 'string' && options.line.length > 0
                ? options.line
                : '▬';

        if (index >= 1 && index <= length) {
            const bar = line.repeat(length - 1).split('');
            bar.splice(index, 0, indicator);
            if (options.timecodes) {
                const timestamp = this.getPlayerTimestamp();
                return `${timestamp.current} ┃ ${bar.join('')} ┃ ${
                    timestamp.end
                }`;
            } else {
                return `${bar.join('')}`;
            }
        } else {
            if (options.timecodes) {
                const timestamp = this.getPlayerTimestamp();
                return `${timestamp.current} ┃ ${indicator}${line.repeat(
                    length - 1
                )} ┃ ${timestamp.end}`;
            } else {
                return `${indicator}${line.repeat(length - 1)}`;
            }
        }
    }

    get totalTime(): number {
        if (this.#watchDestroyed()) return;
        return this.tracks.length > 0
            ? this.tracks.map((t) => t.durationMS).reduce((p, c) => p + c)
            : 0;
    }

    async play(src?: Track, options: PlayOptions = {}): Promise<void> {
        if (this.#watchDestroyed()) return;
        if (!this.connection || !this.connection.voiceConnection)
            throw new Error(
                'Voice connection is not available, use <Queue>.connect()!'
            );
        if (src && (this.playing || this.tracks.length) && !options.immediate)
            return this.addTrack(src);
        const track =
            options.filtersUpdate && !options.immediate
                ? src || this.current
                : src ?? this.tracks.shift();
        if (!track) return;

        if (!options.filtersUpdate) {
            this.previousTracks = this.previousTracks.filter(
                (x) => x.id !== track.id
            );
            this.previousTracks.push(track);
        }

        let stream: opus.Encoder | FFmpeg;
        if (['youtube', 'spotify', 'deezer'].includes(track.raw.source)) {
            if (
                (track.raw.source === 'spotify' ||
                    track.raw.source === 'deezer') &&
                !track.raw.engine
            ) {
                track.raw.engine = await YouTube.search(
                    `${track.author} ${track.title}`,
                    { type: 'video' }
                )
                    .then((x) => {
                        track.duration = buildTimeCode(parseMS(x[0].duration));
                        return x[0].url;
                    })
                    .catch(() => null);
            }
            const link =
                track.raw.source === 'spotify' || track.raw.source === 'deezer'
                    ? track.raw.engine
                    : track.url;
            if (!link)
                return void this.play(this.tracks.shift(), { immediate: true });

            stream = ytdl(link, {
                opusEncoded: false,
                filter: 'audioonly',
                fmt: 's16le',
                encoderArgs:
                    options.encoderArgs ?? this._activeFilters.length
                        ? ['-af', FilterList.create(this._activeFilters)]
                        : [],
                seek: options.seek ? options.seek / 1000 : undefined,
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        cookie: process.env.YOUTUBE_COOKIE,
                        'x-youtube-identity-token': process.env.YOUTUBE_TOKEN,
                        'user-agent':
                            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
                    }
                }
            }).on('error', (err) =>
                err.message.toLowerCase().includes('premature close')
                    ? void 0
                    : this.connection.emit('error', err)
            );
        } else {
            stream = ytdl
                .arbitraryStream(
                    track.raw.source === 'soundcloud'
                        ? await track.raw.engine.downloadProgressive()
                        : typeof track.raw.engine === 'function'
                        ? await track.raw.engine()
                        : track.raw.engine,
                    {
                        opusEncoded: false,
                        fmt: 's16le',
                        encoderArgs:
                            options.encoderArgs ?? this._activeFilters.length
                                ? [
                                      '-af',
                                      FilterList.create(this._activeFilters)
                                  ]
                                : [],
                        seek: options.seek ? options.seek / 1000 : 0
                    }
                )
                .on('error', (err) =>
                    err.message.toLowerCase().includes('premature close')
                        ? void 0
                        : this.connection.emit('error', err)
                );
        }

        const resource: AudioResource<Track> = this.connection.createStream(
            stream,
            {
                type: StreamType.Raw,
                data: track
            }
        );

        if (options.seek) this._streamTime = options.seek;
        this._filtersUpdate = options.filtersUpdate;
        this.setVolume(this.options.initialVolume);

        setTimeout(() => {
            this.connection.playStream(resource);
        }, this.#getBufferingTimeout()).unref();
    }

    private async _handleAutoplay(track: Track): Promise<void> {
        if (this.#watchDestroyed()) return;
        if (
            !track ||
            ![track.source, track.raw?.source, track.raw?.engine].includes(
                'youtube'
            )
        ) {
            this.destroy();
            // DONE: Send queue ended message
            this.metadata
                .followUp({
                    ephemeral: true,
                    content: 'Queue has ended!'
                })
                .catch(() => {});
            return;
        }
        const info = await YouTube.getVideo(track.raw?.engine ?? track.url)
            .then((x) => x.videos[0])
            .catch(() => {});
        if (!info) {
            this.destroy();
            // DONE: Send queue ended message
            this.metadata
                .followUp({
                    ephemeral: true,
                    content: 'Queue has ended!'
                })
                .catch(() => {});
            return;
        }

        const nextTrack = new Track(this.client, {
            title: info.title,
            url: `https://www.youtube.com/watch?v=${info.id}`,
            duration: info.durationFormatted
                ? buildTimeCode(parseMS(info.duration * 1000))
                : '0:00',
            description: '',
            thumbnail:
                typeof info.thumbnail === 'string'
                    ? info.thumbnail
                    : info.thumbnail.url,
            views: info.views,
            author: info.channel.name,
            requestedBy: track.requestedBy,
            source: 'youtube'
        });

        this.play(nextTrack, { immediate: true });
    }

    *[Symbol.iterator]() {
        if (this.#watchDestroyed()) return;
        yield* this.tracks;
    }

    toJSON() {
        if (this.#watchDestroyed()) return;
        return {
            id: this.id,
            guild: this.guild.id,
            voiceChannel: this.connection?.channel?.id,
            options: this.options,
            tracks: this.tracks.map((m) => m.toJSON())
        };
    }

    toString() {
        if (this.#watchDestroyed()) return;
        if (!this.tracks.length) return 'No songs available to display!';
        return `**Upcoming Songs:**\n${this.tracks
            .map((m, i) => `${i + 1}. **${m.title}**`)
            .join('\n')}`;
    }

    #watchDestroyed() {
        return this.#destroyed;
    }

    #getBufferingTimeout() {
        const timeout = this.options.bufferingTimeout;

        if (isNaN(timeout) || timeout < 0 || !Number.isFinite(timeout))
            return 1000;
        return timeout;
    }
}

export default Queue;
