import { EventListener } from '../event-handler';
import { Api } from '@top-gg/sdk';
import fetch from 'node-fetch';
import config from '../../../config.json';

export const listener: EventListener<'ready'> = {
    event: 'ready',
    async run(client) {
        client.user.setActivity({
            name: 'music',
            type: 'LISTENING',
            url: config['website-url']
        });

        const dblapi = new Api(process.env.TOPGG_API_TOKEN);
        setInterval(async () => {
            await dblapi.postStats({
                serverCount: client.guilds.cache.size,
                shardCount: client.shard?.count ?? 1
            });

            await fetch(
                `https://discord.bots.gg/api/v1/bots/${client.user.id}/stats`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: process.env.DISCORDBOTS_API_TOKEN
                    },
                    body: JSON.stringify({
                        guildCount: client.guilds.cache.size,
                        shardCount: client.shard?.count ?? 1,
                        shardId: 1
                    })
                }
            );
        }, 1800000);
    }
};
