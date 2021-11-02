import { CommandInteraction, GuildMember, MessageEmbed } from 'discord.js';
import { GuildDB } from '../models';
import { Client } from '../extensions';

export function validateContinuePlaying(
    client: Client,
    interaction: CommandInteraction,
    settings: GuildDB
): true | Error {
    if (!client.queue.get(interaction.guildId))
        return new Error('There is nothing playing in this server!');
    const guild = client.guilds.cache.get(interaction.guildId);
    let member = guild.members.cache.get(interaction.member.user.id);
    if (!member) member = interaction.member as GuildMember;
    if (guild.me.voice?.channelId !== member.voice?.channelId)
        return new Error('You are not in the same channel as me!');
    if (
        settings.djmod &&
        !member.roles?.cache?.some((r) => r.name.toUpperCase() === 'DJ')
    )
        return new Error('You are not a DJ!');
    return true;
}

export function validateStartPlaying(
    client: Client,
    interaction: CommandInteraction,
    settings: GuildDB
): true | Error {
    const guild = client.guilds.cache.get(interaction.guildId);
    let member = guild.members.cache.get(interaction.member.user.id);
    if (!member) member = interaction.member as GuildMember;
    if (!member.voice?.channelId)
        return new Error('You are not in a voice channel!');
    if (
        settings.djmod &&
        !member?.roles?.cache?.some((r) => r.name.toUpperCase() === 'DJ')
    )
        return new Error('You are not a DJ!');
    return true;
}

export function createErrorEmbed(error: string) {
    return new MessageEmbed()
        .setColor('RED')
        .setDescription(error)
        .setFooter('Oops! Something went wrong :(');
}
