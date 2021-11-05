import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Displays or changes the volume')
        .addIntegerOption((option) =>
            option
                .setName('volume')
                .setDescription('Volume (between 0 and 200)')
                .setRequired(false)
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.setVolume(interaction.options.getInteger('volume'));
        interaction
            .reply({
                content: `<:check:905916070471295037> Volume set to ${queue.volume}!`
            })
            .catch(() => {});
    }
};
