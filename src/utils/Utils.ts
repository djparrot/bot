import {
    CommandInteraction,
    GuildMember,
    MessageEmbed,
    StageChannel,
    VoiceChannel
} from 'discord.js';
import { GuildDB } from '../models';
import { Client } from '../extensions';
import { TimeData } from '../interfaces';

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

export function last<T = any>(arr: T[]): T {
    if (!Array.isArray(arr)) return;
    return arr[arr.length - 1];
}

export function buildTimeCode(duration: TimeData) {
    const items = Object.keys(duration);
    const required = ['days', 'hours', 'minutes', 'seconds'];

    const parsed = items
        .filter((x) => required.includes(x))
        .map((m) => duration[m as keyof TimeData]);
    const final = parsed
        .slice(parsed.findIndex((x) => x !== 0))
        .map((x) => x.toString().padStart(2, '0'))
        .join(':');

    return final.length <= 3 ? `0:${final.padStart(2, '0') || 0}` : final;
}

export function durationString(durObj: Record<string, number>) {
    return Object.values(durObj)
        .map((m) => (isNaN(m) ? 0 : m))
        .join(':');
}

export function parseMS(milliseconds: number) {
    const round = milliseconds > 0 ? Math.floor : Math.ceil;

    return {
        days: round(milliseconds / 86400000),
        hours: round(milliseconds / 3600000) % 24,
        minutes: round(milliseconds / 60000) % 60,
        seconds: round(milliseconds / 1000) % 60
    } as TimeData;
}

export function isVoiceEmpty(channel: VoiceChannel | StageChannel) {
    return channel.members.filter((member) => !member.user.bot).size === 0;
}

export function wait(time: number) {
    return new Promise((r) => setTimeout(r, time).unref());
}
