import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffles the queue'),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.shuffle();
        interaction.reply({
            content: `<:check:905916070471295037> Queue shuffled!`
        });
    }
};
