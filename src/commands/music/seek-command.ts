import { SlashCommandBuilder } from '@discordjs/builders';
import { formatDuration } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seeks the playing song to the specified timestamp')
        .addIntegerOption((input) =>
            input
                .setName('position')
                .setDescription('The timestamp to seek to (seconds)')
                .setRequired(true)
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);
        await interaction.deferReply().catch(() => {});

        await queue.seek(interaction.options.getInteger('position') * 1000);
        interaction
            .reply({
                content: `<:check:905916070471295037> Seeked to ${formatDuration(
                    interaction.options.getInteger('position') * 1000
                )}!`
            })
            .catch(() => {});
    }
};
