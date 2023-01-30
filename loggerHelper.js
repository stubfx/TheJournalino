import {EmbedBuilder} from "discord.js";

let client = null

/**
 *
 * @param logArray
 * @return {Array<any>}
 */
function getSanitizedLog(logArray) {
    /**
     *
     * @type {Array<string>}
     */
    let log = []
    for (let data of logArray) {
        try {
            log.push(data.toString().replace(/[^a-zA-Z0-9: ()?!]/g, "[%]"))
        } catch (e) {
            log.push(`"SANITIZE ERROR" : ${e}`)
        }
    }
    return log
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

export function suggestion(...data) {
    let log = getSanitizedLog(data)
    console.info(log)
    client.channels.fetch(process.env.discord_log_suggestion_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            // await channel.send(`:green_circle:\`${log.toString()}\``);
            await channel.send({embeds: [getLogEmbed(0x57F287, log)]});
        })
        .catch(console.error);
}

export function channelUpdate(...data) {
    let log = getSanitizedLog(data)
    console.info(log)
    client.channels.fetch(process.env.discord_log_channelUpdate_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            // await channel.send(`:green_circle:\`${log.toString()}\``);
            await channel.send({embeds: [getLogEmbed(0x57F287, log)]});
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
export function getLogEmbed(HexColor, errors) {
    /**
     *
     * @type {string}
     */
    let log = ""
    for (let data of errors) {
        try {
            log += (data.toString() + "\n")
        } catch (e) {
            log += `"ERROR" : ${e}`
        }
    }
    return new EmbedBuilder()
        .setColor(HexColor)
        .setDescription(log)
}