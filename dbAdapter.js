import {guildsDB, newsDB} from "./lowdb.js";
import topicsData from "./datamodels/topicsData.js";
import {rndArrayItem} from "./utils.js";
import {findMetaEmbeds} from "./newsHandler.js";

/**
 * @typedef NewsTopic
 * @property {string}name gaming
 * @property {string}language en
 */

/**
 * @typedef NewsData
 * @property {string}topic
 * @property {string}channelId
 * @property {string}language
 * @property {number}hourInterval
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
 * @typedef RawGoogleArticle
 */

export function getAllGuilds() {
    return guildsDB.data.guilds
}

export async function removeNewsChannel(channel) {
    let found = false
    let newsGuilds = guildsDB.data.guilds
    let currentNewsGuild = newsGuilds[channel.guild.id];
    if (currentNewsGuild) {
        for (let topicsKey in currentNewsGuild.topics) {
            let topic = currentNewsGuild.topics[topicsKey]
            if (topic.channelId === channel.id) {
                delete currentNewsGuild.topics[topicsKey]
                found = true
            }
        }
        delete currentNewsGuild.topics[channel.id]
    }
    await patchData()
    return found
}

export async function removeGuild(guild) {
    delete guildsDB.data.guilds[guild.id]
    await patchData()
}

export async function addNewsGuild(guild, channelId, topic, language) {
    let newsGuilds = guildsDB.data.guilds
    let currentNewsGuild = newsGuilds[guild.id]
    if (!currentNewsGuild) {
        currentNewsGuild = {name: guild.name, topics: {}}
        newsGuilds[guild.id] = currentNewsGuild
    }
    let currentTopic = currentNewsGuild.topics[topic]
    if (!currentTopic) {
        currentTopic = {}
        currentNewsGuild.topics[topic] = currentTopic
    }
    // in this case this topic does not exist yet
    currentNewsGuild.topics[topic] = {channelId: channelId, language: language}
    await patchData()
}

let topicsCache = {};
/**
 * holds current articles for this news batch
 * so each server that has the same combo (topic+language) will receive the same one.
 */
let currentArticlesCache = {}

export function prepareForNewBatch() {
    clearTopicsCache()
    clearCurrentArticlesCache()
}

export async function patchData() {
    await guildsDB.write()
    await newsDB.write()
}

export function clearTopicsCache() {
    topicsCache = {}
}

export function clearNewsCache() {
    newsDB.data.articles = {}
}

export function clearCurrentArticlesCache() {
    currentArticlesCache = {}
}

export function addExpensiveQuery(queryString) {
    if (!guildsDB.data.expensiveQueries) {
        guildsDB.data.expensiveQueries = []
    }
    guildsDB.data.expensiveQueries.push(queryString)
}

export function isQueryTooExpensive(queryString) {
    if (!guildsDB.data.expensiveQueries) {
        guildsDB.data.expensiveQueries = []
    }
    return guildsDB.data.expensiveQueries.includes(queryString)
}

/**
 *
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
export async function getCurrentArticle(queryString) {
    // does the current one exist?
    if (!currentArticlesCache[queryString]) {
        // in this the article is not in the cache yet!
        // let's get it
        currentArticlesCache[queryString] = await getCachedStackNewsSanitizedArticle(queryString)
    }
    // then just return it.
    return currentArticlesCache[queryString]
}

/**
 * WARNING, THIS FUNCTION IS QUITE HEAVY SOMETIMES.
 * When looking for the article in the cache stack it verifies it fetching its domain,
 * returns the fetched article only if its "complete" (has enough info for the meta article),
 * if not removes that from the cache and proceeds with the next one.
 * returns the first cached article, null if none is cached for the given querystring.
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
async function getCachedStackNewsSanitizedArticle(queryString) {
    /**
     * @type Array<RawGoogleArticle>
     */
    let newsDBArray = newsDB.data.articles[queryString];
    let article = undefined
    while (newsDBArray && newsDBArray.length) {
        console.log(`${newsDBArray.length} currently cached items for ${queryString}`)
        article = newsDBArray.shift();
        article = await findMetaEmbeds(article)
        if (article && article.isComplete()) {
            return article
        }
    }
    // in this case no complete article has been found :/
    return null
}

/**
 *
 * @param {string}queryString
 * @param {Array<RawGoogleArticle>}rawArticles
 */
export function cacheRawArticles(queryString, rawArticles) {
    newsDB.data.articles[queryString] = rawArticles
}

export function getCurrentTopicQuery(topic) {
    let topicData = topicsData[topic];
    // this should never happen, but do it just in case.
    // if we see the error it means that somebody has found a way to sneak custom topics inside the command,
    // or the topic has just been removed :/
    if (!topicData) {
        console.error(`Topic Error: ${topic} --- This topic does not exist!`)
        topicData = topicsData['top']
    }
    // check in the cache!
    if (topicsCache[topic]) {
        // console.log(`Topic cache: ${topicsCache[topic]} found topic in cache`)
        return topicsCache[topic]
    } else {
        // well, looks like we need a new one!
        let rndQuery = rndArrayItem(topicData.queries);
        topicsCache[topic] = rndQuery
        return rndQuery
    }
}