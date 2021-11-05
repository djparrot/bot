import express from 'express';
import 'dotenv/config';
import { MessageEmbed, TextChannel } from 'discord.js';
import Topgg from '@top-gg/sdk';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { logger } from '..';
import { Client } from '../../extensions';
import { playlistModel, userModel } from '../../models';
import { createEmbed } from '../../utils';

const app = express();
const TopggWebhook = new Topgg.Webhook(process.env.TOPGG_WEBHOOK_AUTH);
let connections = new Map<string, any>();

export default async function api(client: Client) {
    app.use(
        require('cors')({
            origin: '*'
        })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.get('/login', (req, res) => {
        connections.set(req.query.state as string, null);
        res.redirect(
            `https://discord.com/api/oauth2/authorize?client_id=764418734747549696&redirect_uri=https%3A%2F%2Fdjparrot.herokuapp.com%2Fcallback&response_type=code&scope=identify%20guilds&state=${
                req.query.state as string
            }`
        );
    });

    app.get('/callback', (req, res) => {
        axios
            .get('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: new URLSearchParams({
                    client_id: '764418734747549696',
                    client_secret: process.env.DISCORD_SECRET,
                    grant_type: 'authorization_code',
                    code: req.query.code as string,
                    redirect_uri: 'https://djparrot.herokuapp.com/callback'
                })
            })
            .then((response) => {
                fetch('https://discord.com/api/users/@me', {
                    headers: {
                        Authorization: `${response.data.token_type} ${response.data.access_token}`
                    }
                })
                    .then((result) => result.json())
                    .then((response) => {
                        connections.set(req.query.state as string, response);
                        res.redirect('https://djparrot.xyz');
                    })
                    .catch((err) => {
                        logger.log(err);
                        res.redirect('https://djparrot.xyz');
                    });
            })
            .catch((err) => {
                logger.log(err);
                res.redirect('https://djparrot.xyz');
            });
    });

    app.get('/logout', (req, res) => {
        connections.delete(req.query.state as string);
        res.redirect('https://djparrot.xyz');
    });

    app.post('/auth', (req, res) => {
        res.send({
            user: connections.get(req.query.state as string)
        });
    });

    app.get('/invite', (req, res) => {
        res.redirect(
            `https://discord.com/oauth2/authorize?client_id=764418734747549696&scope=bot%20applications.commands&permissions=3460160&guild_id=${req.query?.guildId}`
        );
    });

    app.get('/discord', (_req, res) => {
        res.redirect('https://discord.gg/AUfTUJA');
    });

    app.post('/playlists', async (_req, res) => {
        const playlists = await playlistModel.find({});
        res.send(playlists);
    });

    app.post('/playlist', async (req, res) => {
        const playlist = await playlistModel.findOne({
            _id: req.query.playlistId as string
        });
        res.send(playlist);
    });

    app.post('/stats', (_req, res) => {
        res.send({
            guilds: client.guilds.cache.size,
            users: client.guilds.cache
                .map((g) => g.memberCount)
                .reduce((a, b) => a + b),
            commands: client.commands.size,
            voiceConnections: client.voice.adapters.size ?? 0
        });
    });

    app.post('/like', async (req, res) => {
        const user = connections.get(req.query.state as string);
        if (!user) return res.sendStatus(403);
        const playlist = (await playlistModel.findOne({
            _id: req.query.playlistId as string
        })) as any;
        if (!playlist) return res.sendStatus(404);
        if (playlist.liked.includes(user.id)) {
            const pl = playlist;
            pl.liked.splice(playlist.liked.indexOf(user.id), 1);
            await playlistModel
                .updateOne(
                    { _id: req.query.playlistId as string },
                    {
                        $set: {
                            liked: pl.liked
                        }
                    }
                )
                .catch(() => res.sendStatus(500));
            res.status(200).send({ updated: true });
        } else {
            const pl = playlist;
            pl.liked.push(user.id);
            await playlistModel
                .updateOne(
                    { _id: req.query.playlistId as string },
                    {
                        $set: {
                            liked: pl.liked
                        }
                    }
                )
                .catch(() => res.sendStatus(500));
            res.status(200).send({ updated: true });
        }
    });

    app.post('/user', async (req, res) => {
        const user = await client.users.fetch(req.query.id as string);
        if (!user) return res.sendStatus(404);
        const dbUser = await client.db.getUser(req.query.id as string);
        res.send({
            user,
            dbUser
        });
    });

    app.post(
        '/dblwebhook',
        TopggWebhook.listener(async (vote) => {
            // if (req.vote.type === 'test') return;
            let user = await client.users.fetch(vote.user);
            if (!user) return;
            const embed = createEmbed()
                .setTitle(`${user.username} has just voted!`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `${user.tag} gets 12 hours of DJ Parrot premium!\n\nYou can vote [here](https://top.gg/bot/764418734747549696/vote) every 12 hours`
                )
                .setFooter('Thank you for your support!');
            (
                client.channels.cache.get('800304312471388181') as TextChannel
            ).send({ embeds: [embed] });
            user.send(
                'Thanks for voting!\nTo thank you, I offer you 12h of DJ Parrot premium!\nHave a good day'
            ).catch(() => {});
            client.guilds.cache
                .get('745955508640415764')
                .members.cache.get(user.id)
                ?.roles.add('777268865184563260');
            let member = await client.db.getUser(user.id);

            if (member.premium) {
                await client.db.updateUser(user.id, {
                    expires: member.expires! + 43200000
                });
            } else {
                await client.db.updateUser(user.id, {
                    premium: true,
                    expires: new Date().getTime() + 43200000
                });
            }
        })
    );

    async function unPremium() {
        const members = await userModel.find({ premium: true });
        members.forEach(async (member) => {
            let user = await client.users.fetch(member._id);
            if (!user) return;
            if (member.expires! < new Date().getTime()) {
                const embed = createEmbed()
                    .setTitle(
                        `${user.username}'s premium subscription has expired`
                    )
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }));
                if (member.paid)
                    (
                        client.channels.cache.get(
                            '779670042848788490'
                        ) as TextChannel
                    ).send({ embeds: [embed] });
                await client.db.updateUser(user.id, {
                    premium: false,
                    expires: new Date().getTime(),
                    paid: false
                });
                (await client.users.fetch(user.id))
                    .send(
                        'Your premium is over!\nUpvote DJ Parrot to get 12h of DJ Parrot premium! (https://top.gg/bot/764418734747549696/vote)'
                    )
                    .catch(() => {});
                client.guilds.cache
                    .get('745955508640415764')!
                    .members.cache.get(user.id)
                    ?.roles.remove('777268865184563260');
                client.guilds.cache
                    .get('745955508640415764')!
                    .members.cache.get(user.id)
                    ?.roles.remove('777269242558939186');
            }
        });
    }

    setInterval(() => {
        unPremium();
    }, 60000);

    const port = process.env.PORT || 8080;
    return await new Promise((r) => app.listen(port, () => r(port)));
}
