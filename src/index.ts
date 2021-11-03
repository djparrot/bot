import 'dotenv/config';
import './services/api';
import { Client } from './extensions';
import { logger, MongoDB } from './services';

const client = new Client(process.env.DISCORD_TOKEN, new MongoDB());
client.start().then(() => {
    logger.log('Client is ready!');
});
