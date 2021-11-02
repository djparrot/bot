import { EventListener } from '../event-handler';

export const listener: EventListener<'ready'> = {
    event: 'ready',
    async run(client) {}
};
