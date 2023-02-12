import {ChatInputCommandInteraction, Client, PermissionsBitField, SlashCommandBuilder,} from "discord.js";

import locales from '../datamodels/locales.js'
import * as dbAdapter from "../dbAdapter.js";
import {disableGuildPromo} from "../dbAdapter.js";
import topicsData from "../datamodels/topicsData.js";
import * as LoggerHelper from "../loggerHelper.js";
import * as Utils from "../utils.js";
import {broadcastMessage} from "../newsHandler.js";

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

async function addNewsChannelInteraction(interaction) {
    let language = interaction.options.get('language');
    let topic = interaction.options.get('topic');
    // check if the bot has permissions to write in the channel.
    let me = interaction.guild.members.me;
    if (Utils.sendMessagesPermissionsInFetchedChannel(me, interaction.channel)) {
        // add this channel to the news queue!
        await dbAdapter.addNewsChannel(interaction.guild,
            interaction.channel,
            interaction.user,
            topic.value,
            language.value)
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

function onPromoCommandAdd(client, interaction, topic, text) {
    client.guilds.fetch(interaction.guild.id).then(async guild => {
        let invite = await guild.invites.create(interaction.channel.id, {maxAge: 0, reason: "Promo invite"})// invite should last forever.
        let inviteResult = await dbAdapter.addGuildPromoInvite(guild.id, topic, text, invite)
        if (inviteResult) {
            LoggerHelper.promo(`Server: ${interaction.guild.name} (${interaction.guild.id})`,
                `Channel: ${interaction.channel.name} (${interaction.channel.id})`,
                `User: ${interaction.user.username} (${interaction.user.id})`,
                `PROMO: \n${topic}\n${text}\n${invite}`)
            await interaction.reply({
                content: "Wanna boost up your chances to be promoted? vote me on Top.gg!\n https://top.gg/bot/1063214678874009701/vote\n"
                    + `This is what other people will see in their ${Utils.getNameFromTopicValue(topic)} channel (top.gg embed wont be there <3):\n\n${text}\n${invite}`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `You must subscribe to at least a news channel before you can promote this server. Use /news command in any channel!`,
                ephemeral: true
            });
        }
    })
}

async function onPromoCommandRemove(client, interaction) {
    await disableGuildPromo(interaction.guild)
    client.guilds.fetch(interaction.guild.id).then(async () => {
        await interaction.reply({
            content: `Aight, from now on, You wont be able to promote yourself to other servers, but you won't receive any promotion as well.`,
            ephemeral: true
        });
    })
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
        let subcommand = interaction.options.getSubcommand();
        if (subcommand === "add") {
            await addNewsChannelInteraction(interaction);
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
    public: true,
    data: new SlashCommandBuilder()
        .setName('promo')
        .setDescription("Promote your server!")
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("add")
            .setDescription("Promote your server!")
            .addStringOption(builder => builder
                .setName("topic")
                .setDescription("The tag you want to promote your server with.")
                .addChoices(...getTopicDataAsCommandChoices())
                .setMaxLength(256)
                .setRequired(true)
            ).addStringOption(builder => builder
                .setName("text")
                .setDescription("Have fun, use emojis!")
                .setMaxLength(100)
                .setRequired(true)
            )
        ).addSubcommand(subcommandGroup => subcommandGroup
            .setName("disable")
            .setDescription("You wont be able to promote yourself to other servers, but you won't receive any promotion as well.")
        ),
    async execute(client, interaction) {
        let subcommand = interaction.options.getSubcommand();
        if (subcommand === "add") {
            let topic = interaction.options.get('topic').value;
            let text = interaction.options.get('text').value;
            text = Utils.getDiscordSanitizedMessage(text);
            onPromoCommandAdd(client, interaction, topic, text);
        } else {
            await onPromoCommandRemove(client, interaction);
        }
    }
}, {
    public: false,
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription("Find channels in a guild")
        .setDefaultMemberPermissions(PermissionsBitField.Default)
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("newsinfo")
            .setDescription("Get news info for the given guild")
            .addStringOption(builder => builder
                .setName("id")
                .setDescription("The id of the guild you want the info for")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("channels")
            .setDescription("Add an TheJournalino job to this channel")
            .addStringOption(builder => builder
                .setName("id")
                .setDescription("The id of the guild you want the channels for")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommandGroup => subcommandGroup
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
        )
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("broadcast")
            .setDescription("Send a broadcast message to all guilds")
            .addStringOption(builder => builder
                .setName("message")
                .setDescription("message")
                .setRequired(true)
            )
        ),
    async execute(client, interaction) {
        let subcommand = interaction.options.getSubcommand();
        if (subcommand === "newsinfo") {
            let guildId = interaction.options.get('id');
            let guild = await dbAdapter.findGuild(guildId.value)
            await interaction.reply({
                embeds: [LoggerHelper.getLogEmbed(0x1ABC9C, JSON.stringify(guild, null, 4), false)],
                ephemeral: true
            });
        } else if (subcommand === "channels") {
            let guildId = interaction.options.get('id');
            let guild = await client.guilds.fetch(guildId.value)
            let channels = await guild.channels.fetch()
            const list = []
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
        } else if (subcommand === "broadcast") {
            let message = interaction.options.get('message');
            broadcastMessage(message.value).then(() => {
                console.log("Broadcast done.")
            })
            await interaction.reply({content: "I hope you know what you are doing.", ephemeral: true});
        }
    }
}]
export default commands;