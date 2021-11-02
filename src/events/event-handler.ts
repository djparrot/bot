import { readdirSync } from 'fs';
import { join } from 'path';
import { Client } from '../extensions';
import { logger } from '../services';
import { ClientEvents } from 'discord.js';

export const loadEvents = (client: Client) => {
    const ignoredFiles = ['event-handler.js'];
    let evts = 0;

    readdirSync(__dirname)
        .filter((file) => !ignoredFiles.includes(file))
        .forEach((dir) => {
            const events = readdirSync(join(__dirname, dir)).filter((file) =>
                file.endsWith('.js')
            );

            for (const file of events) {
                try {
                    const evt = require(`./${dir}/${file}`)?.listener;
                    if (!evt) continue;
                    evts++;
                    client.on(evt.event, evt.run.bind(null, client));
                } catch (err) {
                    logger.log(err);
                }
            }
        });

    return evts;
};

export interface EventListener<T extends keyof ClientEvents> {
    event: T;

    run(client: Client, ...args: ClientEvents[T]): void;
}
