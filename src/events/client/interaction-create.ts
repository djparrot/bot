import { EventListener } from '../event-handler';
import { CommandInteraction, GuildMember } from 'discord.js';
import { logger } from '../../services';

export const listener: EventListener<'interactionCreate'> = {
    event: 'interactionCreate',
    async run(client, interaction: CommandInteraction) {
        if (!interaction.isCommand() || !interaction.inGuild()) return;

        const command = client.commands.get(interaction.commandName);

        if (command.needsQueue) {
            const queue = client.getQueue(interaction.guildId);
            if (!queue)
                return interaction
                    .reply({
                        content:
                            '<:deny:905916059993923595> There is nothing playing in this server!',

                        ephemeral: true
                    })
                    .catch(() => {});
        }

        if (command.isDjCommand) {
            const settings = await client.db.getGuild(interaction.guildId);
            const member = interaction.guild.members.resolve(
                interaction.member as GuildMember
            );

            if (
                settings.djmod &&
                !member.roles.cache.find(
                    (role) => role.name.toUpperCase() === 'DJ'
                )
            )
                return interaction
                    .reply({
                        ephemeral: true,
                        content: '<:deny:905916059993923595> You are not a DJ!'
                    })
                    .catch(() => {});
        }

        try {
            command.run(client, interaction);
        } catch (err: any) {
            logger.log(err);
            interaction.replied
                ? await interaction
                      .editReply({
                          content:
                              '<:deny:905916059993923595> An error occurred while executing this command'
                      })
                      .catch(() => {})
                : await interaction
                      .reply({
                          content:
                              '<:deny:905916059993923595> An error occurred while executing this command',

                          ephemeral: true
                      })
                      .catch(() => {});
        }
    }
};
