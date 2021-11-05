import { SlashCommandBuilder } from '@discordjs/builders';
import { Spotify } from 'canvacord';
import { Command } from '../command-handler';
import { loadImage } from 'canvas';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('now')
        .setDescription('Displays the current playing song')
        .addSubcommand((builder) =>
            builder
                .setName('playing')
                .setDescription('Displays the current playing song')
        ),
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);
        if (!queue)
            return interaction
                .reply({
                    content:
                        '<:deny:905916059993923595> There is nothing playing in this server!',
                    ephemeral: true
                })
                .catch(() => {});

        await interaction.deferReply().catch(() => {});

        let isValid: boolean;
        try {
            await loadImage(queue.current.thumbnail);
            isValid = true;
        } catch (err) {
            isValid = false;
        }

        const image = new Spotify()
            .setAuthor(queue.current.author)
            .setStartTimestamp(new Date().getTime() - queue.streamTime)
            .setEndTimestamp(
                new Date().getTime() +
                    queue.current.durationMS -
                    queue.streamTime
            )
            .setImage(
                isValid
                    ? queue.current.thumbnail
                    : 'https://djparrot.xyz/DJParrot.png'
            )
            .setTitle(queue.current.title);

        if (queue.current.playlist && queue.current.playlist.type !== 'artist')
            image.setAlbum(queue.current.playlist.title);

        const png = await image.build();
        interaction.editReply({ files: [png] }).catch(() => {});
    }
};
