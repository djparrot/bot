import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the server queue'),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.tracks = [];
        interaction.reply({
            content: '<:check:905916070471295037> Cleared the queue!'
        });
    }
};
