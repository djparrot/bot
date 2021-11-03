import { isVoiceEmpty } from '../../utils';
import { EventListener } from '../event-handler';

export const listener: EventListener<'voiceStateUpdate'> = {
    event: 'voiceStateUpdate',
    async run(client, oldState, newState) {
        const queue = client.queue.get(oldState.guild.id);
        if (!queue) return;

        if (
            oldState.channelId &&
            newState.channelId &&
            oldState.channelId !== newState.channelId
        ) {
            if (queue?.connection) queue.connection.channel = newState.channel;
        }

        if (
            !oldState.channelId &&
            newState.channelId &&
            newState.member.id === newState.guild.me.id
        ) {
            if (newState.serverMute || !newState.serverMute) {
                queue.setPaused(newState.serverMute);
            } else if (newState.suppress || !newState.suppress) {
                if (newState.suppress)
                    newState.guild.me.voice
                        .setRequestToSpeak(true)
                        .catch(() => {});
                queue.setPaused(newState.suppress);
            }
        }

        if (
            oldState.channelId === newState.channelId &&
            oldState.member.id === newState.guild.me.id
        ) {
            if (oldState.serverMute !== newState.serverMute) {
                queue.setPaused(newState.serverMute);
            } else if (oldState.suppress !== newState.suppress) {
                if (newState.suppress)
                    newState.guild.me.voice
                        .setRequestToSpeak(true)
                        .catch(() => {});
                queue.setPaused(newState.suppress);
            }
        }

        if (oldState.member.id === client.user.id && !newState.channelId) {
            queue.destroy();
            return; // TODO: Send error message to the user
        }

        if (!queue.connection || !queue.connection.channel) return;

        if (!oldState.channelId || newState.channelId) {
            const emptyTimeout = queue._cooldownsTimeout.get(
                `empty_${oldState.guild.id}`
            );
            const channelEmpty = isVoiceEmpty(queue.connection.channel);

            if (!channelEmpty && emptyTimeout) {
                clearTimeout(emptyTimeout);
                queue._cooldownsTimeout.delete(`empty_${oldState.guild.id}`);
            }
        } else {
            if (!isVoiceEmpty(queue.connection.channel)) return;
            const timeout = setTimeout(() => {
                if (!isVoiceEmpty(queue.connection.channel)) return;
                if (!client.queue.has(queue.guild.id)) return;
                if (queue.options.leaveOnEmpty) queue.destroy();
                // TODO: Disconnect if channel empty
            }, queue.options.leaveOnEmptyCooldown || 0).unref();
            queue._cooldownsTimeout.set(`empty_${oldState.guild.id}`, timeout);
        }
    }
};
