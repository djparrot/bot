import { TextChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { checkPerms, createEmbed } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Edit settings')
        .addSubcommand((subBuilder) =>
            subBuilder.setName('dj').setDescription('Toggle DJ mod')
        ),
    async run(client, interaction) {
        if (
            !checkPerms(
                client.guilds.cache
                    .get(interaction.guildId)
                    .members.cache.get(interaction.member.user.id),
                'MANAGE_GUILD'
            )
        )
            return interaction
                .reply({
                    content:
                        "<:deny:905916059993923595> You don't have enough permissions! (Manage Guild)",
                    ephemeral: true
                })
                .catch(() => {});

        const settings = await client.db.getGuild(interaction.guildId);
        const guild = client.guilds.cache.get(interaction.guildId);
        if (
            !settings.djmod &&
            !guild.roles.cache.some((r) => r.name.toUpperCase() === 'DJ')
        )
            (
                guild.channels.cache.get(interaction.channelId) as TextChannel
            ).send({
                content:
                    '<:deny:905916059993923595> There is no DJ role in your server!'
            });
        await client.db.updateGuild(interaction.guildId, {
            djmod: !settings.djmod
        });

        interaction
            .followUp({
                content: settings.djmod
                    ? '<:check:905916070471295037> DJ mod has been disabled'
                    : '<:check:905916070471295037> DJ mod has been enabled'
            })
            .catch(() => {});
    }
};
