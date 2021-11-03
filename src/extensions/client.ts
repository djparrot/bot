import {
    Client as DiscordClient,
    Collection,
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
import YouTube from 'youtube-sr';
import Spotify from 'spotify-url-info';
import { ExtractorModel } from '../services/extractors';

const soundcloud = new SoundCloud();

export default class Client extends DiscordClient {
    public static instance: Client;
    public readonly extractors = new Collection<string, ExtractorModel>();
    public commands = new Collection<string, Command>();
    public queue = new Collection<string, Queue>();
    public voiceUtils: VoiceUtils;
    public restClient: REST;
    public opts = {
        autoRegisterExtractor: true,
        ytdlOptions: {
            // requestOptions: {
            //     headers: {
            //         cookie: 'CONSENT=YES+srp.gws-20211018-0-RC1.fr+FX+843; SID=DQhsYnxL8X7HdVJRfj0f2DFKSqicDRkRO-HCpD-PrLVsjGZ9CqjHwUrrd3lcSAt2vF6q9w.; APISID=vprA6YqG25gcjeVv/AdRPFdnoCbr97sMvf; SAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; __Secure-1PAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; __Secure-3PAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; PREF=tz=Europe.Paris&f6=400&f5=30000; wide=1; SIDCC=AJi4QfFs9y6yhfTUudgwVLEDhlaUraRSGdL4ko_baVBfNZNN9b3_OjbiDWnQcdjHXfDzRXh3wZA',
            //         'x-youtube-identity-token':
            //             'QUFFLUhqbTZkNkxHZGFsenc1MUl2aDB6d0FVM2p2enJlQXw\u003d'
            //     }
            // }
        },
        connectionTimeout: 20000
    };

    constructor(token: string, public db: Database) {
        super({
            allowedMentions: {
                repliedUser: false
            },
            intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS]
        });
        this.restClient = new REST({ version: '9' }).setToken(token);
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
        await this.db.connect();
        logger.log('Database connected!');
        logger.log('Registering commands...'.italic.magenta);
        await loadCommands(this, false);
        logger.log(`Successfully registered ${this.commands.size} commands!`);
    }

    createQueue<T = unknown>(
        guild: GuildResolvable,
        queueInitOptions: PlayerOptions & { metadata?: T } = {}
    ): Queue<T> {
        guild = this.guilds.resolve(guild);
        if (!guild) throw new Error('Unknown Guild');
        if (this.queue.has(guild.id))
            return this.queue.get(guild.id) as Queue<T>;

        const _meta = queueInitOptions.metadata;
        delete queueInitOptions['metadata'];
        if (!queueInitOptions.ytdlOptions)
            queueInitOptions.ytdlOptions = this.opts.ytdlOptions;
        const queue = new Queue(this, guild, queueInitOptions);
        queue.metadata = _meta;
        this.queue.set(guild.id, queue);

        return queue as Queue<T>;
    }

    getQueue<T = unknown>(guild: GuildResolvable) {
        guild = this.guilds.resolve(guild);
        if (!guild) throw new Error('Unknown Guild');
        return this.queue.get(guild.id) as Queue<T>;
    }

    deleteQueue<T = unknown>(guild: GuildResolvable) {
        guild = this.guilds.resolve(guild);
        if (!guild) throw new Error('Unknown Guild');
        const prev = this.getQueue<T>(guild);

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
                    (m as any).source = 'youtube'; // eslint-disable-line @typescript-eslint/no-explicit-any
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
                        spotifyPlaylist.type !== 'playlist'
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    playlist.tracks = spotifyPlaylist.tracks.items.map(
                        (m: any) => {
                            const data = new Track(this, {
                                title: m.name ?? '',
                                description: m.description ?? '',
                                author: m.artists[0]?.name ?? 'Unknown Artist',
                                url: m.external_urls?.spotify ?? query,
                                thumbnail:
                                    spotifyPlaylist.images[0]?.url ??
                                    'https://www.scdn.co/i/_global/twitter_card-default.jpg',
                                duration: buildTimeCode(parseMS(m.duration_ms)),
                                views: 0,
                                requestedBy: options.requestedBy as User,
                                playlist,
                                source: 'spotify'
                            });

                            return data;
                        }
                    ) as Track[];
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
