import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from 'discord.js';
import { chunk, createEmbed, last } from '../../utils';
import { pagination } from '../../utils/Utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Displays the server queue'),
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        await interaction.deferReply().catch(() => {});

        const tracks = queue.tracks.slice();
        tracks.unshift(last(queue.previousTracks));

        const chunked = chunk(
            tracks.map((t, i) => `\`${++i}.\` | [\`${t.title}\`](${t.url})`),
            10
        ).map((x) => x.join('\n'));

        const guild = client.guilds.resolve(interaction.guild);

        let embeds = [] as MessageEmbed[];
        for (const chunk of chunked) {
            const embed = createEmbed()
                .setAuthor(`Queue for ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setDescription(chunk)
                .addField(
                    'Now Playing',
                    `[${tracks[0].title}](${tracks[0].url})`,
                    true
                )
                .addField('Voice Channel', queue.connection.channel.name, true)
                .addField('Volume', `${queue.volume}% `, true)
                .setFooter(
                    `Page ${chunked.indexOf(chunk) + 1} of ${chunked.length}`
                );
            embeds.push(embed);
        }

        if (tracks.length === 1) {
            embeds[0].setDescription(
                'No songs to play next, add songs by `/play <song title>`'
            );
        }
        if (embeds.length === 1) {
            interaction.editReply({ embeds }).catch(() => {});
            return;
        }

        pagination(interaction, embeds);
    }
};
