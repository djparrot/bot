import { Schema, model } from 'mongoose';

export interface GuildDB {
    _id?: string;
    djmod?: boolean;
}

export const guildSchema = new Schema({
    _id: { type: String },
    djmod: { type: Boolean, default: false }
});

export const guildModel = model<GuildDB>('guilds', guildSchema);
