import { SlashCommandBuilder } from '@discordjs/builders';
import { Track } from '../../structures';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('jump')
        .setDescription('Plays the specified song and remove it from the queue')
        .addStringOption((builder) =>
            builder
                .setName('input')
                .setRequired(true)
                .setDescription(
                    'The position or the title of the song you want to play'
                )
        ),
    isDjCommand: true,
    needsQueue: true,
    async run(client, interaction) {
        const queue = client.getQueue(interaction.guildId);

        let track: number | Track;
        if (!isNaN(parseInt(interaction.options.getString('input')))) {
            track = parseInt(interaction.options.getString('input'));
        } else {
            track = queue.tracks.find((t) =>
                t.title
                    .toLowerCase()
                    .includes(
                        interaction.options.getString('input').toLowerCase()
                    )
            );
        }

        if (!track || (typeof track === 'number' && !queue.tracks[track]))
            return interaction
                .reply({
                    ephemeral: true,
                    content: '<:deny:905916059993923595> Track not found!'
                })
                .catch(() => {});

        queue.jump(track);

        if (typeof track === 'number') track = queue.tracks[track];

        interaction
            .reply({
                content: `<:check:905916070471295037> Jumped to ${track.title}!`
            })
            .catch(() => {});
    }
};
