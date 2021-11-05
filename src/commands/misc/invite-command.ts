import { SlashCommandBuilder } from '@discordjs/builders';
import { createEmbed } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Gives you the bot invite link'),
    run(client, interaction) {
        const embed = createEmbed()
            .setTitle('Add DJ Parrot')
            .setThumbnail(client.user.displayAvatarURL())
            .setURL(
                'https://discord.com/oauth2/authorize?client_id=764418734747549696&scope=bot%20applications.commands&permissions=4331719680'
            );

        interaction.reply({ embeds: [embed] }).catch(() => {});
    }
};
