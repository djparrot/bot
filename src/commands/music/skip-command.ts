import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips the current song'),
    isDjCommand: true,
    needsQueue: true,
    run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.skip();
        interaction
            .reply({
                content: '<:check:905916070471295037> Skipped to the next song!'
            })
            .catch(() => {});
    }
};
