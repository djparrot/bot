import 'dotenv/config';
import { inspect } from 'util';
import { Client } from './extensions';
import { logger, MongoDB } from './services';

const client = new Client(process.env.DISCORD_TOKEN, new MongoDB());
client
    .start()
    .then(() => {
        logger.log('Client is ready!');
    })
    .catch((err) => {
        process.exit();
    });

process.on('uncaughtException', (error, origin) => {
    logger.log(`Uncaught exception: ${inspect(error)}`);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.log(`Unhandled rejection: ${inspect(reason)}`);
});
