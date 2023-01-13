import guildsDB from "./lowdb.js";
import topicsData from "../datamodels/topicsData.js";
import {rndArrayItem} from "../utils.js";

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

export function getAllGuilds() {
    return guildsDB.data
}

export async function removeNewsChannel(channel) {
    let found = false
    let newsGuilds = guildsDB.data
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
    await guildsDB.write()
    return found
}

export async function removeGuild(guild) {
    delete guildsDB.data[guild.id]
    await guildsDB.write()
}

export async function addNewsGuild(guild, channelId, topic, language) {
    let newsGuilds = guildsDB.data
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
    await guildsDB.write()
}

let newsDB = {};
export function getCachedNewsArticle(queryString) {
    return newsDB[queryString]
}

export function clearNewsArticleCache() {
    newsDB = {}
}

export function cacheNewsArticle(queryString, article) {
    newsDB[queryString] = article
}

export function getRndTopicQuery(topic) {
    let topicData = topicsData[topic];
    if (!topicData) {
        topicData = topicsData['top']
    }
    return rndArrayItem(topicData)
}