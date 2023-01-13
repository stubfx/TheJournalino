import {
    Client,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from "discord.js";

/**
 *
 @type {Array<{data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("Toggle news permission")
        // .addUserOption((option) => option.setName('language').setDescription('Language').setRequired(true))
        .addStringOption(builder => builder
            .setName("topic")
            .setDescription("Alters a user's points")
            .addChoices(
                {name: 'Top News', value: 'top'},
                {name: 'Gaming', value: 'gaming'},
                {name: 'Tech', value: 'tech'},
                {name: 'Stocks', value: 'stocks'},
            )
            .setRequired(true)
        )
        .addStringOption(builder => builder
            .setName("language")
            .setDescription("Alters a user's points")
            .addChoices(
                {name: 'English', value: 'en'},
                {name: 'Italiano', value: 'it'}
            )
            .setRequired(true)
        ),
    // .setDefaultMemberPermissions(PermissionsBitField.Default),
    async execute(client, interaction) {
        console.log("aaaa")
        await interaction.reply({content: 'News will be here soon!', ephemeral: true},);
    }
}]
export default commands;