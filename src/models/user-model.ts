import { Schema, model } from 'mongoose';

export interface UserDB {
    _id?: string;
    premium?: boolean;
    expires?: number;
    paid?: boolean;
}

export const userSchema = new Schema({
    _id: { type: String },
    premium: { type: Boolean, default: false },
    expires: { type: Number, default: 0 },
    paid: { type: Boolean, default: false }
});

export const userModel = model<UserDB>('users', userSchema);
