import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes playback'),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.setPaused(false);
        interaction.reply({
            content: `<:check:905916070471295037> Resumed!`
        });
    }
};
