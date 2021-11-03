import { createErrorEmbed, scrap } from '../../utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';
import { GuildMember, StageChannel, VoiceChannel } from 'discord.js';
import { SongResolver } from '../../handlers';
import ytdl from 'discord-ytdl-core';
import {
    joinVoiceChannel,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
    StreamType,
    VoiceConnectionStatus,
    entersState,
    AudioPlayerStatus
} from '@discordjs/voice';
import { QueryType } from '../../interfaces';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music ')
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
    async run(client, interaction) {
        interaction.member = interaction.member as GuildMember;
        const settings = await client.db.getGuild(interaction.guildId);
        const type = interaction.options.getString('type');
        let query = interaction.options.getString('query');

        if (type && !query.includes('https://') && type !== 'song') {
            switch (type) {
                case 'artist':
                    const artist = await new SongResolver(
                        client,
                        query
                    ).searchSpotifyArtist();
                    if (artist instanceof Error) {
                        return interaction.reply({
                            embeds: [createErrorEmbed(artist.message)],
                            ephemeral: true
                        });
                    }
                    query = artist;
                    break;
                case 'playlist':
                    const playlist = await new SongResolver(
                        client,
                        query
                    ).searchSpotifyPlaylist();
                    if (playlist instanceof Error) {
                        return interaction.reply({
                            embeds: [createErrorEmbed(playlist.message)],
                            ephemeral: true
                        });
                    }
                    query = playlist;
                    break;
                case 'album':
                    const album = await new SongResolver(
                        client,
                        query
                    ).searchSpotifyAlbum();
                    if (album instanceof Error) {
                        return interaction.reply({
                            embeds: [createErrorEmbed(album.message)],
                            ephemeral: true
                        });
                    }
                    query = album;
                    break;
            }
        }

        interaction.deferReply();

        const searchResult = await client
            .search(query, {
                requestedBy: interaction.user
            })
            .catch(() => {});
        if (!searchResult || !searchResult.tracks.length)
            return void interaction.followUp({
                content: 'No results were found!',
                ephemeral: true
            });

        const queue = client.createQueue(interaction.guild, {
            metadata: interaction.channel
        });

        try {
            if (!queue.connection)
                await queue.connect(interaction.member.voice.channel);
        } catch {
            void client.deleteQueue(interaction.guildId);
            return void interaction.followUp({
                content: 'Could not join your voice channel!',
                ephemeral: true
            });
        }

        await interaction.followUp({
            content: `⏱ | Loading your ${
                searchResult.playlist ? 'playlist' : 'track'
            }...`
        });
        searchResult.playlist
            ? queue.addTracks(searchResult.tracks)
            : queue.addTrack(searchResult.tracks[0]);
        if (!queue.playing) await queue.play();
    }
};
