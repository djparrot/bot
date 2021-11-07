// import { EventListener } from '../event-handler';
// import config from '../../../config.json';
// import { TextChannel } from 'discord.js';

// export const listener: EventListener<'shardReconnecting'> = {
//     event: 'shardReconnecting',
//     async run(client, shardId) {
//         const channel = client.channels.cache.get(
//             config['shards-channel']
//         ) as TextChannel;
//         channel.send(`Shard #${shardId} is reconnecting...`);
//     }
// };
