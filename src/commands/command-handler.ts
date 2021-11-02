import { readdirSync } from 'fs';
import { join } from 'path';
import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v9';
import { CommandInteraction } from 'discord.js';
import { Client } from '../extensions';
import { logger } from '../services';

export const loadCommands = async (
    client: Client,
    shouldUpdateCommands: boolean = true
) => {
    const ignoredFiles = ['command-handler.js'];

    readdirSync(__dirname)
        .filter((file) => !ignoredFiles.includes(file))
        .forEach((dir) => {
            const commands = readdirSync(join(__dirname, dir)).filter((file) =>
                file.endsWith('.js')
            );

            for (const file of commands) {
                try {
                    const cmd = require(`./${dir}/${file}`)?.command as Command;
                    if (!cmd) continue;
                    client.commands.set(cmd.builder.name, cmd);
                } catch (err) {
                    logger.log(err);
                }
            }
        });

    if (shouldUpdateCommands)
        await client.restClient.put(
            Routes.applicationCommands(client.user.id),
            {
                body: client.commands.map((cmd) => cmd.builder.toJSON())
            }
        );
};

export interface Command {
    builder:
        | SlashCommandBuilder
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

    run(client: Client, interaction: CommandInteraction): void;
}
