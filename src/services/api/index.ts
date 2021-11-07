import express from 'express';
import { TextChannel } from 'discord.js';
import Topgg from '@top-gg/sdk';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { logger } from '..';
import { Client } from '../../extensions';
import { playlistModel, userModel } from '../../models';
import { createEmbed } from '../../utils';
import config from '../../../config.json';

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
            `https://discord.com/api/oauth2/authorize?client_id=${
                client.user.id
            }&redirect_uri=${encodeURIComponent(
                config['callback-url']
            )}&response_type=code&scope=identify%20guilds&state=${
                req.query.state as string
            }`
        );
    });

    app.get('/callback', (req, res) => {
        fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: client.user.id,
                client_secret: process.env.DISCORD_SECRET,
                grant_type: 'authorization_code',
                code: req.query.code as string,
                redirect_uri: encodeURIComponent(config['callback-url'])
            })
        })
            .then((r) => r.json())
            .then((resp) => {
                console.log(resp);
                fetch('https://discord.com/api/users/@me', {
                    headers: {
                        Authorization: `${resp.token_type} ${resp.access_token}`
                    }
                })
                    .then((result) => result.json())
                    .then((response) => {
                        console.log(response);
                        connections.set(req.query.state as string, response);
                        res.redirect(config['website-url']);
                    })
                    .catch((err) => {
                        logger.log(err);
                        res.redirect(config['website-url']);
                    });
            })
            .catch((err) => {
                logger.log(err);
                res.redirect(config['website-url']);
            });
    });

    app.post('/logout', (req, res) => {
        connections.delete(req.query.state as string);
        res.redirect(config['website-url']);
    });

    app.post('/auth', (req, res) => {
        res.send({
            user: connections.get(req.query.state as string)
        });
    });

    app.get('/invite', (req, res) => {
        res.redirect(
            `https://discord.com/oauth2/authorize?client_id=${
                client.user.id
            }&scope=bot%20applications.commands&permissions=4331719680&guild_id=${
                req.query?.guildId
            }&redirect_uri=${encodeURIComponent(config['callback-url'])}`
        );
    });

    app.get('/discord', (_req, res) => {
        res.redirect(config['server-invite']);
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
                    `${user.tag} gets 12 hours of ${client.user.username} premium!\n\nYou can vote [here](https://top.gg/bot/${client.user.id}/vote) every 12 hours`
                )
                .setFooter('Thank you for your support!');
            (
                client.channels.cache.get('800304312471388181') as TextChannel
            ).send({ embeds: [embed] });
            user.send(
                `Thanks for voting!\nTo thank you, I offer you 12h of ${client.user.username} premium!\nHave a good day`
            ).catch(() => {});
            client.guilds.cache
                .get(config['server-id'])
                .members.cache.get(user.id)
                ?.roles.add(config['voter-role']);
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
                        `Your premium is over!\nUpvote ${client.user.username} to get 12h of ${client.user.username} premium! (https://top.gg/bot/${client.user.id}/vote)`
                    )
                    .catch(() => {});
                client.guilds.cache
                    .get(config['server-id'])!
                    .members.cache.get(user.id)
                    ?.roles.remove(config['voter-role']);
                client.guilds.cache
                    .get(config['server-id'])!
                    .members.cache.get(user.id)
                    ?.roles.remove(config['premium-role']);
            }
        });
    }

    setInterval(() => {
        unPremium();
    }, 60000);

    const port = process.env.PORT || 8080;
    return await new Promise((r) => app.listen(port, () => r(port)));
}
