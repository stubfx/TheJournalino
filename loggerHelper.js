import {EmbedBuilder} from "discord.js";

let client = null

function getSanitizedSuggestion(data) {
    try {
        return "Suggestion: " + data.replace(/[^a-zA-Z ]/g, "[%]")
    } catch (e) {
        error(e)
        return null
    }
}

export function init(discordClient) {
    client = discordClient
}

export function error(...errors) {
    console.error(errors)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send({embeds: [getLogEmbed(0xED4245, errors)]});
        })
        .catch(console.error);
}

export function consoleError(data) {
    console.error(data)
}

export function success(...data) {
    // clear data in case of template string multiline
    console.info(data)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            // await channel.send(`:green_circle:\`${log.toString()}\``);
            await channel.send({embeds: [getLogEmbed(0x57F287, data)]});
        })
        .catch(console.error);
}

export function suggestion(data, toSanitize) {
    // clear data in case of template string multiline
    let log = data + "\n" + getSanitizedSuggestion(toSanitize)
    console.info(log)
    client.channels.fetch(process.env.discord_log_suggestion_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`:green_circle:\`${log.toString()}\``);
        })
        .catch(console.error);
}

export function info(...data) {
    console.log(data)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            // await channel.send(`\`${data}\``);
            await channel.send({embeds: [getLogEmbed(0x3498DB, data)]});
        })
        .catch(console.error);
}

export function dev(data) {
    console.log(data);
}

/**
 * @param {number}HexColor
 * @param {Array<any>}errors
 * @return {EmbedBuilder}
 */
function getLogEmbed(HexColor, errors) {
    /**
     *
     * @type {string}
     */
    let log = ""
    for (let data of errors) {
        try {
            console.log(data)
            log += (data.toString() + "\n")
        } catch (e) {
            log += `"ERROR" : ${e}`
        }
    }
    console.log(log)
    return new EmbedBuilder()
        .setColor(HexColor)
        .setDescription(log)
}