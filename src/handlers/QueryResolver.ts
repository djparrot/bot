import { validateID, validateURL } from 'ytdl-core';
import { YouTube } from 'youtube-sr';
import { QueryType } from '../interfaces';
// @ts-ignore
import { validateURL as SoundcloudValidateURL } from 'soundcloud-scraper';

const spotifySongRegex =
    /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const spotifyPlaylistRegex =
    /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/;
const spotifyAlbumRegex =
    /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/;
const spotifyArtistRegex =
    /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:artist\/|\?uri=spotify:artist:)((\w|-){22})/;

class QueryResolver {
    static resolve(query: string): QueryType {
        if (SoundcloudValidateURL(query, 'track'))
            return QueryType.SOUNDCLOUD_TRACK;
        if (
            SoundcloudValidateURL(query, 'playlist') ||
            query.includes('/sets/')
        )
            return QueryType.SOUNDCLOUD_PLAYLIST;
        if (YouTube.isPlaylist(query)) return QueryType.YOUTUBE_PLAYLIST;
        if (validateID(query) || validateURL(query))
            return QueryType.YOUTUBE_VIDEO;
        if (spotifySongRegex.test(query)) return QueryType.SPOTIFY_SONG;
        if (spotifyPlaylistRegex.test(query)) return QueryType.SPOTIFY_PLAYLIST;
        if (spotifyAlbumRegex.test(query)) return QueryType.SPOTIFY_ALBUM;
        if (spotifyArtistRegex.test(query)) return QueryType.SPOTIFY_ARTIST;
        if (query.includes('https://') && query.includes('deezer.com')) {
            if (query.includes('track')) return QueryType.DEEZER_SONG;
            if (query.includes('playlist')) return QueryType.DEEZER_PLAYLIST;
            if (query.includes('artist')) return QueryType.DEEZER_ARTIST;
            if (query.includes('album')) return QueryType.DEEZER_ALBUM;
        }

        return QueryType.YOUTUBE_SEARCH;
    }
}

export default QueryResolver;
