import { stripColors } from 'colors';
import { TextChannel } from 'discord.js';
import { createWriteStream, readFileSync } from 'fs';
import { Client } from '../extensions';
import config from '../../config.json';

export default class Logger {
    private file = `./logs/${new Date()
        .toLocaleDateString()
        .replace(/\//g, '-')}.log`;
    private stream = createWriteStream(this.file);

    constructor() {
        let file: Buffer;
        try {
            file = readFileSync(this.file);
        } catch (ignored) {}
        if (file) this.stream.write(file.toString('utf8'));
    }

    private static _getInfo() {
        let info: string;
        try {
            throw new Error();
        } catch (e: any) {
            const lines = <string[]>e.stack.split('\n');
            const line = lines[3];
            const matched = line.match(/([\w\d\-_.\/]*:\d+:\d+)/);
            info = matched[1].split('djparrot/')[1];
        }
        return info;
    }

    public log(...messages: any[]) {
        const text = [];
        for (const m of messages) {
            if (typeof m !== 'string') {
                text.push(m.toString());
            } else {
                text.push(m);
            }
        }

        const info = Logger._getInfo();

        const d = new Date();
        let month: string | number = d.getMonth() + 1;
        if (month < 10) month = `0${month}`;
        let date: string | number = d.getDate();
        if (date < 10) date = `0${date}`;
        let hour: string | number = d.getHours();
        if (hour < 10) hour = `0${hour}`;
        let minutes: string | number = d.getMinutes();
        if (minutes < 10) minutes = `0${minutes}`;
        let sec: string | number = d.getSeconds();
        if (sec < 10) sec = `0${sec}`;
        const now = `[${d.getFullYear()}/${month}/${date} ${hour}:${minutes}:${sec}]`;
        const log = [
            now.bgGreen.black.bold,
            info?.red?.italic ?? '',
            '->'.blue.bold,
            text.join(' ').cyan
        ].join(' ');

        (
            Client.instance?.channels?.cache?.get(config['logs']) as TextChannel
        )?.send(stripColors(log));
        this.stream.write(stripColors(log) + '\n');
        console.log(log);
    }
}
