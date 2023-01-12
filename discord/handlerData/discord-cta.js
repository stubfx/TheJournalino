import {BaseInteraction, Client, ButtonInteraction} from "discord.js";

const logChannel = "759906444841058335"

/**
 *
 * @type {[{name: String, execute(Client, BaseInteraction | ButtonInteraction): Promise<void>}]}
 */
const discordCTAs = [{
    name: "nukeserver_cta_1",
    async execute(client, interaction) {
        interaction.guild.channels.fetch(logChannel)
            .then(value => {
                value.send(`${interaction.user.username} is trying to nuke the server. And that's definitely gonna happen!`)
            })
        await interaction.update({
            content: ':warning: Going to nuke the server in 1 day. If this is a mistake pls let us know in the #general channel ASAP.:warning:',
            components: []});
    }
}]
export default discordCTAs;