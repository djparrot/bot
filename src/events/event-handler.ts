import { readdirSync } from 'fs';
import { join } from 'path';
import { Client } from '../extensions';
import { logger } from '../services';
import { ClientEvents } from 'discord.js';

export const loadEvents = (client: Client) => {
    const ignoredFiles = ['event-handler.js'];
    let events = 0;

    readdirSync(__dirname)
        .filter((file) => !ignoredFiles.includes(file))
        .forEach((dir) => {
            const commands = readdirSync(join(__dirname, dir)).filter((file) =>
                file.endsWith('.js')
            );

            for (const file of commands) {
                try {
                    const evt = require(`./${dir}/${file}`)?.listener;
                    if (!evt) continue;
                    events++;
                    client.on(evt.event, evt.run.bind(null, client));
                } catch (err) {
                    logger.log(err);
                }
            }
        });

    return events;
};

export interface EventListener<T extends keyof ClientEvents> {
    event: T;

    run(client: Client, ...args: ClientEvents[T]);
}
