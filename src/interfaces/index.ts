import Database from './database';
import { Snowflake, User, UserResolvable } from 'discord.js';
import { Readable, Duplex } from 'stream';
import { Queue, Track, Playlist } from '../structures';
import { StreamDispatcher } from '../handlers';
import { downloadOptions } from 'ytdl-core';

export { Database };

export type FiltersName = keyof QueueFilters;

export interface QueueFilters {
    bassboost_low?: boolean;
    bassboost?: boolean;
    bassboost_high?: boolean;
    '8D'?: boolean;
    vaporwave?: boolean;
    nightcore?: boolean;
    phaser?: boolean;
    tremolo?: boolean;
    vibrato?: boolean;
    reverse?: boolean;
    treble?: boolean;
    normalizer?: boolean;
    normalizer2?: boolean;
    surrounding?: boolean;
    pulsator?: boolean;
    subboost?: boolean;
    karaoke?: boolean;
    flanger?: boolean;
    gate?: boolean;
    haas?: boolean;
    mcompand?: boolean;
    mono?: boolean;
    mstlr?: boolean;
    mstrr?: boolean;
    compressor?: boolean;
    expander?: boolean;
    softlimiter?: boolean;
    chorus?: boolean;
    chorus2d?: boolean;
    chorus3d?: boolean;
    fadein?: boolean;
    dim?: boolean;
    earrape?: boolean;
}

export type TrackSource =
    | 'soundcloud'
    | 'youtube'
    | 'spotify'
    | 'deezer'
    | 'arbitrary';

export interface RawTrackData {
    title: string;
    description: string;
    author: string;
    url: string;
    thumbnail: string;
    duration: string;
    views: number;
    requestedBy: User;
    playlist?: Playlist;
    source?: TrackSource;
    engine?: any;
    live?: boolean;
    raw?: any;
}

export interface TimeData {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

export interface PlayerProgressbarOptions {
    timecodes?: boolean;
    length?: number;
    line?: string;
    indicator?: string;
}

export interface PlayerOptions {
    leaveOnEnd?: boolean;
    leaveOnStop?: boolean;
    leaveOnEmpty?: boolean;
    leaveOnEmptyCooldown?: number;
    autoSelfDeaf?: boolean;
    ytdlOptions?: downloadOptions;
    initialVolume?: number;
    bufferingTimeout?: number;
}

export interface ExtractorModelData {
    playlist?: {
        title: string;
        description: string;
        thumbnail: string;
        type: 'album' | 'playlist' | 'artist';
        source: TrackSource;
        author: {
            name: string;
            url: string;
        };
        id: string;
        url: string;
        rawPlaylist?: any;
    };
    data: {
        title: string;
        duration: number;
        thumbnail: string;
        engine: string | Readable | Duplex;
        views: number;
        author: string;
        description: string;
        url: string;
        version?: string;
        source?: TrackSource;
    }[];
}

export enum QueryType {
    AUTO = 'auto',
    YOUTUBE = 'youtube',
    YOUTUBE_PLAYLIST = 'youtube_playlist',
    SOUNDCLOUD_TRACK = 'soundcloud_track',
    SOUNDCLOUD_PLAYLIST = 'soundcloud_playlist',
    SOUNDCLOUD = 'soundcloud',
    SPOTIFY_SONG = 'spotify_song',
    SPOTIFY_ALBUM = 'spotify_album',
    SPOTIFY_ARTIST = 'spotify_artist',
    SPOTIFY_PLAYLIST = 'spotify_playlist',
    DEEZER_SONG = 'deezer_song',
    DEEZER_ALBUM = 'deezer_album',
    DEEZER_ARTIST = 'deezer_artist',
    DEEZER_PLAYLIST = 'deezer_playlist',
    YOUTUBE_SEARCH = 'youtube_search',
    YOUTUBE_VIDEO = 'youtube_video',
    SOUNDCLOUD_SEARCH = 'soundcloud_search'
}

export interface PlayerEvents {
    botDisconnect: (queue: Queue) => any;
    channelEmpty: (queue: Queue) => any;
    connectionCreate: (queue: Queue, connection: StreamDispatcher) => any;
    debug: (queue: Queue, message: string) => any;
    error: (queue: Queue, error: Error) => any;
    connectionError: (queue: Queue, error: Error) => any;
    queueEnd: (queue: Queue) => any;
    trackAdd: (queue: Queue, track: Track) => any;
    tracksAdd: (queue: Queue, track: Track[]) => any;
    trackStart: (queue: Queue, track: Track) => any;
    trackEnd: (queue: Queue, track: Track) => any;
}

export interface PlayOptions {
    filtersUpdate?: boolean;
    encoderArgs?: string[];
    seek?: number;
    immediate?: boolean;
}

export interface SearchOptions {
    requestedBy: UserResolvable;
    searchEngine?: QueryType;
    blockExtractor?: boolean;
}

export enum QueueRepeatMode {
    OFF = 0,
    TRACK = 1,
    QUEUE = 2,
    AUTOPLAY = 3
}

export interface PlaylistInitData {
    tracks: Track[];
    title: string;
    description: string;
    thumbnail: string;
    type: 'album' | 'playlist' | 'artist';
    source: TrackSource;
    author: {
        name: string;
        url: string;
    };
    id: string;
    url: string;
    rawPlaylist?: any;
}

export interface TrackJSON {
    title: string;
    url: string;
    thumbnail: string;
    duration: number;
    artist: string;
}

export interface PlaylistJSON {
    id: string;
    url: string;
    title: string;
    description: string;
    thumbnail: string;
    type: 'album' | 'playlist' | 'artist';
    source: TrackSource;
    author: {
        name: string;
        url: string;
    };
    tracks: TrackJSON[];
}

export interface PlayerInitOptions {
    autoRegisterExtractor?: boolean;
    ytdlOptions?: downloadOptions;
    connectionTimeout?: number;
}
