import {
    Client as DiscordClient,
    Collection,
    CommandInteraction,
    GuildResolvable,
    Intents,
    User
} from 'discord.js';
import { Command, loadCommands } from '../commands/command-handler';
import Database from '../interfaces/database';
import { logger } from '../services';
import { loadEvents } from '../events/event-handler';
import { REST } from '@discordjs/rest';
import { Playlist, Queue, Track } from '../structures';
import { buildTimeCode, last, parseMS, VoiceUtils } from '../utils';
import { PlayerOptions, QueryType, SearchOptions } from '../interfaces';
import { QueryResolver } from '../handlers';
import { getInfo } from 'ytdl-core';
import {
    Client as SoundCloud,
    SearchResult as SoundCloudSearchResult
} from 'soundcloud-scraper';
import Deezer from 'deezer-web-api';
import YouTube from 'youtube-sr';
import Spotify from 'spotify-url-info';
import { ExtractorModel } from '../services/extractors';
import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';
import api from './../services/api';

const soundcloud = new SoundCloud();
const deezerApi = new Deezer();

export default class Client extends DiscordClient {
    public static instance: Client;
    public readonly extractors = new Collection<string, ExtractorModel>();
    public commands = new Collection<string, Command>();
    public queue = new Collection<string, Queue>();
    public spotifyApi: SpotifyWebApi;
    public voiceUtils: VoiceUtils;
    public restClient: REST;

    constructor(token: string, public db: Database) {
        super({
            allowedMentions: {
                repliedUser: false
            },
            intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS]
        });
        this.restClient = new REST({ version: '9' }).setToken(token);
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env['SPOTIFY_CLIENT_ID'],
            clientSecret: process.env['SPOTIFY_CLIENT_SECRET']
        });
        this.voiceUtils = new VoiceUtils();
        Client.instance = this;
        this.token = token;
    }

    public async start() {
        logger.log('Registering events...'.italic.magenta);
        const events = loadEvents(this);
        logger.log(`Successfully registered ${events} events!`);

        logger.log('Loading client...'.italic.magenta);
        await super.login(this.token);
        logger.log(`Logged in as ${this.user.tag}!`);

        logger.log('Connecting to the database...'.italic.magenta);
        const dbConnected = await this.db.connect();
        if (!dbConnected) throw new Error('Failed to connect to the database!');
        logger.log('Database connected!');

        logger.log('Registering commands...'.italic.magenta);
        await loadCommands(this);
        logger.log(`Successfully registered ${this.commands.size} commands!`);

        logger.log('Loading spotify api...'.italic.magenta);
        const spt = await this._getSpotifyToken();
        if (spt instanceof Error) throw spt;
        this.spotifyApi.setAccessToken(spt.accessToken);
        setInterval(async () => {
            const token = await this._getSpotifyToken();
            if (token instanceof Error) return;
            this.spotifyApi.setAccessToken(token.accessToken);
        }, spt.expiresIn * 1000);
        logger.log('Spotify api loaded!');

        logger.log('Starting api...'.italic.magenta);
        const port = await api(this);
        logger.log('Api is listening to port:', port);
    }

    private async _getSpotifyToken() {
        const res = await axios({
            url: 'https://accounts.spotify.com/api/token?grant_type=client_credentials',
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                ).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).catch(() => {});
        // @ts-ignore
        if (!res?.data?.token_type)
            return new Error('Failed to get spotify token!');
        const data = {
            tokenType: res.data.token_type as string,
            accessToken: res.data.access_token as string,
            expiresIn: res.data.expires_in as number
        };
        return data;
    }

    createQueue(
        guild: GuildResolvable,
        queueInitOptions: PlayerOptions & { metadata?: CommandInteraction } = {}
    ): Queue {
        guild = this.guilds.resolve(guild);
        if (!guild) throw new Error('Unknown Guild');
        if (this.queue.has(guild.id)) return this.queue.get(guild.id) as Queue;

        const _meta = queueInitOptions.metadata;
        delete queueInitOptions['metadata'];
        if (!queueInitOptions.ytdlOptions) queueInitOptions.ytdlOptions = {};
        const queue = new Queue(this, guild, queueInitOptions);
        queue.metadata = _meta;
        this.queue.set(guild.id, queue);

        return queue as Queue;
    }

    getQueue(guild: GuildResolvable) {
        guild = this.guilds.resolve(guild);
        if (!guild) throw new Error('Unknown Guild');
        return this.queue.get(guild.id) as Queue;
    }

    deleteQueue(guild: GuildResolvable) {
        guild = this.guilds.resolve(guild);
        if (!guild) return new Error('Unknown Guild');
        const prev = this.getQueue(guild);

        try {
            prev.destroy();
        } catch {}
        this.queue.delete(guild.id);

        return prev;
    }

    async search(query: string | Track, options: SearchOptions) {
        if (query instanceof Track) return { playlist: null, tracks: [query] };
        options.requestedBy = this.users.resolve(options.requestedBy);
        if (!('searchEngine' in options)) options.searchEngine = QueryType.AUTO;

        for (const [_, extractor] of this.extractors) {
            if (options.blockExtractor) break;
            if (!extractor.validate(query)) continue;
            const data = await extractor.handle(query);
            if (data && data.data.length) {
                const playlist = !data.playlist
                    ? null
                    : new Playlist(this, {
                          ...data.playlist,
                          tracks: []
                      });

                const tracks = data.data.map(
                    (m) =>
                        new Track(this, {
                            ...m,
                            requestedBy: options.requestedBy as User,
                            duration: buildTimeCode(parseMS(m.duration)),
                            playlist: playlist
                        })
                );

                if (playlist) playlist.tracks = tracks;

                return { playlist: playlist, tracks: tracks };
            }
        }

        const qt =
            options.searchEngine === QueryType.AUTO
                ? QueryResolver.resolve(query)
                : options.searchEngine;

        switch (qt) {
            case QueryType.YOUTUBE_VIDEO: {
                const info = await getInfo(query).catch(() => {});
                if (!info) return { playlist: null, tracks: [] };

                const track = new Track(this, {
                    title: info.videoDetails.title,
                    description: info.videoDetails.description,
                    author: info.videoDetails.author?.name,
                    url: info.videoDetails.video_url,
                    requestedBy: options.requestedBy as User,
                    thumbnail: last(info.videoDetails.thumbnails)?.url,
                    views:
                        parseInt(
                            info.videoDetails.viewCount.replace(/[^0-9]/g, '')
                        ) || 0,
                    duration: buildTimeCode(
                        parseMS(
                            parseInt(info.videoDetails.lengthSeconds) * 1000
                        )
                    ),
                    source: 'youtube',
                    raw: info
                });

                return { playlist: null, tracks: [track] };
            }
            case QueryType.YOUTUBE_SEARCH: {
                const videos = await YouTube.search(query, {
                    type: 'video'
                }).catch(() => {});
                if (!videos) return { playlist: null, tracks: [] };

                const tracks = videos.map((m) => {
                    (m as any).source = 'youtube';
                    return new Track(this, {
                        title: m.title,
                        description: m.description,
                        author: m.channel?.name,
                        url: m.url,
                        requestedBy: options.requestedBy as User,
                        thumbnail:
                            m.thumbnail?.displayThumbnailURL('maxresdefault'),
                        views: m.views,
                        duration: m.durationFormatted,
                        source: 'youtube',
                        raw: m
                    });
                });

                return { playlist: null, tracks };
            }
            case QueryType.SOUNDCLOUD_TRACK:
            case QueryType.SOUNDCLOUD_SEARCH: {
                const result: SoundCloudSearchResult[] =
                    QueryResolver.resolve(query) === QueryType.SOUNDCLOUD_TRACK
                        ? [{ url: query }]
                        : await soundcloud
                              .search(query, 'track')
                              .catch(() => []);
                if (!result || !result.length)
                    return { playlist: null, tracks: [] };
                const res: Track[] = [];

                for (const r of result) {
                    const trackInfo = await soundcloud
                        .getSongInfo(r.url)
                        .catch(() => {});
                    if (!trackInfo) continue;

                    const track = new Track(this, {
                        title: trackInfo.title,
                        url: trackInfo.url,
                        duration: buildTimeCode(parseMS(trackInfo.duration)),
                        description: trackInfo.description,
                        thumbnail: trackInfo.thumbnail,
                        views: trackInfo.playCount,
                        author: trackInfo.author.name,
                        requestedBy: options.requestedBy,
                        source: 'soundcloud',
                        engine: trackInfo
                    });

                    res.push(track);
                }

                return { playlist: null, tracks: res };
            }
            case QueryType.SPOTIFY_SONG: {
                const spotifyData = await Spotify.getData(query).catch(
                    () => {}
                );
                if (!spotifyData) return { playlist: null, tracks: [] };
                const spotifyTrack = new Track(this, {
                    title: spotifyData.name,
                    description: spotifyData.description ?? '',
                    author: spotifyData.artists[0]?.name ?? 'Unknown Artist',
                    url: spotifyData.external_urls?.spotify ?? query,
                    thumbnail:
                        spotifyData.album?.images[0]?.url ??
                        spotifyData.preview_url?.length
                            ? `https://i.scdn.co/image/${
                                  spotifyData.preview_url?.split('?cid=')[1]
                              }`
                            : 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                    duration: buildTimeCode(parseMS(spotifyData.duration_ms)),
                    views: 0,
                    requestedBy: options.requestedBy,
                    source: 'spotify'
                });

                return { playlist: null, tracks: [spotifyTrack] };
            }
            case QueryType.SPOTIFY_PLAYLIST:
            case QueryType.SPOTIFY_ARTIST:
            case QueryType.SPOTIFY_ALBUM: {
                const spotifyPlaylist = await Spotify.getData(query).catch(
                    () => {}
                );
                if (!spotifyPlaylist) return { playlist: null, tracks: [] };

                const playlist = new Playlist(this, {
                    title: spotifyPlaylist.name ?? spotifyPlaylist.title,
                    description: spotifyPlaylist.description ?? '',
                    thumbnail:
                        spotifyPlaylist.images[0]?.url ??
                        'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                    type: spotifyPlaylist.type,
                    source: 'spotify',
                    author:
                        spotifyPlaylist.type === 'artist'
                            ? {
                                  name:
                                      spotifyPlaylist.name ?? 'Unknown Artist',
                                  url:
                                      spotifyPlaylist.external_urls?.spotify ??
                                      null
                              }
                            : spotifyPlaylist.type !== 'playlist'
                            ? {
                                  name:
                                      spotifyPlaylist.artists[0]?.name ??
                                      'Unknown Artist',
                                  url:
                                      spotifyPlaylist.artists[0]?.external_urls
                                          ?.spotify ?? null
                              }
                            : {
                                  name:
                                      spotifyPlaylist.owner?.display_name ??
                                      spotifyPlaylist.owner?.id ??
                                      'Unknown Artist',
                                  url:
                                      spotifyPlaylist.owner?.external_urls
                                          ?.spotify ?? null
                              },
                    tracks: [],
                    id: spotifyPlaylist.id,
                    url: spotifyPlaylist.external_urls?.spotify ?? query,
                    rawPlaylist: spotifyPlaylist
                });

                if (spotifyPlaylist.type !== 'playlist') {
                    playlist.tracks = (
                        spotifyPlaylist.type === 'artist'
                            ? spotifyPlaylist.tracks
                            : spotifyPlaylist.tracks.items
                    ).map((m: any) => {
                        const data = new Track(this, {
                            title: m.name ?? '',
                            description: m.description ?? '',
                            author: m.artists[0]?.name ?? 'Unknown Artist',
                            url: m.external_urls?.spotify ?? query,
                            thumbnail:
                                m.album?.images[0]?.url ??
                                spotifyPlaylist.images[0]?.url ??
                                'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                            duration: buildTimeCode(parseMS(m.duration_ms)),
                            views: 0,
                            requestedBy: options.requestedBy as User,
                            playlist,
                            source: 'spotify'
                        });

                        return data;
                    }) as Track[];
                } else {
                    playlist.tracks = spotifyPlaylist.tracks.items.map(
                        (m: any) => {
                            const data = new Track(this, {
                                title: m.track.name ?? '',
                                description: m.track.description ?? '',
                                author:
                                    m.track.artists[0]?.name ??
                                    'Unknown Artist',
                                url: m.track.external_urls?.spotify ?? query,
                                thumbnail:
                                    m.track.album?.images[0]?.url ??
                                    'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                                duration: buildTimeCode(
                                    parseMS(m.track.duration_ms)
                                ),
                                views: 0,
                                requestedBy: options.requestedBy as User,
                                playlist,
                                source: 'spotify'
                            });

                            return data;
                        }
                    ) as Track[];
                }

                return { playlist: playlist, tracks: playlist.tracks };
            }
            case QueryType.DEEZER_SONG: {
                const deezerData = await deezerApi.musics
                    .getTrack(query.split('/track/')[1].split('?')[0])
                    .catch(() => {});
                if (!deezerData) return { playlist: null, tracks: [] };
                const deezerTrack = new Track(this, {
                    title: deezerData.title,
                    description: '',
                    author: deezerData.artist?.name ?? 'Unknown Artist',
                    url: deezerData.link ?? query,
                    thumbnail:
                        deezerData.album?.cover ??
                        'https://cdn.discordapp.com/emojis/808421337735233577.png',
                    duration: buildTimeCode(
                        parseMS(deezerData.duration * 1000)
                    ),
                    views: 0,
                    requestedBy: options.requestedBy,
                    source: 'deezer'
                });

                return { playlist: null, tracks: [deezerTrack] };
            }
            case QueryType.DEEZER_PLAYLIST:
            case QueryType.DEEZER_ARTIST:
            case QueryType.DEEZER_ALBUM: {
                const type = qt.toString().split('_')[1];
                let method = 'getPlaylist';
                if (type === 'artist') method = 'getArtist';
                if (type === 'album') method = 'getAlbum';

                const deezerPlaylist = await deezerApi[
                    type === 'artist' ? 'users' : 'musics'
                ]
                    [method](query.split(`/${type}/`)[1].split('?')[0])
                    .catch(() => {});
                if (!deezerPlaylist) return { playlist: null, tracks: [] };

                const playlist = new Playlist(this, {
                    title: deezerPlaylist.title ?? deezerPlaylist.name,
                    description: deezerPlaylist.description ?? '',
                    thumbnail: deezerPlaylist.picture ?? deezerPlaylist.cover,
                    type: deezerPlaylist.type,
                    source: 'deezer',
                    author:
                        deezerPlaylist.type === 'artist'
                            ? {
                                  name: deezerPlaylist.name ?? 'Unknown Artist',
                                  url: deezerPlaylist.link ?? null
                              }
                            : deezerPlaylist.type === 'playlist'
                            ? {
                                  name:
                                      deezerPlaylist.creator?.name ??
                                      'Unknown Artist',
                                  url: deezerPlaylist.creator?.tracklist ?? null
                              }
                            : {
                                  name:
                                      deezerPlaylist.artist?.name ??
                                      'Unknown Artist',
                                  url: deezerPlaylist.artist?.tracklist ?? null
                              },
                    tracks: [],
                    id: deezerPlaylist.id,
                    url: deezerPlaylist.link ?? query,
                    rawPlaylist: deezerPlaylist
                });

                if (deezerPlaylist.type !== 'artist') {
                    const cover = deezerPlaylist.cover;
                    playlist.tracks = deezerPlaylist.tracks.data.map(
                        (m: any) => {
                            const data = new Track(this, {
                                title: m.title ?? '',
                                description: '',
                                author: m.artist?.name ?? 'Unknown Artist',
                                url: m.link ?? query,
                                thumbnail:
                                    m.album?.cover ??
                                    cover ??
                                    'https://cdn.discordapp.com/emojis/808421337735233577.png',
                                duration: buildTimeCode(
                                    parseMS(m.duration * 1000)
                                ),
                                views: 0,
                                requestedBy: options.requestedBy as User,
                                playlist,
                                source: 'deezer'
                            });

                            return data;
                        }
                    ) as Track[];
                } else {
                    const tracks = await deezerApi.users.getArtistTopTracks(
                        query.split('/artist/')[1].split('?')[0]
                    );
                    playlist.tracks = tracks.data.map((m) => {
                        const data = new Track(this, {
                            title: m.title ?? '',
                            description: '',
                            author: m.artist?.name ?? 'Unknown Artist',
                            url: m.link ?? query,
                            thumbnail:
                                m.album.cover ??
                                'https://cdn.discordapp.com/emojis/808421337735233577.png',
                            duration: buildTimeCode(parseMS(m.duration * 1000)),
                            views: 0,
                            requestedBy: options.requestedBy as User,
                            playlist,
                            source: 'deezer'
                        });
                        return data;
                    }) as Track[];
                }

                return { playlist: playlist, tracks: playlist.tracks };
            }
            case QueryType.SOUNDCLOUD_PLAYLIST: {
                const data = await soundcloud
                    .getPlaylist(query)
                    .catch(() => {});
                if (!data) return { playlist: null, tracks: [] };

                const res = new Playlist(this, {
                    title: data.title,
                    description: data.description ?? '',
                    thumbnail:
                        data.thumbnail ??
                        'https://soundcloud.com/pwa-icon-192.png',
                    type: 'playlist',
                    source: 'soundcloud',
                    author: {
                        name:
                            data.author?.name ??
                            data.author?.username ??
                            'Unknown Artist',
                        url: data.author?.profile
                    },
                    tracks: [],
                    id: `${data.id}`, // stringified
                    url: data.url,
                    rawPlaylist: data
                });

                for (const song of data.tracks) {
                    const track = new Track(this, {
                        title: song.title,
                        description: song.description ?? '',
                        author:
                            song.author?.username ??
                            song.author?.name ??
                            'Unknown Artist',
                        url: song.url,
                        thumbnail: song.thumbnail,
                        duration: buildTimeCode(parseMS(song.duration)),
                        views: song.playCount ?? 0,
                        requestedBy: options.requestedBy,
                        playlist: res,
                        source: 'soundcloud',
                        engine: song
                    });
                    res.tracks.push(track);
                }

                return { playlist: res, tracks: res.tracks };
            }
            case QueryType.YOUTUBE_PLAYLIST: {
                const ytpl = await YouTube.getPlaylist(query).catch(() => {});
                if (!ytpl) return { playlist: null, tracks: [] };

                await ytpl.fetch().catch(() => {});

                const playlist: Playlist = new Playlist(this, {
                    title: ytpl.title,
                    thumbnail: ytpl.thumbnail as unknown as string,
                    description: '',
                    type: 'playlist',
                    source: 'youtube',
                    author: {
                        name: ytpl.channel.name,
                        url: ytpl.channel.url
                    },
                    tracks: [],
                    id: ytpl.id,
                    url: ytpl.url,
                    rawPlaylist: ytpl
                });

                playlist.tracks = ytpl.videos.map(
                    (video) =>
                        new Track(this, {
                            title: video.title,
                            description: video.description,
                            author: video.channel?.name,
                            url: video.url,
                            requestedBy: options.requestedBy as User,
                            thumbnail: video.thumbnail.url,
                            views: video.views,
                            duration: video.durationFormatted,
                            raw: video,
                            playlist: playlist,
                            source: 'youtube'
                        })
                );

                return { playlist: playlist, tracks: playlist.tracks };
            }
            default:
                return { playlist: null, tracks: [] };
        }
    }
}
