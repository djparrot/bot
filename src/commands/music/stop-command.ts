import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Destroys the server queue'),
    isDjCommand: true,
    needsQueue: true,
    run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.stop();
        interaction.reply({
            content: '<:check:905916070471295037> Destroyed the queue!'
        });
    }
};
