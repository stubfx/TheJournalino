import {
    ChatInputCommandInteraction,
    Client, EmbedBuilder,
    PermissionFlagsBits,
    PermissionsBitField,
    SlashCommandBuilder,
} from "discord.js";

import locales from '../datamodels/locales.js'
import * as dbAdapter from "../dbAdapter.js";
import topicsData from "../datamodels/topicsData.js";
import * as LoggerHelper from "../loggerHelper.js";
import * as Utils from "../utils.js";

function getTopicDataAsCommandChoices() {
    let tmp = []
    for (let topicsDataKey in topicsData) {
        if (!topicsData[topicsDataKey].hideCommandOption) {
            tmp.push({name: topicsData[topicsDataKey].name, value: topicsDataKey})
        }
    }
    return tmp;
    // return [{name: 'Top News', value: 'top'},
    //     {name: 'Gaming', value: 'gaming'},
    //     {name: 'Tech', value: 'tech'},
    //     {name: 'Stocks', value: 'stocks'}]
}

const languages = locales

/**
 *
 @type {Array<{data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("News setup command")
        // server admin should handle this instead?
        .setDefaultMemberPermissions(PermissionsBitField.Default)
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("add")
            .setDescription("Add an TheJournalino job to this channel")
            .addStringOption(builder => builder
                .setName("topic")
                .setDescription("The topic you want the news for")
                .addChoices(...getTopicDataAsCommandChoices())
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName("language")
                .setDescription("The languages you want to receive the news in")
                .addChoices(...languages)
                .setRequired(true)
            )
        ).addSubcommand(subcommandGroup => subcommandGroup
            .setName("remove")
            .setDescription("Remove an TheJournalino job to this channel")
            .addStringOption(builder => builder
                .setName("topic")
                .setDescription("The topic you want the news for")
                .addChoices({name: "All", value: "all"}, ...getTopicDataAsCommandChoices())
                .setRequired(true)
            )
        ),
    // .setDefaultMemberPermissions(PermissionsBitField.Default),
    async execute(client, interaction) {
        let guild = interaction.guild;
        let subcommand = interaction.options.getSubcommand();
        if (subcommand === "add") {
            let language = interaction.options.get('language');
            let topic = interaction.options.get('topic');
            // check if the bot has permissions to write in the channel.
            let me = interaction.guild.members.me;
            let viewChannelPermission = me.permissionsIn(interaction.channel).has(PermissionFlagsBits.ViewChannel);
            let sendPermission = me.permissionsIn(interaction.channel).has(PermissionFlagsBits.SendMessages);
            if (viewChannelPermission && sendPermission) {
                // add this channel to the news queue!
                await dbAdapter.addNewsGuild(guild, interaction.channel.id, topic.value, language.value)
                await interaction.reply({
                    content: `Aight ${interaction.user.username}, ${Utils.getNameFromTopicValue(topic.value)} news will be here soon!`,
                    ephemeral: false
                });
                LoggerHelper.success(`Feed added:
                Server: ${interaction.guild.name} (${interaction.guild.id}) 
                    Channel: ${interaction.channel.name} (${interaction.channel.id})
                    User: ${interaction.user.username} (${interaction.user.id})
                    Topic: ${Utils.getNameFromTopicValue(topic.value)}
                    language: ${Utils.getNameFromLanguageValue(language.value)}`)
            } else {
                // no permissions in this channel, pls try again.
                await interaction.reply({
                    content: `I have no permissions to send messages in this channel!`,
                    ephemeral: true
                });
            }
        } else if (subcommand === "remove") {
            let topic = interaction.options.get('topic');
            let removed = false;
            let successContent = "You wont receive TheJournalino in this channel anymore.";
            let errorContent = "This channel is not listed for any tipe of TheJournalino";
            if (topic.value !== "all") {
                let codeTopicNameText = `**${Utils.getNameFromTopicValue(topic.value)}**`;
                successContent = `You wont receive TheJournalino about ${codeTopicNameText} in this channel anymore.`;
                errorContent = `I'm sorry but looks like that this channel is not listed for ${codeTopicNameText} news.`;
            }
            removed = await dbAdapter.removeNewsChannel(interaction.channel, topic.value !== 'all' ? topic.value : null);
            if (removed) {
                await interaction.reply({
                    content: successContent,
                    ephemeral: false
                });
            } else {
                await interaction.reply({content: errorContent, ephemeral: true});
            }
        }
    }
}, {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription("HEEEEEEELP"),
    // server admin should handle this instead?
    // .setDefaultMemberPermissions(PermissionsBitField.All),
    // .setDefaultMemberPermissions(PermissionsBitField.Default),
    async execute(client, interaction) {
        // inside a command, event listener, etc.
        const exampleEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setAuthor({
                name: "TheJournalino",
                iconURL: 'https://images.unsplash.com/photo-1566378246598-5b11a0d486cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80',
                url: "https://thejournalino.com/"
            })
            .setTitle("TheJournalino Help!")
            // .setURL(articleMeta.url)
            .setDescription("Are you looking for Gaming leaks? Criminals? Tech news?\nOr anyhing else?\n" +
                "I got you! \nThe only command you need is: \n\n" +
                "**/news**\n\n" +
                "try: \n\n" +
                "/news add Gaming English\n\n" +
                "You will receive news relative to your topic soon after running the command, however it may take up to 3 hours sometimes!\n\n")
            .setThumbnail('https://thejournalino.com/icon_500.png')
            // .addFields(
            //     {name: '/news', value: 'test'},
            //     { name: '\u200B', value: '\u200B' },
            //     { name: 'Inline field title', value: 'Some value here', inline: true },
            //     { name: 'Inline field title', value: 'Some value here', inline: true },
            // )
            // .addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
            // .setImage(articleMeta.imageLink)
            // .setTimestamp()
            .setFooter({text: 'Add me to your server! Help me reach more people <3'/*, iconURL: 'https://i.imgur.com/AfFp7pu.png'*/});

        // exampleEmbed.setAuthor({
        //     name: "cacca",
        //     iconURL: 'https://images.unsplash.com/photo-1566378246598-5b11a0d486cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=774&q=80',
        //     // url: article.source.url
        // })
        await interaction.reply({embeds: [exampleEmbed], ephemeral: false});
    }
}]
export default commands;