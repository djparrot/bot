import { EventListener } from '../event-handler';
import { CommandInteraction } from 'discord.js';

export const listener: EventListener<'interactionCreate'> = {
    event: 'interactionCreate',
    async run(client, interaction: CommandInteraction) {
        if (!interaction.isCommand()) return;
        client.commands.get(interaction.commandName)?.run(client, interaction);
    }
};
