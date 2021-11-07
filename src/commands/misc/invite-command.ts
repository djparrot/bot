import { SlashCommandBuilder } from '@discordjs/builders';
import { createEmbed } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Gives you the bot invite link'),
    run(client, interaction) {
        const embed = createEmbed()
            .setTitle(
                `<:DJParrot:801150789829394442> Add ${client.user.username}`
            )
            .setURL(
                `https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=4331719680`
            );

        interaction.reply({ embeds: [embed] }).catch(() => {});
    }
};
