import db from '../../lowdb.js'

/**
 * @typedef NewsTopic
 * @property {string}name gaming
 * @property {string}language en
 * @property {number}hourInterval 2 = every 2 hours
 */

/**
 * @typedef NewsData
 * @property {string}name
 * @property {string}channelID
 * @property {Array<String>}queries
 * @property {Array<number>}hourOfDay
 */

/**
 * @typedef NewsGuild
 * @property {string}name gaming
 * @property {string}language en
 * @property {number}hourInterval 2 = every 2 hours
 */

/**
 * @typedef NewsGuildTopic
 * @property {string}guildId
 * @property {string : NewsTopic}topics
 */

/**
 *
 * @return {Array<NewsGuild>}
 */
export function allGuilds() {
    return db.data.guilds
}

export async function addNewsGuild(guild, channelId, topic, language) {
    let newsGuilds = db.data.guilds
    let currentNewsGuild = newsGuilds[guild.id]
    if (!currentNewsGuild) {
        currentNewsGuild = {topics: {}}
        newsGuilds[guild.id] = currentNewsGuild
    }
    let currentTopic = currentNewsGuild.topics[topic]
    if (!currentTopic) {
        currentTopic = {}
        currentNewsGuild.topics[topic] = currentTopic
    }
    // in this case this topic does not exist yet
    currentNewsGuild.topics[topic] = {channelId: channelId, hourInterval: 1, language: language}
    await db.write()
}

export async function removeNewsChannel(channel) {
    let newsGuilds = db.data.guilds
    let currentNewsGuild = newsGuilds[channel.guild.id];
    if (currentNewsGuild) {
        for (let topicsKey in currentNewsGuild.topics) {
            let topic = currentNewsGuild.topics[topicsKey]
            if (topic.channelId === channel.id) {
                delete currentNewsGuild.topics[topicsKey]
            }
        }
        delete currentNewsGuild.topics[channel.id]
    }
    await db.write()
}