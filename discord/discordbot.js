import Discord, {Events, IntentsBitField} from "discord.js";
import updateCommands from "./commandHandler.js"
import {startNewsHandler} from "./newsHandler.js";

export function initBot() {
    const client = new Discord.Client({intents: [IntentsBitField.Flags.Guilds]});
    client.on(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user.tag}!`);
        startNewsHandler(client)
        updateCommands(client, null)
    });

    client.on(Events.GuildCreate, guild => {
        // bot joined a build <3
        console.log("just joined:")
        console.log(guild)
        // add command to new guild
        // updateCommands(client, guild)
    })

    client.on(Events.GuildDelete, guild => {
        // bot left a build
        console.log("just left:")
        console.log(guild)
    })

    // client.on(Events.)

    client.login(process.env.discord_token).then();
}