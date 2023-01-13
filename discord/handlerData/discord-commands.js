import {
    Client,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from "discord.js";

import locales from '../datamodels/locales.js'
import {addNewsGuild} from "./discord-news.js";

const languages = locales

/**
 *
 @type {Array<{data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("News setup command")
        .addStringOption(builder => builder
            .setName("topic")
            .setDescription("The topic you want the news for")
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
            .setDescription("The languages you want to receive the news in")
            .addChoices(...languages)
            .setRequired(true)
        ),
    // .setDefaultMemberPermissions(PermissionsBitField.Default),
    async execute(client, interaction) {
        let guild = interaction.guild;
        let language = interaction.options.get('language');
        let topic = interaction.options.get('topic');
        // add this channel to the news queue!
        addNewsGuild(guild, interaction.channel.id, topic.value, language.value)
        await interaction.reply({content: `News will be here soon!`, ephemeral: true});
    }
}]
export default commands;