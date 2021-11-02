import { Schema, model } from 'mongoose';

interface PlaylistOwner {
    username: string;
    id: string;
    discriminator: string;
    avatar: string;
}

interface Song {
    title: string;
    url: string;
    thumbnail: string;
    live: boolean;
    duration: number;
    artist: string;
    type: 'youtube' | 'spotify' | 'deezer' | 'soundcloud';
    stream: string;
}

export interface PlaylistDB {
    _id?: string;
    owner: PlaylistOwner;
    description: string;
    songs: Song[];
    liked: string[];
}

export const playlistSchema = new Schema({
    _id: { type: String },
    owner: { type: Object },
    description: { type: String },
    songs: { type: Array },
    liked: { type: Array }
});

export const playlistModel = model<PlaylistDB>('playlists', playlistSchema);
