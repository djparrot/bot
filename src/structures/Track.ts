import { User, Util, SnowflakeUtil, Snowflake } from 'discord.js';
import { RawTrackData, TrackJSON } from '../interfaces';
import { Playlist, Queue } from '.';
import { Client } from '../extensions';

class Track {
    public client: Client;
    public title: string;
    public description: string;
    public author: string;
    public url: string;
    public thumbnail: string;
    public duration: string;
    public views: number;
    public requestedBy: User;
    public playlist?: Playlist;
    public readonly raw: RawTrackData = {} as RawTrackData;
    public readonly id: Snowflake = SnowflakeUtil.generate();

    constructor(client: Client, data: RawTrackData) {
        Object.defineProperty(this, 'client', {
            value: client,
            enumerable: false
        });

        void this._patch(data);
    }

    private _patch(data: RawTrackData) {
        this.title = Util.escapeMarkdown(data.title ?? '');
        this.author = data.author ?? '';
        this.url = data.url ?? '';
        this.thumbnail = data.thumbnail ?? '';
        this.duration = data.duration ?? '';
        this.views = data.views ?? 0;
        this.requestedBy = data.requestedBy;
        this.playlist = data.playlist;

        Object.defineProperty(this, 'raw', {
            value: Object.assign(
                {},
                { source: data.raw?.source ?? data.source },
                data.raw ?? data
            ),
            enumerable: false
        });
    }

    get queue(): Queue {
        return this.client.queue.find((q) => q.tracks.includes(this));
    }

    get durationMS(): number {
        const times = (n: number, t: number) => {
            let tn = 1;
            for (let i = 0; i < t; i++) tn *= n;
            return t <= 0 ? 1000 : tn * 1000;
        };

        return this.duration
            .split(':')
            .reverse()
            .map((m, i) => parseInt(m) * times(60, i))
            .reduce((a, c) => a + c, 0);
    }

    get source() {
        return this.raw.source ?? 'arbitrary';
    }

    toString(): string {
        return `${this.title} by ${this.author}`;
    }

    toJSON(hidePlaylist?: boolean) {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            author: this.author,
            url: this.url,
            thumbnail: this.thumbnail,
            duration: this.duration,
            durationMS: this.durationMS,
            views: this.views,
            requestedBy: this.requestedBy.id,
            playlist: hidePlaylist ? null : this.playlist?.toJSON() ?? null
        } as TrackJSON;
    }
}

export default Track;
