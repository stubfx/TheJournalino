import Discord, {IntentsBitField} from "discord.js";
import updateCommands from "./commandHandler.js"
import {startNewsHandler} from "./newsHandler.js";

const client = new Discord.Client({intents: [IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildPresences]});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // updateCommands(client)
    startNewsHandler(client)
});

client.login(process.env.discord_token).then();