import { EventListener } from '../event-handler';

export const listener: EventListener<'voiceStateUpdate'> = {
    event: 'voiceStateUpdate',
    async run(client, oldState, newState) {
        if (newState.member.id !== client.user.id) return;
        const queue = client.queue.get(oldState.guild.id);
        if (!queue) return;

        if (newState.member?.id === client.user?.id && !newState.channelId) {
            client.queue.delete(newState.guild.id);
        }

        if (
            newState.member?.id === client.user?.id &&
            newState.channelId &&
            oldState.channelId &&
            oldState.channelId !== newState.channelId
        ) {
            queue.voiceChannel = newState.channel;
        }
    }
};
