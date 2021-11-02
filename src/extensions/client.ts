import { Client as DiscordClient, Collection, Intents } from 'discord.js';
import { Command, loadCommands } from '../commands/command-handler';
import Database from '../interfaces/database';
import { logger } from '../services';
import { loadEvents } from '../events/event-handler';
import { REST } from '@discordjs/rest';

export default class Client extends DiscordClient {
    public commands = new Collection<string, Command>();
    public restClient: REST;

    constructor(token: string, public db: Database) {
        super({
            allowedMentions: {
                repliedUser: false
            },
            intents: [Intents.FLAGS.GUILD_VOICE_STATES]
        });
        this.token = token;
        this.restClient = new REST({ version: '9' }).setToken(token);
    }

    public async start() {
        logger.log('Registering events...'.italic.magenta);
        const events = loadEvents(this);
        logger.log(`Successfully registered ${events} events!`);
        logger.log('Loading client...'.italic.magenta);
        await super.login(this.token);
        logger.log(`Logged in as ${this.user.tag}!`);
        logger.log('Connecting to the database...'.italic.magenta);
        await this.db.connect();
        logger.log('Database connected!');
        logger.log('Registering commands...'.italic.magenta);
        await loadCommands(this);
        logger.log(`Successfully registered ${this.commands.size} commands!`);
    }
}
