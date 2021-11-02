import {
    Client as DiscordClient,
    Collection,
    Intents,
    NewsChannel,
    StageChannel,
    TextChannel,
    ThreadChannel,
    VoiceChannel
} from 'discord.js';
import { Command, loadCommands } from '../commands/command-handler';
import Database from '../interfaces/database';
import { logger } from '../services';
import { loadEvents } from '../events/event-handler';
import { REST } from '@discordjs/rest';
import { VoiceConnection } from '@discordjs/voice';
import { Scrap } from '../utils';
import SpotifyWebApi from 'spotify-web-api-node';
import axios from 'axios';

export default class Client extends DiscordClient {
    public static instance: Client;
    public commands = new Collection<string, Command>();
    public queue = new Collection<string, Queue>();
    public spotifyApi: SpotifyWebApi;
    public restClient: REST;
    public ytdlOpts = {
        headers: {
            cookie: 'CONSENT=YES+srp.gws-20211018-0-RC1.fr+FX+843; SID=DQhsYnxL8X7HdVJRfj0f2DFKSqicDRkRO-HCpD-PrLVsjGZ9CqjHwUrrd3lcSAt2vF6q9w.; APISID=vprA6YqG25gcjeVv/AdRPFdnoCbr97sMvf; SAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; __Secure-1PAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; __Secure-3PAPISID=AODaHwyMwH-jTM9w/ApeiQqcTLa3vg7o1U; PREF=tz=Europe.Paris&f6=400&f5=30000; wide=1; SIDCC=AJi4QfFs9y6yhfTUudgwVLEDhlaUraRSGdL4ko_baVBfNZNN9b3_OjbiDWnQcdjHXfDzRXh3wZA',
            'x-youtube-identity-token':
                'QUFFLUhqbTZkNkxHZGFsenc1MUl2aDB6d0FVM2p2enJlQXw\u003d'
        }
    };

    constructor(token: string, public db: Database) {
        super({
            allowedMentions: {
                repliedUser: false
            },
            intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS]
        });
        this.restClient = new REST({ version: '9' }).setToken(token);
        this.spotifyApi = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET
        });
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

        logger.log('Loading spotify api...'.italic.magenta);
        const spt = await this._getSpotifyToken();
        this.spotifyApi.setAccessToken(spt.accessToken);
        setInterval(async () => {
            const token = await this._getSpotifyToken();
            this.spotifyApi.setAccessToken(token.accessToken);
        }, spt.expiresIn * 1000);
        logger.log('Spotify api loaded!');
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
        });
        const data = {
            tokenType: res.data.token_type,
            accessToken: res.data.access_token,
            expiresIn: res.data.expires_in
        };
        return data;
    }
}

export interface Queue {
    textChannel: TextChannel | NewsChannel | ThreadChannel;
    voiceChannel: VoiceChannel | StageChannel;
    connection: VoiceConnection;
    songs: Array<Song>;
    volume: number;
    playing: boolean;
    loop: 'song' | 'queue' | 'disabled';
    filters: Array<filters>;
    additionalStreamTime: number;
    streamTime: number;
    announce: boolean;
    infinity: boolean;
}

export interface Song {
    title: string;
    url: string;
    thumbnail: string;
    live: boolean;
    duration: number;
    artist: string;
    type: 'youtube' | 'soundcloud' | 'tts';
    stream: Scrap<string, []>;
}

export type filters =
    | 'bassboost'
    | '8D'
    | 'vaporwave'
    | 'nightcore'
    | 'reverse'
    | 'flanger'
    | 'haas'
    | 'fadein'
    | 'karaoke'
    | 'chorus';
