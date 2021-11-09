import { connect } from 'mongoose';
import { userModel, guildModel, UserDB, GuildDB } from '../models';
import { Database } from '../interfaces';

export default class MongoDB implements Database {
    public connected: boolean;

    constructor() {
        this.connected = false;
    }

    public async connect() {
        await connect(process.env.MONGO_URI!);
        this.connected = true;
    }

    public async getUser(userId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        let data = (await userModel.findOne({ _id: userId })) as UserDB;
        if (!data) {
            data = await this.createUser(userId);
        }
        return data;
    }

    public async updateUser(userId: string, options: UserDB) {
        if (!this.connected) throw new Error('Not connected to the database');
        await userModel.updateOne({ _id: userId }, { $set: options });
    }

    public async deleteUser(userId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        await userModel.deleteOne({ _id: userId });
    }

    public async createUser(userId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        let data = new userModel({
            _id: userId
        });
        return await data.save();
    }

    public async getGuild(guildId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        let data = (await guildModel.findOne({ _id: guildId })) as GuildDB;
        if (!data) {
            data = await this.createGuild(guildId);
        }
        return data;
    }

    public async updateGuild(guildId: string, options: GuildDB) {
        if (!this.connected) throw new Error('Not connected to the database');
        await guildModel.updateOne({ _id: guildId }, { $set: options });
    }

    public async deleteGuild(guildId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        await guildModel.deleteOne({ _id: guildId });
    }

    public async createGuild(guildId: string) {
        if (!this.connected) throw new Error('Not connected to the database');
        let data = new guildModel({
            _id: guildId
        });
        return await data.save();
    }
}
