import Discord, {Events, IntentsBitField} from "discord.js";
import {startNewsHandler} from "./newsHandler.js";
import * as dbAdapter from "./dbAdapter.js";
import * as LoggerHelper from "./loggerHelper.js";
import updateCommands from "./commandHandler.js";

export function initBot() {
    const client = new Discord.Client({intents: [IntentsBitField.Flags.Guilds]});
    client.on(Events.ClientReady, async () => {
        LoggerHelper.init(client)
        await dbAdapter.init()
        await dbAdapter.updateAllPromo()
        LoggerHelper.dev(`Logged in as ${client.user.tag}!`);
        await updateCommands(client)
        startNewsHandler(client)
        LoggerHelper.info("TheJournalino ready!")
    });

    client.on(Events.GuildCreate, guild => {
        // bot joined a build <3
        LoggerHelper.success(`Joined Guild: ${guild.name}(${guild.id})`)
    })

    client.on(Events.GuildDelete, async guild => {
        // bot left a build
        LoggerHelper.error(`just left: ${guild.id} ${guild.name}`)
        await dbAdapter.removeGuild(guild)
    })

    client.on(Events.ChannelDelete, async channel => {
        await dbAdapter.removeNewsChannel(channel)
    })

    client.login(process.env.discord_token).catch(reason => {
        LoggerHelper.info(reason)
    });
}