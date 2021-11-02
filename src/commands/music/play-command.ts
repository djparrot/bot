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
    run(client, interaction) {
        if (!interaction.isCommand()) return;
    }
};
