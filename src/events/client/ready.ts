import { logger } from '../../services';
import { EventListener } from '../event-handler';

export const listener: EventListener<'ready'> = {
    event: 'ready',
    async run(client) {
        logger.log('Client is ready!');
        logger.log('Logged in as', client.user.tag);
    }
};
