import { VoiceChannel, StageChannel, Collection, Snowflake } from 'discord.js';
import {
    DiscordGatewayAdapterCreator,
    entersState,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus
} from '@discordjs/voice';
import { StreamDispatcher } from '../handlers';

class VoiceUtils {
    public cache: Collection<Snowflake, StreamDispatcher>;

    constructor() {
        this.cache = new Collection<Snowflake, StreamDispatcher>();
    }

    public async connect(
        channel: VoiceChannel | StageChannel,
        options?: {
            deaf?: boolean;
            maxTime?: number;
        }
    ): Promise<StreamDispatcher> {
        const conn = await this.join(channel, options);
        const sub = new StreamDispatcher(conn, channel, options.maxTime);
        this.cache.set(channel.guild.id, sub);
        return sub;
    }

    public async join(
        channel: VoiceChannel | StageChannel,
        options?: {
            deaf?: boolean;
            maxTime?: number;
        }
    ) {
        let conn = joinVoiceChannel({
            guildId: channel.guild.id,
            channelId: channel.id,
            adapterCreator: channel.guild
                .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
            selfDeaf: Boolean(options.deaf)
        });

        try {
            conn = await entersState(
                conn,
                VoiceConnectionStatus.Ready,
                options?.maxTime ?? 20000
            );
            return conn;
        } catch (err) {
            conn.destroy();
            throw err;
        }
    }

    public disconnect(connection: VoiceConnection | StreamDispatcher) {
        if (connection instanceof StreamDispatcher)
            return connection.voiceConnection.destroy();
        return connection.destroy();
    }

    public getConnection(guild: Snowflake) {
        return this.cache.get(guild);
    }
}

export default VoiceUtils;
