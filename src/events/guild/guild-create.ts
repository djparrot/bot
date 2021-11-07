import { TextChannel } from 'discord.js';
import { createEmbed } from '../../utils';
import { EventListener } from '../event-handler';
import config from '../../../config.json';

export const listener: EventListener<'guildCreate'> = {
    event: 'guildCreate',
    async run(client, guild) {
        await client.db.createGuild(guild.id);
        const owner = await guild.fetchOwner({ force: true }).catch(() => null);
        const logsEmbed = createEmbed()
            .setColor('#35f009')
            .setTitle(`${guild.name} just invited me`)
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

        const embed = createEmbed()
            .setTitle('Thanks for inviting me in your server!')
            .setURL(config['website-url'])
            .setDescription(
                `To get started, join a voice channel and type /play to play a song! You can use song names, video links, and playlist links.\n\nIf you have any questions or need help with DJ Parrot, [click here](${config['server-invite']}) to talk to our support team!`
            )
            // \n\nFor exclusive features like volume control, 24/7 mode, audio effects, and saved queues, check out DJ Parrot Premium.
            .setTimestamp();

        (
            guild.channels.cache.find(
                (channel) =>
                    channel.isText() &&
                    channel.permissionsFor(guild.me)?.has('SEND_MESSAGES')
            ) as TextChannel
        )?.send({ embeds: [embed] });
    }
};
