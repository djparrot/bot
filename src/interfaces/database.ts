import { GuildDB, UserDB } from '../models';

export default interface Database {
    connected: boolean;

    connect(): Promise<void>;

    createUser(userId: string): Promise<UserDB>;
    getUser(userId: string): Promise<UserDB>;
    updateUser(userId: string, options: UserDB): Promise<void>;
    deleteUser(userId: string): Promise<void>;

    getGuild(guildId: string): Promise<GuildDB>;
    updateGuild(guildId: string, options: GuildDB): Promise<void>;
    createGuild(guildId: string): Promise<GuildDB>;
    deleteGuild(guildId: string): Promise<void>;
}
