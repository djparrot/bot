import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, MessageEmbed } from 'discord.js';
import { Client } from '../../extensions';
import { playlistModel } from '../../models';
import { logger } from '../../services';
import { createEmbed } from '../../utils';
import { pagination } from '../../utils/Utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('saved')
        .setDescription('Manages saved queues')
        .addSubcommandGroup((builder) =>
            builder
                .setName('queues')
                .setDescription('Manages saved queues')
                .addSubcommand((input) =>
                    input
                        .setName('list')
                        .setDescription(
                            'Send the list of all saved queues (sorted by likes)'
                        )
                )
                .addSubcommand((input) =>
                    input
                        .setName('create')
                        .setDescription('Save the server queue')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the queue')
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName('description')
                                .setDescription('The description of the queue')
                                .setRequired(false)
                        )
                )
                .addSubcommand((input) =>
                    input
                        .setName('delete')
                        .setDescription('Delete a queue')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the queue')
                                .setRequired(true)
                        )
                )
                .addSubcommand((input) =>
                    input
                        .setName('load')
                        .setDescription('Load a queue')
                        .addStringOption((option) =>
                            option
                                .setName('name')
                                .setDescription('The name of the queue')
                                .setRequired(true)
                        )
                )
        ),
    async run(client, interaction) {
        await interaction.deferReply();

        switch (interaction.options.getSubcommand()) {
            case 'list':
                let playlists = await playlistModel.find({});
                playlists = playlists
                    .sort((a, b) => b.liked.length - a.liked.length)
                    .slice(0, 25);

                let embeds = [] as MessageEmbed[];
                for (const playlist of playlists) {
                    const owner = client.users.cache.get(playlist.owner.id);

                    const embed = createEmbed()
                        .setTitle(`\`1.\` | \`${playlist._id}\``)
                        .setURL(
                            `https://djparrot.xyz/playlist?id=${encodeURIComponent(
                                playlist._id
                            )}`
                        )
                        .setAuthor(
                            `${playlist.owner.username}#${playlist.owner.discriminator}`,
                            owner?.displayAvatarURL({ dynamic: true }) ??
                                playlist.owner.avatar ??
                                'https://djparrot.xyz/DJParrot.png',
                            `https://djparrot.xyz/user?id=${playlist.owner.id}`
                        )
                        .setDescription(
                            playlist.description ?? 'An error occurred'
                        )
                        .setThumbnail(
                            playlist.songs[0]?.thumbnail ??
                                'https://djparrot.xyz/DJParrot.png'
                        )
                        .addFields(
                            {
                                name: 'Likes',
                                value: playlist.liked.length.toString(),
                                inline: true
                            },
                            {
                                name: 'Songs',
                                value: playlist.songs.length.toString(),
                                inline: true
                            }
                        )
                        .setFooter(
                            `Page ${playlists.indexOf(playlist) + 1} of ${
                                playlists.length
                            }`
                        );
                    embeds.push(embed);
                }

                if (embeds.length === 1) {
                    interaction.editReply({ embeds });
                    return;
                }

                return await pagination(interaction, embeds);
            case 'delete':
                return await deletePlaylist(interaction, client);
            case 'create':
                return await createPlaylist(interaction, client);
            case 'load':
                return await loadPlaylist(interaction, client);
        }
    }
};

async function deletePlaylist(interaction: CommandInteraction, client: Client) {
    const playlist = await playlistModel.findOne({
        _id: interaction.options.getString('name')
    });

    if (!playlist)
        return await interaction.followUp({
            content: '<:deny:905916059993923595> This playlist does not exist!',
            ephemeral: true
        });

    if (playlist.owner.id !== interaction.user.id)
        return await interaction.followUp({
            content:
                '<:deny:905916059993923595> You are not the owner of this playlist!',
            ephemeral: true
        });

    await playlistModel.deleteOne({ _id: playlist._id });
    await interaction.editReply({
        content: '<:check:905916059997102080> The playlist has been deleted!'
    });
}

async function createPlaylist(interaction: CommandInteraction, client: Client) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description');

    const playlist = await playlistModel.findOne({
        _id: name
    });

    if (playlist)
        return await interaction.followUp({
            content: '<:deny:905916059993923595> This playlist already exists!',
            ephemeral: true
        });

    const queue = client.getQueue(interaction.guild);
    if (!queue)
        return await interaction.followUp({
            content: '<:deny:905916059993923595> There is no queue to save!',
            ephemeral: true
        });

    const songs = queue.tracks.map((track) => track.toJSON());

    const newPlaylist = new playlistModel({
        _id: name,
        owner: {
            id: interaction.user.id,
            username: interaction.user.username,
            discriminator: interaction.user.discriminator,
            avatar: interaction.user.displayAvatarURL({ dynamic: true })
        },
        description: description ?? 'No description',
        songs
    });

    await newPlaylist.save();
    await interaction.editReply({
        content: '<:check:905916059997102080> The playlist has been created!'
    });
}

async function loadPlaylist(interaction: CommandInteraction, client: Client) {
    const settings = await client.db.getGuild(interaction.guildId);
    const member = interaction.guild.members.resolve(
        interaction.member as GuildMember
    );

    if (
        settings.djmod &&
        !member.roles.cache.find((role) => role.name.toUpperCase() === 'DJ')
    ) {
        return await interaction.followUp({
            content: '<:deny:905916059993923595> You are not a DJ!',
            ephemeral: true
        });
    }

    const playlist = await playlistModel.findOne({
        _id: interaction.options.getString('name')
    });

    if (!playlist)
        return await interaction.followUp({
            content: '<:deny:905916059993923595> This playlist does not exist!',
            ephemeral: true
        });

    await playlistModel.updateOne(
        { _id: playlist._id },
        {
            $set: {
                listen: (playlist.listen ?? 0) + 1
            }
        }
    );

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
        return void interaction.followUp({
            content:
                '<:deny:905916059993923595> Could not join your voice channel!',
            ephemeral: true
        });
    }

    if (
        !queue.connection.listeners('error').length ||
        queue.connection.listeners('error').length === 0
    )
        queue.connection.on('error', (error) => {
            logger.log(error);
            queue.metadata.followUp({
                ephemeral: true,
                content:
                    '<:deny:905916059993923595> An error occurred while playing this song, you may need to skip this song.'
            });
        });

    await interaction.followUp({
        embeds: [
            createEmbed()
                .setAuthor('Playlist added to the queue')
                .setTitle(playlist._id)
                .setThumbnail(
                    playlist.songs[0].thumbnail ??
                        'https://djparrot.xyz/DJParrot.png'
                )
                .setURL(
                    `https://djparrot.xyz/playlist?id=${encodeURIComponent(
                        playlist._id
                    )}`
                )
        ]
    });

    let played = false;
    for (const song of playlist.songs) {
        const searchResult = await client
            .search(song.url, {
                requestedBy: interaction.user
            })
            .catch(() => {});

        if (!searchResult || !searchResult.tracks.length) continue;

        queue.addTrack(searchResult.tracks[0]);
        if (!played && !queue.playing) {
            await queue.play();
        }
        played = true;
    }
}
