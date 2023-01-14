import {
    Client,
    SlashCommandBuilder,
    ChatInputCommandInteraction, PermissionsBitField,
} from "discord.js";

import locales from '../datamodels/locales.js'
import * as dbAdapter from "../db/dbAdapter.js";

const languages = locales

/**
 *
 @type {Array<{data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("News setup command")
        .setDefaultMemberPermissions(PermissionsBitField.Default)
        .addSubcommand(subcommandGroup => subcommandGroup
            .setName("add")
            .setDescription("Add an free news job to this channel")
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
            // add this channel to the news queue!
            await dbAdapter.addNewsGuild(guild, interaction.channel.id, topic.value, language.value)
            await interaction.reply({content: `News will be here soon!`, ephemeral: true});
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