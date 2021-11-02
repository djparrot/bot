import {
    createErrorEmbed,
    scrap,
    validateContinuePlaying,
    validateStartPlaying
} from '../../utils';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';
import { GuildMember } from 'discord.js';
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
import { logger } from '../../services';

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
        const queue = client.queue.get(interaction.guildId);
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

        /*ytdl('https://www.youtube.com/watch?v=W8yYQ-WyNoI', {
            requestOptions: client.ytdlOpts
        });
        ytdl.getInfo('https://www.youtube.com/watch?v=W8yYQ-WyNoI', {
            requestOptions: client.ytdlOpts
        }).then(console.log);*/
        // related_videos

        const song = await new SongResolver(client, query).searchYoutube();
        if (song instanceof Error)
            return interaction.editReply({
                embeds: [createErrorEmbed(song.message)]
            });

        const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channelId,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: true
        });

        // const channel = await client.channels.fetch(
        //     interaction.member.voice.channelId
        // );

        // if (channel.type === 'GUILD_STAGE_VOICE') {
        //     await interaction.guild.me.voice
        //         .setSuppressed(false)
        //         .catch(console.log);
        // }

        connection.on(VoiceConnectionStatus.Ready, () => {
            player.play(
                createAudioResource(
                    ytdl(scrap(song.stream), {
                        fmt: 's16le',
                        requestOptions: client.ytdlOpts,
                        opusEncoded: false,
                        highWaterMark: 1 << 25
                    }),
                    {
                        inlineVolume: true,
                        inputType: StreamType.Raw
                    }
                )
            );
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(
                        connection,
                        VoiceConnectionStatus.Signalling,
                        5_000
                    ),
                    entersState(
                        connection,
                        VoiceConnectionStatus.Connecting,
                        5_000
                    )
                ]);
            } catch (error) {
                connection.destroy();
            }
        });

        player.on(AudioPlayerStatus.Playing, () => {
            interaction.editReply('Now playing: ' + song.title);
        });

        connection.subscribe(player);

        // if (queue) {
        //     const validation = validateContinuePlaying(
        //         client,
        //         interaction,
        //         settings
        //     );
        //     if (validation instanceof Error)
        //         return interaction.reply({
        //             embeds: [createErrorEmbed(validation.message)],
        //             ephemeral: true
        //         });
        // } else {
        //     const validation = validateStartPlaying(
        //         client,
        //         interaction,
        //         settings
        //     );
        //     if (validation instanceof Error)
        //         return interaction.reply({
        //             embeds: [createErrorEmbed(validation.message)],
        //             ephemeral: true
        //         });
        // }
    }
};
