const Discord = require('discord.js');
const config = require('./config.js');
const sql = require('sqlite');
const path = require('path');

sql.open(path.join(__dirname, './db.sqlite'));

const client = new Discord.Client();

var invites = {};

const wait = require('util').promisify(setTimeout);

client.on('ready', () => {
  wait(1000);
  sql.run(`CREATE TABLE IF NOT EXISTS invite (ServerID TEXT, UserID TEXT, Invited TEXT)`);
  client.guilds.forEach(g => {
    g.fetchInvites().then(guildInvites => {
      invites[g.id] = guildInvites;
    });
  });
});

client.on('guildMemberAdd', member => {
  member.guild.fetchInvites().then(guildInvites => {
    const ei = invites[member.guild.id];
    const invite = guildInvites.find(i => ei.get(i.code).uses < i.uses);
    const inviter = client.users.get(invite.inviter.id);
    sql.get(`SELECT * FROM invite WHERE (ServerID, UserID) = (?, ?)`, [member.guild.id, inviter.id]).then((result) => {
      if (typeof result === 'undefined') {
        sql.run(`INSERT INTO invite (ServerID, UserID, Invited) VALUES (?, ?, ?)`, [member.guild.id, inviter.id, '1']);
      } else {
        let repINT = parseInt(result.Invited);
        let cRep = repINT + 1;
        sql.run(`UPDATE invite SET invited = ${cRep} WHERE UserID = "${inviter.id}" AND ServerID = "${member.guild.id}"`);
      }
    }).catch();
  });
});

client.on('message', message => {
  if (message.content === '!deleteinvites') {
    if (message.member.hasPermission("ADMINISTRATOR")) {
      sql.run(`DELETE FROM invite WHERE ServerID = ?`, [message.guild.id]);
      message.reply('Done!');
    } else {
      message.reply('You have insufficient permissions!');
    }
  }
});

client.login(config.Token);
