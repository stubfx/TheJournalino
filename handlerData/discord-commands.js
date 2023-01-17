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

function getTopicDataAsCommandChoices() {
    let tmp = []
    for (let topicsDataKey in topicsData) {
        tmp.push({name: topicsData[topicsDataKey].name, value: topicsDataKey})
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
            .setDescription("Add an free news job to this channel")
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
            .setDescription("Remove an free news job to this channel")
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
                await interaction.reply({content: `Aight ${interaction.user.username}, ${topicsData[topic.value].name} news will be here soon!`, ephemeral: false});
            } else {
                // no permissions in this channel, pls try again.
                await interaction.reply({content: `I have no permissions to send messages in this channel!`, ephemeral: true});
            }
        } else if (subcommand === "remove") {
            let removed = await dbAdapter.removeNewsChannel(interaction.channel);
            if (removed) {
                await interaction.reply({content: `You wont receive free news in this channel anymore.`, ephemeral: true});
            } else {
                await interaction.reply({content: `This channel is not listed for free news`, ephemeral: true});
            }
        }
    }
}]
export default commands;