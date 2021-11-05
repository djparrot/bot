import { EventListener } from '../event-handler';
import { Api } from '@top-gg/sdk';

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
    }
};
