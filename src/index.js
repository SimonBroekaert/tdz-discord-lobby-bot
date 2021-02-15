"use strict";

require('dotenv').config();

const Discord = require('discord.js');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const { upperFirst } = require('lodash');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ lobbies: [] }).write();

const prefix = "$";

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', message => {
    const content = message.content;
    const channel = message.channel;
    const user = message.member;
    // Return if message doesn't start with the prefix
    if (!content.startsWith(prefix)) return;
    // Remove prefix
    const cleanContent = content.slice(prefix.length);
    // Split the content for easy use
    const contentParts = cleanContent.split(' ');
    // Get the command name
    const command = contentParts[0];

    if (!command) return;

    switch (command) {
        case "lobby":
        case "l":
            const action = contentParts[1];

            if (!action) return;

            switch (action) {
                case "create":
                    if (contentParts[2] == 'undefined' || contentParts[3] == 'undefined') return;
                    const size = contentParts[2];
                    const game = upperFirst(contentParts.slice(3).join(' '));

                    const id = (new Date()).getTime();

                    db.get('lobbies').push({
                        id: id,
                        game: game,
                        size: size,
                        players: [],
                    }).write();

                    const messageEmbed = new Discord.MessageEmbed();
                    messageEmbed
                        .setColor('#8e44ad')
                        .setTitle(`"${user.displayName}" wants to play \`${game}\``)
                        .setDescription(`\`\`\`css\nLobby: 0 / ${size}\`\`\``)
                        .addField('Players:', "No players yet ...", false)
                        .addField('\u200b', "Click 👍 like to join the lobby", false)
                        .setFooter(`Lobby reference: ${id}`)
                    ;

                    channel.send(messageEmbed).then(response => {
                        response.react('👍').then(() => {
                            const filter = (reaction, player) => {
                                return ['👍'].includes(reaction.emoji.name) && !player.bot;
                            };
                            
                            const collector = response.createReactionCollector(filter, { dispose: true });

                            collector.on('collect', async (reaction, player) => {
                                let players = db.get('lobbies').find({ id: id }).get('players').value();
                                
                                if (players.length >= parseInt(size)) return;

                                db.get('lobbies').find({ id: id }).get('players').push(player).write();

                                players = db.get('lobbies').find({ id: id }).get('players').value();

                                let playerCounter = players.length == 0 ? "No players yet..." : `${players.map(player => `${player}`).join('\n')}`;

                                const playerJoinedEmbed = new Discord.MessageEmbed();
                                playerJoinedEmbed
                                    .setColor('#8e44ad')
                                    .setTitle(`"${user.displayName}" wants to play \`${game}\``)
                                    .setDescription(`\`\`\`css\nLobby: ${players.length} / ${size}\`\`\``)
                                    .addField('Players:', playerCounter, false)
                                    .addField('\u200b', "Click 👍 like to join the lobby", false)
                                    .setFooter(`Lobby reference: ${id}`)
                                ;

                                response.edit(playerJoinedEmbed);
                            });
                            collector.on('remove', (reaction, player) => {
                                db.get('lobbies').find({ id: id }).get('players').remove({ id: player.id }).write();

                                let players = db.get('lobbies').find({ id: id }).get('players').value();

                                let playerCounter = players.length == 0 ? "No players yet..." : `${players.map(player => `${player}`).join('\n')}`;

                                const playerJoinedEmbed = new Discord.MessageEmbed();
                                playerJoinedEmbed
                                    .setColor('#8e44ad')
                                    .setTitle(`"${user.displayName}" wants to play \`${game}\``)
                                    .setDescription(`\`\`\`css\nLobby: ${players.length} / ${size}\`\`\``)
                                    .addField('Players:', playerCounter, false)
                                    .addField('\u200b', "Click 👍 like to join the lobby", false)
                                    .setFooter(`Lobby reference: ${id}`)
                                ;

                                response.edit(playerJoinedEmbed);
                            });
                        });
                    });

                    break; 
                case "remove":
                case "r":
                    if (contentParts[2] == 'undefined') return;
                    const lobbyId = contentParts[2];
                    db.get('lobbies').remove({ id: parseInt(lobbyId) }).write();
                    break;
                default:
                    channel.send('Lobby action not found.');
            }
            break;
        default:
            channel.send('Command not found.');
    }

    message.delete();
});

client.login(process.env.CLIENT_TOKEN);
