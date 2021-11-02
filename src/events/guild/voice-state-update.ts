import { EventListener } from '../event-handler';

export const listener: EventListener<'voiceStateUpdate'> = {
    event: 'voiceStateUpdate',
    async run(client, oldState, newState) {
        if (oldState.member.id !== client.user.id) return;
        if (!oldState.channel?.id && newState.channel?.id) return;
    }
};
