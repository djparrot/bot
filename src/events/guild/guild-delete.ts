import { TextChannel } from 'discord.js';
import { createEmbed } from '../../utils';
import { EventListener } from '../event-handler';
import config from '../../../config.json';

export const listener: EventListener<'guildDelete'> = {
    event: 'guildDelete',
    async run(client, guild) {
        await client.db.deleteGuild(guild.id);
        client.deleteQueue(guild.id);
        const owner = await guild.fetchOwner({ force: true }).catch(() => null);
        const logsEmbed = createEmbed()
            .setColor('#ff0000')
            .setTitle(`${guild.name} just kick me`)
            .addFields(
                {
                    name: '👑Owner:',
                    value: `${owner?.user?.tag}`,
                    inline: true
                },
                {
                    name: `👥Members:`,
                    value: (guild.members.cache.size > guild.memberCount
                        ? guild.members.cache.size
                        : guild.memberCount
                    ).toString(),
                    inline: true
                },
                {
                    name: '📅Joined Date',
                    value: `${guild.me?.joinedAt?.toLocaleDateString()}`,
                    inline: true
                }
            )
            .setFooter(
                `${client.guilds.cache.size}th server`,
                guild.iconURL({ dynamic: true }) ??
                    'https://djparrot.xyz/DJParrot.png'
            )
            .setTimestamp();

        (
            client.channels.cache.get(config['guild-channel']) as TextChannel
        ).send({
            embeds: [logsEmbed]
        });
    }
};
