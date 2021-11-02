import { EventListener } from '../event-handler';
import { CommandInteraction, GuildMember, TextChannel } from 'discord.js';
import { createErrorEmbed } from '../../utils';
import { logger } from '../../services';

export const listener: EventListener<'interactionCreate'> = {
    event: 'interactionCreate',
    async run(client, interaction: CommandInteraction) {
        if (!interaction.isCommand() || !interaction.inGuild()) return;

        const command = client.commands.get(interaction.commandName);

        try {
            command.run(client, interaction);
        } catch (err: any) {
            logger.log(err);
            interaction.replied
                ? await interaction.editReply({
                      embeds: [
                          createErrorEmbed(
                              'An error occurred while executing this command'
                          )
                      ]
                  })
                : await interaction.reply({
                      embeds: [
                          createErrorEmbed(
                              'An error occurred while executing this command'
                          )
                      ],
                      ephemeral: true
                  });
        }
    }
};
