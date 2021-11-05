import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses playback'),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.setPaused(true);
        interaction
            .reply({
                content: `<:check:905916070471295037> Paused!`
            })
            .catch(() => {});
    }
};
