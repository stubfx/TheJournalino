import {
    ChatInputCommandInteraction,
    Client,
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

async function addNewsChannelInteraction(interaction, guild) {
    let language = interaction.options.get('language');
    let topic = interaction.options.get('topic');
    // check if the bot has permissions to write in the channel.
    let me = interaction.guild.members.me;
    let viewChannelPermission = me.permissionsIn(interaction.channel).has(PermissionFlagsBits.ViewChannel);
    let sendPermission = me.permissionsIn(interaction.channel).has(PermissionFlagsBits.SendMessages);
    if (viewChannelPermission && sendPermission) {
        // add this channel to the news queue!
        await dbAdapter.addNewsChannel(guild,
            interaction.channel.id,
            interaction.channel.name,
            topic.value,
            language.value,
            interaction.user.id,
            interaction.user.username)
        await interaction.reply({
            content: `Aight ${interaction.user.username}, ${Utils.getNameFromTopicValue(topic.value)} news will be here soon!`,
            ephemeral: false
        });
        LoggerHelper.success(`Feed added:`,
            `Server: ${interaction.guild.name} (${interaction.guild.id}) `,
            `Channel: ${interaction.channel.name} (${interaction.channel.id})`,
            `User: ${interaction.user.username} (${interaction.user.id})`,
            `Topic: ${Utils.getNameFromTopicValue(topic.value)}`,
            `language: ${Utils.getNameFromLanguageValue(language.value)}`)
    } else {
        // no permissions in this channel, pls try again.
        await interaction.reply({
            content: `I have no permissions to send messages in this channel!`,
            ephemeral: true
        });
    }
}

async function removeNewsChannelInteraction(interaction) {
    let topic = interaction.options.get('topic');
    let removed;
    let successContent = "You wont receive news in this channel anymore.";
    let errorContent = "This channel is not listed for any tipe of TheJournalino";
    if (topic.value !== "all") {
        let codeTopicNameText = `**${Utils.getNameFromTopicValue(topic.value)}**`;
        successContent = `You wont receive news about ${codeTopicNameText} in this channel anymore.`;
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

/**
 *
 @type {Array<{public: boolean, data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    public: true,
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
            await addNewsChannelInteraction(interaction, guild);
        } else if (subcommand === "remove") {
            await removeNewsChannelInteraction(interaction);
        }
    }
}, {
    public: true,
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription("HEEEEEEELP"),
    // server admin should handle this instead?
    // .setDefaultMemberPermissions(PermissionsBitField.All),
    // .setDefaultMemberPermissions(PermissionsBitField.Default),
    async execute(client, interaction) {
        // inside a command, event listener, etc.
        await interaction.reply({
            content: "Here you can find some help " +
                "(assuming that i remember to keep it up to date)\nhttps://thejournalino.com/help", ephemeral: false
        });
    }
}, {
    public: true,
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription("Send me a suggestion to improve myself!")
        .addStringOption(builder => builder
            .setName("suggestion")
            .setDescription("Your suggestion, I guess?")
            .setMaxLength(256)
            .setRequired(true)
        ),
    async execute(client, interaction) {
        // inside a command, event listener, etc.
        LoggerHelper.suggestion(`Server: ${interaction.guild.name} (${interaction.guild.id})`,
            `Channel: ${interaction.channel.name} (${interaction.channel.id})`,
            `User: ${interaction.user.username} (${interaction.user.id})`,
            `Suggestion: ${interaction.options.get('suggestion').value}`)
        await interaction.reply({content: "Got it, thanks!", ephemeral: true});
    }
}, {
    public: false,
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription("Find channels in a guild")
        .setDefaultMemberPermissions(PermissionsBitField.Default)
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("channels")
            .setDescription("Add an TheJournalino job to this channel")
            .addStringOption(builder => builder
                .setName("id")
                .setDescription("The id of the guild you want the channels for")
                .setRequired(true)
            )
        ).addSubcommand(subcommandGroup => subcommandGroup
            .setName("send")
            .setDescription("Send text message to a specific channel")
            .addStringOption(builder => builder
                .setName("channel")
                .setDescription("Id of the channel")
                .setRequired(true)
            )
            .addStringOption(builder => builder
                .setName("string")
                .setDescription("What to send")
                .setRequired(true)
            )
        ),
    async execute(client, interaction) {
        let subcommand = interaction.options.getSubcommand();
        if (subcommand === "channels") {
            let guildId = interaction.options.get('id');
            let guild = await client.guilds.fetch(guildId.value)
            let channels = await guild.channels.fetch()
            const list = []
            // console.log(channels)
            channels.forEach(channel => {
                list.push(`#${channel.name}(${channel.id}) - ${channel.type}`)
            })
            await interaction.reply({embeds: [LoggerHelper.getLogEmbed(0x1ABC9C, list)], ephemeral: true});
        } else if (subcommand === "send") {
            let channelId = interaction.options.get('channel');
            let stringToSend = interaction.options.get('string');
            client.channels.fetch(channelId.value)
                .then(async channel => {
                    await channel.send(stringToSend.value);
                }).catch(LoggerHelper.error);
            await interaction.reply({content: "Done!", ephemeral: true});
        }
    }
}]
export default commands;