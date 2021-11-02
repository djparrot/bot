import { EventListener } from '../event-handler';
import { Api } from '@top-gg/sdk';
import { ActivityTypes } from 'discord.js/typings/enums';

export const listener: EventListener<'ready'> = {
    event: 'ready',
    async run(client) {
        client.user.setActivity({
            name: 'music',
            type: ActivityTypes.LISTENING,
            url: 'https://djparrot.xyz'
        });

        /*const dblapi = new Api(process.env.TOPGG_API_TOKEN);
        setInterval(() => {
            dblapi.postStats({
                serverCount: client.guilds.cache.size,
                shardCount: client.shard.count
            });
        }, 1800000);*/
    }
};
