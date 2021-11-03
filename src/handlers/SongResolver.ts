/*import Youtube, { Video } from 'youtube-sr';
import Deezer from 'deezer-web-api';

const deezerApi = new Deezer();
import { getAudioUrl } from 'google-tts-api';
import { Client as SCClient, Playlist } from 'soundcloud-scraper';

const scdl = new SCClient();
// @ts-ignore
import ytpl from 'ytpl';
import axios from 'axios';
import { Client } from '../extensions';
import { logger } from '../services';
import { Song } from '../extensions/client';

export default class SongResolver {
    constructor(private client: Client, private query: any) {}

    public async searchYoutube() {
        let searched: Video;
        try {
            searched = await Youtube.searchOne(this.query);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:youtube:792414019007938602> Youtube."
            );
        }
        if (!searched?.url) {
            return new Error(
                "I couldn't find anything on <:youtube:792414019007938602> Youtube."
            );
        }
        const song: Song = {
            title: searched.title ?? 'Unknown song',
            thumbnail:
                searched.thumbnail?.url ??
                'https://cdn.discordapp.com/emojis/792414019007938602.png',
            live: searched.views === 0,
            duration: searched.duration,
            artist: searched.channel?.name ?? 'Unknown artist',
            type: 'youtube',
            url: searched.url,
            stream: searched.url
        };
        return song;
    }

    public async getSpotifySong(img?: string) {
        if (typeof this.query === 'string') {
            let res: Response<SpotifyApi.SingleTrackResponse>;
            try {
                res = await this.client.spotifyApi.getTrack(
                    this.query.split('/track/')[1].split('?')[0]
                );
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            if (!res?.body?.name) {
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            let searched: Video;
            try {
                searched = await Youtube.searchOne(
                    `${res.body.name} ${res.body.artists[0].name}`
                );
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            if (!searched?.url) {
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            const song: Song = {
                title: res.body.name ?? 'Unknown song',
                url: res.body.external_urls.spotify,
                thumbnail:
                    res.body.album.images[0].url ??
                    'https://cdn.discordapp.com/emojis/792414019007938602.png',
                live: searched.views === 0,
                duration: searched.duration,
                artist:
                    res.body.artists.map((a) => a.name).join(', ') ??
                    'Unknown artist',
                type: 'youtube',
                stream: searched.url
            };
            return song;
        } else {
            let searched: Video;
            try {
                if (this.query.track) {
                    searched = await Youtube.searchOne(
                        `${this.query.track.name} ${this.query.track.artists[0].name}`
                    );
                } else {
                    searched = await Youtube.searchOne(
                        `${this.query.name} ${this.query.artists[0].name}`
                    );
                }
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            if (!searched?.url) {
                return new Error(
                    "I couldn't find anything on <:spotify:801475401309880370> Spotify."
                );
            }
            const song: Song = {
                title: this.query.name ?? this.query.track.name,
                url:
                    this.query.external_urls?.spotify ??
                    this.query.track.external_urls.spotify,
                thumbnail:
                    img ??
                    this.query.album?.images[0].url ??
                    this.query.track.album.images[0].url,
                live: searched.views === 0,
                duration: searched.duration,
                artist:
                    this.query.artists
                        ?.map((a: SpotifyApi.ArtistObjectSimplified) => a.name)
                        .join(', ') ??
                    this.query.track.artists
                        ?.map((a: SpotifyApi.ArtistObjectSimplified) => a.name)
                        .join(', '),
                type: 'youtube',
                stream: searched.url
            };
            return song;
        }
    }

    public async getDeezerSong(img?: string) {
        if (typeof this.query === 'string') {
            let res: any;
            try {
                res = await deezerApi.musics.getTrack(
                    this.query.split('/track/')[1].split('?')[0]
                );
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            if (!res?.link) {
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            let searched: Video;
            try {
                searched = await Youtube.searchOne(
                    `${res.title} ${res.artist.name}`
                );
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            if (!searched?.url) {
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            const song: Song = {
                title: res.title,
                url: res.link,
                thumbnail: res.album.cover,
                live: searched.views === 0,
                duration: searched.duration,
                artist: res.artist.name,
                type: 'youtube',
                stream: searched.url
            };
            return song;
        } else {
            let searched: Video;
            try {
                searched = await Youtube.searchOne(
                    `${this.query.title} ${this.query.artist.name}`
                );
            } catch (err) {
                logger.log(err);
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            if (!searched?.url) {
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            const song: Song = {
                title: this.query.title,
                url: this.query.link,
                thumbnail: img ?? this.query.album.cover,
                live: searched.views === 0,
                duration: searched.duration,
                artist: this.query.artist.name,
                type: 'youtube',
                stream: searched.url
            };
            return song;
        }
    }

    public async getSpotifyPlaylist() {
        let res: Response<SpotifyApi.SinglePlaylistResponse>;
        try {
            res = await this.client.spotifyApi.getPlaylist(
                this.query.split('/playlist/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.external_urls?.spotify) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body;
    }

    public async getDeezerPlaylist() {
        let res: any;
        try {
            res = await deezerApi.musics.getPlaylist(
                this.query.split('/playlist/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        if (!res?.link) {
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        return res;
    }

    public async getYoutubePlaylist() {
        const plalistId = this.query.includes('?list=')
            ? this.query.split('?list=')[1].split('&')[0]
            : this.query.split('&list=')[1].split('&')[0];
        let res: ytpl.Result;
        try {
            res = await ytpl(plalistId);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:youtube:792414019007938602> Youtube."
            );
        }
        if (!res?.title) {
            return new Error(
                "I couldn't find anything on <:youtube:792414019007938602> Youtube."
            );
        }
        return res;
    }

    public getYoutubeSong() {
        const song: Song = {
            title: this.query.title,
            url: this.query.url,
            thumbnail: this.query.bestThumbnail.url,
            live: this.query.isLive,
            duration: this.query.durationSec * 1000,
            artist: this.query.author.name,
            type: 'youtube',
            stream: this.query.url
        };
        return song;
    }

    public async searchSpotifyPlaylist() {
        let res: Response<SpotifyApi.SearchResponse>;
        try {
            res = await this.client.spotifyApi.searchPlaylists(this.query);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.playlists?.items?.length) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body.playlists.items[0].external_urls.spotify;
    }

    public getTTS() {
        const tts = getAudioUrl(this.query);
        const song: Song = {
            title: this.query,
            url: 'https://djparrot.xyz',
            thumbnail: 'https://djparrot.xyz/DJParrot.png',
            live: false,
            duration: 0,
            artist: 'DJ Parrot Text To Speech API',
            type: 'tts',
            stream: tts
        };
        return song;
    }

    public async getSoundcloudPlaylist() {
        let res: Playlist;
        try {
            res = await scdl.getPlaylist(this.query);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:soundcloud:807547178285269002> SoundCloud."
            );
        }
        if (!res?.title || !res?.tracks?.length) {
            return new Error(
                "I couldn't find anything on <:soundcloud:807547178285269002> SoundCloud."
            );
        }
        return res;
    }

    public async searchSpotifyAlbum() {
        let res: Response<SpotifyApi.SearchResponse>;
        try {
            res = await this.client.spotifyApi.searchAlbums(this.query);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.albums?.items?.length) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body.albums.items[0].external_urls.spotify;
    }

    public async searchSpotifyArtist() {
        let res: Response<SpotifyApi.SearchResponse>;
        try {
            res = await this.client.spotifyApi.searchArtists(this.query);
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.artists?.items?.length) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body.artists.items[0].external_urls.spotify;
    }

    public async getSpotifyAlbum() {
        let res: Response<SpotifyApi.SingleAlbumResponse>;
        try {
            res = await this.client.spotifyApi.getAlbum(
                this.query.split('/album/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.external_urls?.spotify) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body;
    }

    public async getSpotifyArtist() {
        let res: Response<SpotifyApi.SingleArtistResponse>;
        try {
            res = await this.client.spotifyApi.getArtist(
                this.query.split('/artist/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.external_urls?.spotify) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body;
    }

    public async getSpotifyArtistTopTracks() {
        let res: Response<SpotifyApi.ArtistsTopTracksResponse>;
        try {
            res = await this.client.spotifyApi.getArtistTopTracks(
                this.query.split('/artist/')[1].split('?')[0],
                'GB'
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        if (!res?.body?.tracks?.length) {
            return new Error(
                "I couldn't find anything on <:spotify:801475401309880370> Spotify."
            );
        }
        return res.body.tracks;
    }

    public async getDeezerAlbum() {
        let res: any;
        try {
            res = await deezerApi.musics.getAlbum(
                this.query.split('/album/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        if (!res?.title) {
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        return res;
    }

    public async getDeezerArtist() {
        let res: any;
        try {
            res = await deezerApi.users.getArtist(
                this.query.split('/artist/')[1].split('?')[0]
            );
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        if (!res?.name) {
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        let data: any;
        try {
            data = await axios.get(
                `https://api.deezer.com/artist/${
                    this.query.split('/artist/')[1].split('?')[0]
                }/top?limit=10`
            );
            if (!data) {
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
            data = data.data;
            if (!data?.data?.length) {
                return new Error(
                    "I couldn't find anything on <:deezer:808421337735233577> Deezer."
                );
            }
        } catch (err) {
            logger.log(err);
            return new Error(
                "I couldn't find anything on <:deezer:808421337735233577> Deezer."
            );
        }
        return Object.assign(res, data);
    }
}

interface Response<T> {
    body: T;
    headers: Record<string, string>;
    statusCode: number;
}*/
