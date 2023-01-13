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
 * @property {string : newsTopic}topics
 */

/**
 *
 * @type {Array<NewsData>}
 */
// const newsGuilds = []
// {
//     name: "Gaming",
//     channelID: "760191387433304086",
//     queries: [
//         "SeaOfThieves",
//         "Overwatch+2",
//         "Rainbow+six+siege",
//         "Valve+Steam+games",
//         "Warzone+2"
//     ],
//     hourOfDay: [10, 15, 20]
// },
// {
//     name: "Tech",
//     channelID: "1050107246509572228",
//     queries: [
//         "tech+news",
//         "Intel+chip",
//         "AMD+chip",
//         "Nvidia+GPU",
//         "Nvidia+AI"
//     ],
//     hourOfDay: [10, 15, 20]
// },
// {
//     name: "Stocks",
//     channelID: "1050107294437883966",
//     queries: [
//         "Google+Market+Stocks",
//         "Intel+Market+Stocks",
//         "AMD+chip+Market+Stocks",
//         "Nvidia+Market+Stocks",
//         "Nvidia+Market+Stocks"
//     ],
//     hourOfDay: [10, 20]
// },
// {
//     name: "TopNews",
//     channelID: "1050314737923149894",
//     queries: [
//         "top+news"
//     ],
//     hourOfDay: [9, 14]
// }
// export default newsGuilds;

/**
 *
 * @return {Array<NewsData>}
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

export function removeNewsChannel(channel) {
    let newsGuilds = db.data.guilds
    let currentNewsGuild = newsGuilds.find(value => value.guildId === channel.guild.id);
    if (currentNewsGuild) {
        delete currentNewsGuild.topics[channel.id]
    }
}