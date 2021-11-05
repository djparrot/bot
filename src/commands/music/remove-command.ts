import { SlashCommandBuilder } from '@discordjs/builders';
import { Track } from '../../structures';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Removes the specified song from the queue')
        .addStringOption((builder) =>
            builder
                .setName('input')
                .setRequired(true)
                .setDescription(
                    'The position or the title of the song you want to remove'
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

        const removedTrack = queue.remove(track);
        if (!removedTrack)
            return interaction
                .reply({
                    ephemeral: true,
                    content: '<:deny:905916059993923595> Track not found!'
                })
                .catch(() => {});

        interaction
            .reply({
                content: `<:check:905916070471295037> Removed ${removedTrack.title}!`
            })
            .catch(() => {});
    }
};
