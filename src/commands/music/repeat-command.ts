import { SlashCommandBuilder } from '@discordjs/builders';
import { QueueRepeatMode } from '../../interfaces';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('repeat')
        .setDescription('Sets the repeat mode')
        .addNumberOption((builder) =>
            builder
                .setName('mode')
                .setDescription('Repeat mode')
                .setRequired(true)
                .addChoices([
                    ['Off', 0],
                    ['Track', 1],
                    ['Queue', 2],
                    ['Auto Play', 3]
                ])
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        queue.setRepeatMode(
            interaction.options.getNumber('mode') as QueueRepeatMode
        );
        interaction
            .reply({
                content: `<:check:905916070471295037> Repeat mode updated to ${
                    QueueRepeatMode[interaction.options.getNumber('mode')]
                }!`
            })
            .catch(() => {});
    }
};
