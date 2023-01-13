import {ButtonInteraction, ChatInputCommandInteraction, Collection, Events, REST} from "discord.js";
import {Routes} from "discord-api-types/v10";
import discordCommands from "./handlerData/discord-commands.js";
import discordCTAs from "./handlerData/discord-cta.js";

const commands = new Collection()
const restCommands = []

for (const rawCommand of discordCommands) {
    // const filePath = path.join(commandsPath, file);
    // const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in rawCommand && 'execute' in rawCommand) {
        restCommands.push(rawCommand.data.toJSON())
        commands.set(rawCommand.data.name, rawCommand);
    } else {
        // console.log(`[WARNING] The command at ${} is missing a required "data" or "execute" property.`);
        console.error("Error importing command")
    }
}

export default async function updateCommands(client, guild) {
    const rest = new REST({version: '10'}).setToken(process.env.discord_token);

    try {
        console.log(`Started refreshing commands.length application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            // Routes.applicationGuildCommands(process.env.discord_application_id, guild.id),
            Routes.applicationGuildCommands(process.env.discord_application_id, '1063234596847763506'),
            {body: restCommands},
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }


    client.on(Events.InteractionCreate, async interaction => {
        if (interaction instanceof ButtonInteraction) {
            // check in the ctas!
            let cta = discordCTAs.find(value => value.name === interaction.customId);
            await cta.execute(client, interaction)
        } else if (interaction instanceof ChatInputCommandInteraction) {
            const command = commands.get(interaction.commandName);
            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(client, interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    });
}