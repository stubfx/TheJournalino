import Discord, {Events, IntentsBitField} from "discord.js";
import updateCommands from "./commandHandler.js"
import {startNewsHandler} from "./newsHandler.js";
import * as dbAdapter from "./db/dbAdapter.js";

export function initBot() {
    const client = new Discord.Client({intents: [IntentsBitField.Flags.Guilds]});
    client.on(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}!`);
        startNewsHandler(client)
        updateCommands(client)
    });

    client.on(Events.GuildCreate, guild => {
        // bot joined a build <3
        console.log(`just joined: ${guild.id} ${guild.name}`)
    })

    client.on(Events.GuildDelete, async guild => {
        // bot left a build
        console.log(`just left: ${guild.id} ${guild.name}`)
        await dbAdapter.removeGuild(guild)
    })

    client.on(Events.ChannelDelete, async channel => {
        await dbAdapter.removeNewsChannel(channel)
    })

    // client.on(Events.)

    client.login(process.env.discord_token).catch(reason => {
        console.log(reason)
    });
}