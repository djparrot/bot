import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Manages music filters')
        .addSubcommand((builder) =>
            builder
                .setName('add')
                .setDescription('Adds a music filter')
                .addStringOption((option) =>
                    option
                        .setName('filter')
                        .setDescription('The filter you want to add')
                        .setRequired(true)
                        .addChoices([
                            ['Bassboost', 'bassboost'],
                            ['8D', '8D'],
                            ['Vaporwave', 'vaporwave'],
                            ['Nightcore', 'nightcore'],
                            ['Reverse', 'reverse'],
                            ['Flanger', 'flanger'],
                            ['Haas', 'haas'],
                            ['Fade In', 'fadein'],
                            ['Karaoke', 'karaoke'],
                            ['Chorus', 'chorus'],
                            ['Earrape', 'earrape'],
                            ['Mono', 'mono']
                        ])
                )
        )
        .addSubcommand((builder) =>
            builder
                .setName('remove')
                .setDescription('Removes a music filter')
                .addStringOption((option) =>
                    option
                        .setName('filter')
                        .setDescription('The filter you want to remove')
                        .setRequired(true)
                        .addChoices([
                            ['Bassboost', 'bassboost'],
                            ['8D', '8D'],
                            ['Vaporwave', 'vaporwave'],
                            ['Nightcore', 'nightcore'],
                            ['Reverse', 'reverse'],
                            ['Flanger', 'flanger'],
                            ['Haas', 'haas'],
                            ['Fade In', 'fadein'],
                            ['Karaoke', 'karaoke'],
                            ['Chorus', 'chorus'],
                            ['Earrape', 'earrape'],
                            ['Mono', 'mono']
                        ])
                )
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);
        if (interaction.options.getSubcommand() === 'add') {
            const _filters = queue.getFiltersEnabled();
            const filters = {};

            for (const f of _filters) {
                filters[f] = true;
            }
            filters[interaction.options.getString('filter')] = true;

            queue.setFilters(filters);
            interaction
                .reply({
                    content: `<:check:905916070471295037> Added ${interaction.options.getString(
                        'filter'
                    )}!`
                })
                .catch(() => {});
        } else {
            const _filters = queue.getFiltersEnabled();
            const filters = {};

            for (const f of _filters) {
                filters[f] = true;
            }
            filters[interaction.options.getString('filter')] = false;

            queue.setFilters(filters);
            interaction
                .reply({
                    content: `<:check:905916070471295037> Removed ${interaction.options.getString(
                        'filter'
                    )}!`
                })
                .catch(() => {});
        }
    }
};
