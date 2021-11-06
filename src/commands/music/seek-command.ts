import { SlashCommandBuilder } from '@discordjs/builders';
import { formatDuration } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seeks the playing song to the specified timestamp')
        .addStringOption((input) =>
            input
                .setName('timestamp')
                .setDescription('Timestamp (format: 00:00)')
                .setRequired(true)
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);
        await interaction.deferReply().catch(() => {});

        const pattern = /[0-9][0-9]?:[0-9][0-9]?/;
        const timestamp = interaction.options.getString('timestamp');

        if (!pattern.test(timestamp)) {
            return await interaction.followUp({
                ephemeral: true,
                content:
                    '<:deny:905916059993923595> Invalid timestamp format! Please use the format `00:00`.'
            });
        }

        let ms: number;
        const [minutes, seconds] = timestamp.split(':').map((s) => parseInt(s));
        ms = minutes * 60 * 1000 + seconds * 1000;

        await queue.seek(ms);
        interaction
            .editReply({
                content: `<:check:905916070471295037> Seeked to ${formatDuration(
                    ms
                )}!`
            })
            .catch(() => {});
    }
};
