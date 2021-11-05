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
    duration: number;
    artist: string;
}

export interface PlaylistDB {
    _id?: string;
    owner: PlaylistOwner;
    description: string;
    songs: Song[];
    liked: string[];
    listen: number;
}

export const playlistSchema = new Schema({
    _id: { type: String },
    owner: { type: Object, required: true },
    description: { type: String, default: 'No description' },
    songs: { type: Array, required: true },
    liked: { type: Array, default: [] },
    listen: { type: Number, default: 0 }
});

export const playlistModel = model<PlaylistDB>('playlists', playlistSchema);
