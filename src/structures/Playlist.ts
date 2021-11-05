import { Track } from '.';
import { Client } from '../extensions';
import {
    PlaylistInitData,
    PlaylistJSON,
    TrackJSON,
    TrackSource
} from '../interfaces';

class Playlist {
    public readonly client: Client;
    public tracks: Track[];
    public title: string;
    public description: string;
    public thumbnail: string;
    public type: 'album' | 'playlist' | 'artist';
    public source: TrackSource;
    public author: {
        name: string;
        url: string;
    };
    public id: string;
    public url: string;
    public readonly rawPlaylist?: any;

    constructor(client: Client, data: PlaylistInitData) {
        this.client = client;

        this.tracks = data.tracks ?? [];

        this.author = data.author;

        this.description = data.description;

        this.thumbnail = data.thumbnail;

        this.type = data.type;

        this.source = data.source;

        this.id = data.id;

        this.url = data.url;

        this.title = data.title;
    }

    *[Symbol.iterator]() {
        yield* this.tracks;
    }

    toJSON(withTracks = true) {
        const payload = {
            id: this.id,
            url: this.url,
            title: this.title,
            description: this.description,
            thumbnail: this.thumbnail,
            type: this.type,
            source: this.source,
            author: this.author,
            tracks: [] as TrackJSON[]
        };

        if (withTracks) payload.tracks = this.tracks.map((m) => m.toJSON());

        return payload as PlaylistJSON;
    }
}

export default Playlist;
