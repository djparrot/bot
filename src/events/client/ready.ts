import { EventListener } from '../event-handler';
import { Api } from '@top-gg/sdk';
import fetch from 'node-fetch';

export const listener: EventListener<'ready'> = {
    event: 'ready',
    async run(client) {
        client.user.setActivity({
            name: 'music',
            type: 'LISTENING',
            url: 'https://djparrot.xyz'
        });

        const dblapi = new Api(process.env.TOPGG_API_TOKEN);
        setInterval(() => {
            dblapi.postStats({
                serverCount: client.guilds.cache.size,
                shardCount: client.shard?.count ?? 1
            });
        }, 1800000);

        setInterval(() => {
            fetch('https://discord.bots.gg/api/v1/bots/764418734747549696/stats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': process.env.DISCORDBOTS_API_TOKEN
                },
                body: JSON.stringify({
                    guildCount: client.guilds.cache.size,
                    shardCount: client.shard?.count ?? 1
                })
            });
        }, 1800000);
    }
};
