import {Client, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ChatInputCommandInteraction} from "discord.js";

/**
 *
 @type {Array<{data: SlashCommandBuilder, execute(Client, ChatInputCommandInteraction): Promise<void>}>}
 */
const commands = [{
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription("Toggle news permission")
        .setDefaultMemberPermissions(0),
    async execute(client, interaction) {
        const noNewsRole = "1050057029210878002"
        const member = interaction.member;
        await member.guild.roles.fetch()
        if (!member.roles.cache.has(noNewsRole)) {
            member.roles.add(noNewsRole)
            await interaction.reply('Aigth, no sexy news for you anymore!');
        } else {
            member.roles.remove(noNewsRole)
            await interaction.reply('Enjoy some news!');
        }
    }
}, {
    data: new SlashCommandBuilder()
        .setName('nukeserver')
        .setDescription("Don't do it pls."),
    async execute(client, interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nukeserver_cta_1')
                    .setLabel('Yes, I still want to nuke the server.')
                    .setStyle(ButtonStyle.Danger)
                    // .setDisabled(true)
            );

        await interaction.reply({content: 'Going to nuke the server in 1 day. Are you sure?', components: [row], ephemeral: true},);
    }
}]
export default commands;