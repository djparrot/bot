import { createEmbed, formatCase } from '../../utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';
import { GuildMember } from 'discord.js';
import { Client } from '../../extensions';
import { logger } from '../../services';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music')
        .addStringOption((builder) =>
            builder
                .setName('query')
                .setRequired(true)
                .setDescription('Song/Playlist/Album/Artist Name or URL')
        )
        .addStringOption((builder) =>
            builder
                .setName('type')
                .setRequired(false)
                .setDescription(
                    'Query type (not necessary when the given query is an URL)'
                )
                .addChoices([
                    ['Song', 'song'],
                    ['Playlist', 'playlist'],
                    ['Album', 'album'],
                    ['Artist', 'artist']
                ])
        ),
    isDjCommand: true,
    async run(client, interaction) {
        const type = interaction.options.getString('type');
        let query = interaction.options.getString('query');

        await interaction.deferReply().catch(() => {});

        if (type && !query.includes('https://') && type !== 'song') {
            switch (type) {
                case 'artist':
                    const artist = await searchSpotifyArtist(client, query);
                    if (artist instanceof Error) {
                        return interaction
                            .followUp({
                                content:
                                    '<:deny:905916059993923595> No results found!',
                                ephemeral: true
                            })
                            .catch(() => {});
                    }
                    query = artist;
                    break;
                case 'playlist':
                    const playlist = await searchSpotifyPlaylist(client, query);
                    if (playlist instanceof Error) {
                        return interaction
                            .followUp({
                                content:
                                    '<:deny:905916059993923595> No results found!',
                                ephemeral: true
                            })
                            .catch(() => {});
                    }
                    query = playlist;
                    break;
                case 'album':
                    const album = await searchSpotifyAlbum(client, query);
                    if (album instanceof Error) {
                        return interaction
                            .followUp({
                                content:
                                    '<:deny:905916059993923595> No results found!',
                                ephemeral: true
                            })
                            .catch(() => {});
                    }
                    query = album;
                    break;
            }
        }

        const searchResult = await client
            .search(query, {
                requestedBy: interaction.user
            })
            .catch(() => {});
        if (!searchResult || !searchResult.tracks.length)
            return void interaction
                .followUp({
                    content: '<:deny:905916059993923595> No results found!',
                    ephemeral: true
                })
                .catch(() => {});

        const queue = client.createQueue(interaction.guild, {
            metadata: interaction
        });

        try {
            if (!queue.connection)
                await queue.connect(
                    (interaction.member as GuildMember).voice.channel
                );
        } catch {
            void client.deleteQueue(interaction.guildId);
            return void interaction
                .followUp({
                    content:
                        '<:deny:905916059993923595> Could not join your voice channel!',
                    ephemeral: true
                })
                .catch(() => {});
        }

        if (
            !queue.connection.listeners('error').length ||
            queue.connection.listeners('error').length === 0
        )
            queue.connection.on('error', (error) => {
                logger.log(error);
                queue.metadata
                    .followUp({
                        ephemeral: true,
                        content:
                            '<:deny:905916059993923595> An error occurred while playing this song, you may need to skip this song.'
                    })
                    .catch(() => {});
            });

        await interaction
            .followUp({
                embeds: [
                    createEmbed()
                        .setAuthor(
                            searchResult.playlist
                                ? `${formatCase(
                                      searchResult.playlist.type
                                  )} added to the queue`
                                : 'Song added to the queue'
                        )
                        .setTitle(
                            searchResult.playlist
                                ? searchResult.playlist.title
                                : searchResult.tracks[0].title
                        )
                        .setThumbnail(
                            searchResult.playlist
                                ? searchResult.playlist.thumbnail
                                : searchResult.tracks[0].thumbnail
                        )
                        .setURL(
                            searchResult.playlist
                                ? searchResult.playlist.url
                                : searchResult.tracks[0].url
                        )
                ]
            })
            .catch(() => {});
        searchResult.playlist
            ? queue.addTracks(searchResult.tracks)
            : queue.addTrack(searchResult.tracks[0]);
        if (!queue.playing) await queue.play();
    }
};

const searchSpotifyArtist = async (client: Client, query: string) => {
    let res: Response<SpotifyApi.SearchResponse>;
    try {
        res = await client.spotifyApi.searchArtists(query);
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
};

const searchSpotifyPlaylist = async (client: Client, query: string) => {
    let res: Response<SpotifyApi.SearchResponse>;
    try {
        res = await client.spotifyApi.searchPlaylists(query);
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
};

const searchSpotifyAlbum = async (client: Client, query: string) => {
    let res: Response<SpotifyApi.SearchResponse>;
    try {
        res = await client.spotifyApi.searchAlbums(query);
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
};

interface Response<T> {
    body: T;
    headers: Record<string, string>;
    statusCode: number;
}
