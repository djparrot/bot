import { Client } from '../extensions';
import { CommandInteraction } from 'discord.js';

export default class Player {
    constructor(
        public client: Client,
        public interaction: CommandInteraction
    ) {}
}
