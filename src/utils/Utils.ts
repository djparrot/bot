import {
    CommandInteraction,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentType,
    MessageEmbed,
    PermissionString,
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

export function checkPerms(
    member: GuildMember,
    perms: PermissionString | Array<PermissionString>
) {
    if (typeof perms === 'string') {
        if (!member.permissions.has(perms)) return false;
    } else {
        for (const perm of perms) {
            if (!member.permissions.has(perm)) return false;
        }
    }
    return true;
}

export function createEmbed() {
    return new MessageEmbed().setColor('#B4E0E0').setTimestamp();
}

export function formatCase(str: string) {
    return str.split('')[0].toUpperCase() + str.slice(1).toLowerCase();
}

export function chunk<T>(arr: Array<T>, size: number): T[][] {
    const temp: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        temp.push(arr.slice(i, i + size));
    }
    return temp;
}

export async function pagination(
    interaction: CommandInteraction,
    embeds: MessageEmbed[]
) {
    let nextButton = new MessageButton()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle('SECONDARY');
    let previousButton = new MessageButton()
        .setCustomId('previous')
        .setLabel('Previous')
        .setStyle('SECONDARY');

    let page = 0;

    const row = new MessageActionRow().addComponents(
        previousButton,
        nextButton
    );

    const current = (await interaction.editReply({
        embeds: [embeds[page]],
        components: [row]
    })) as Message;

    const collector =
        current.createMessageComponentCollector<MessageComponentType>({
            filter: (i) =>
                (i.customId === nextButton.customId ||
                    i.customId === previousButton.customId) &&
                i.user.id === interaction.user.id,
            time: 120000
        });

    collector.on('collect', async (i) => {
        if (i.customId === nextButton.customId) {
            page++;
            if (page >= embeds.length) page = 0;
        } else if (i.customId === previousButton.customId) {
            page--;
            if (page < 0) page = embeds.length - 1;
        }

        await i.deferUpdate();
        await i.editReply({
            embeds: [embeds[page]],
            components: [row]
        });
        collector.resetTimer();
    });

    collector.on('end', () => {
        if (!current.deleted) {
            const disabledRow = new MessageActionRow().addComponents(
                previousButton.setDisabled(true),
                nextButton.setDisabled(true)
            );
            current.edit({
                embeds: [embeds[page]],
                components: [disabledRow]
            });
        }
    });
}

export function formatDuration(duration: number) {
    let seconds = duration / 1000;
    return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
}
