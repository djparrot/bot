import { SlashCommandBuilder } from '@discordjs/builders';
import { createEmbed, formatCase } from '../../utils';
import { Command } from '../command-handler';

export const command: Command = {
    builder: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays the help page')
        .addStringOption((option) =>
            option
                .setName('command')
                .setRequired(false)
                .setDescription('The command you want to get help for')
        ),
    run(client, interaction) {
        const command = client.commands.get(
            interaction.options.getString('command')
        );
        if (command) {
            const embed = createEmbed()
                .setDescription(
                    `${command.builder.description}\nUsage: \`/${
                        command.builder.name
                    } ${command.builder
                        .toJSON()
                        .options.map((option) =>
                            option.required
                                ? `<${option.name}>`
                                : `(${option.name})`
                        )}\``
                )
                .setTitle(formatCase(command.builder.name));
            interaction.reply({ embeds: [embed] }).catch(() => {});
        } else {
            const help: {
                [category: string]: Array<Command>;
            } = {};
            client.commands.forEach((command) => {
                const cat = ['about', 'help', 'invite'].includes(
                    command.builder.name
                )
                    ? 'misc'
                    : 'music';
                if (!help.hasOwnProperty(cat)) help[cat] = [];
                help[cat].push(command);
            });

            const embed = createEmbed()
                .setThumbnail(
                    'https://discord.com/assets/5f8aee4f266854e41de9778beaf7abca.svg'
                )
                .setTitle('Help Menu');

            for (const category in help) {
                embed.addField(
                    `${formatCase(category)}`,
                    `\`${help[category]
                        .map((command) => command.builder.name)
                        .join('`, `')}\`.`
                );
            }

            interaction.reply({ embeds: [embed] }).catch(() => {});
        }
    }
};
