import { SlashCommandBuilder } from '@discordjs/builders';
import { createEmbed } from '../../utils';
import { Command } from '../command-handler';
import config from '../../../config.json';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Displays informations about the bot'),
    run(client, interaction) {
        let days = 0;
        let week = 0;
        let uptime = '';
        let totalSeconds = client.uptime / 1000;
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        if (hours > 23) {
            days = days + 1;
            hours = 0;
        }

        if (days === 7) {
            days = 0;
            week = week + 1;
        }

        if (week > 0) {
            uptime += `${week} weeks, `;
        }

        if (minutes > 60) {
            minutes = 0;
        }

        uptime += `${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds.`;

        const embed = createEmbed()
            .setTitle(`${client.user.username}`)
            .addFields([
                {
                    name: '💰 Donation link',
                    value: '[Donate Here](https://www.paypal.me/skydonald)',
                    inline: true
                },
                {
                    name: '<:server:905859884053037076> Support Server',
                    value: `[Server Invite](${config['server-invite']})`,
                    inline: true
                },
                {
                    name: `<:DJParrot:801150789829394442> Add ${client.user.username}`,
                    value: `[Bot Invite](https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot%20applications.commands&permissions=4331719680)`,
                    inline: true
                },
                {
                    name: `🔼 Upvote ${client.user.username}`,
                    value: `[Upvote Link](https://top.gg/bot/${client.user.id})`,
                    inline: true
                },
                {
                    name: `🌎 ${client.user.username}'s website`,
                    value: `[Website](${config['website-url']})`,
                    inline: true
                },
                {
                    name: '⏰ Uptime',
                    value: uptime,
                    inline: true
                }
            ]);

        interaction.reply({ embeds: [embed] }).catch(() => {});
    }
};
