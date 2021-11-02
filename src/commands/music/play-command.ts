import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music ')
        .addStringOption((builder) =>
            builder
                .setName('query')
                .setRequired(true)
                .setDescription('Song/Playlist/Album/Artist Name or URL')
        )
        .addStringOption((builder) =>
            builder
                .setName('type')
                .setRequired(false)
                .setDescription(
                    'Query type (not necessary when the given query is an URL)'
                )
                .addChoices([
                    ['Song', 'song'],
                    ['Playlist', 'playlist'],
                    ['Album', 'album'],
                    ['Artist', 'artist']
                ])
        ),
    async run(client, interaction) {
        if (!interaction.isCommand()) return;
        await interaction.deferReply({ ephemeral: true });
        setTimeout(() => {
            interaction.editReply(
                '<:warn:799684571880095784> Command not implemented yet'
            );
        }, 2000);
    }
};
