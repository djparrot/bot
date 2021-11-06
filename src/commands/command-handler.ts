import { readdirSync } from 'fs';
import { join } from 'path';
import {
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from '@discordjs/builders';
import { ApplicationCommandOptionType, Routes } from 'discord-api-types/v9';
import { CommandInteraction } from 'discord.js';
import { Client } from '../extensions';
import { logger } from '../services';

export const loadCommands = async (client: Client) => {
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

    await client.restClient.put(
        Routes.applicationGuildCommands(client.user.id, '745955508640415764'),
        {
            body: client.commands.map((cmd) => {
                const raw = cmd.builder.toJSON();
                if (raw.name === 'volume') {
                    const option = raw.options.find(
                        (opts) =>
                            opts.type === ApplicationCommandOptionType.Integer
                    );
                    // @ts-ignore
                    option.min_value = 0;
                    // @ts-ignore
                    option.max_value = 200;
                }
                return raw;
            })
        }
    );
};

export interface Command {
    builder:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

    isDjCommand?: boolean;
    needsQueue?: boolean;
    run(client: Client, interaction: CommandInteraction): void;
}
