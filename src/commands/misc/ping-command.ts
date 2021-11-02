import { SlashCommandBuilder } from '@discordjs/builders';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Get informations about the bot'),
    run(client, interaction) {
        interaction.reply({
            content: 'Pong!'
        });
    }
};
