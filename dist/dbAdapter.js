import { guildsDB, newsDB } from "./lowdb.js";
import topicsData from "./datamodels/topicsData.js";
import { rndArrayItem } from "./utils.js";
import { findMetaEmbeds } from "./newsHandler.js";
import * as LoggerHelper from "./loggerHelper.js";
import mongoose from "mongoose";
import { NewsGuild, NewsGuildSchema } from "./schemas.js";
const DEFAULT_TOPIC = "top";
let mongooseConnection = null;
export async function migrateToMongo() {
    const NewsGuild = mongoose.model('newsGuild', NewsGuildSchema);
    let toSend = [];
    let allGuilds = getAllGuilds();
    for (let allGuildsKey in allGuilds) {
        let currentGuild = allGuilds[allGuildsKey];
        let channels = currentGuild.channels;
        let channelsToSend = [];
        for (let channelsKey in channels) {
            let currentChannel = channels[channelsKey];
            currentChannel.id = channelsKey;
            currentChannel.name = null;
            channelsToSend.push(currentChannel);
            currentChannel.topics.forEach(value => {
                value.date = new Date();
            });
        }
        toSend.push(new NewsGuild({
            id: allGuildsKey,
            name: currentGuild.name,
            channels: channelsToSend,
            date: new Date()
        }));
    }
    await NewsGuild.bulkSave(toSend);
    console.log("DONE.");
}
export async function init() {
    mongoose.set('strictQuery', false);
    mongooseConnection = await mongoose.connect(process.env.db_guilds_conn_string, { dbName: process.env.db_guilds_name });
}
function getAllGuilds() {
    return guildsDB.data.guilds;
}
export function getLastNewsBatchRunTime() {
    return new Date(guildsDB.data.lastRunAt);
}
export async function updateLastNewsBatchRun() {
    guildsDB.data.lastRunAt = new Date();
    await patchGuildsData();
}
export async function forEachGuild(func) {
    let cursor = await NewsGuild.find().cursor();
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        await func(doc);
    }
}
export async function findGuild(guildId) {
    return NewsGuild.findOne({ id: guildId });
}
export async function removeNewsChannel(channel, topic = null) {
    let found = false;
    let currentNewsGuild = await findGuild(channel.guild.id);
    if (currentNewsGuild) {
        let channels = currentNewsGuild.channels;
        if (channels) {
            let currentChannel = currentNewsGuild.channels.find(value => value.id === channel.id);
            if (currentChannel) {
                if (!topic) {
                    currentNewsGuild.channels = currentNewsGuild.channels.filter(value => value.id !== currentChannel.id);
                    found = true;
                }
                else {
                    if (currentChannel.topics) {
                        currentChannel.topics = currentChannel.topics.filter(value => {
                            found = value.topic === topic;
                            return !found;
                        });
                    }
                    if (currentChannel.topics.length === 0) {
                        currentNewsGuild.channels = currentNewsGuild.channels.filter(value => value.id !== currentChannel.id);
                    }
                }
            }
        }
    }
    currentNewsGuild.save();
    return found;
}
export async function removeGuild(guild) {
    NewsGuild.deleteOne({ id: guild.id });
}
export async function addNewsChannel(guild, channel, user, topic, language) {
    let newTopic = {
        topic: topic,
        language: language,
        date: new Date(),
        user: {
            id: user.id,
            name: user.username
        }
    };
    let currentNewsGuild = await findGuild(guild.id);
    if (!currentNewsGuild) {
        currentNewsGuild = await NewsGuild.create({
            id: guild.id,
            name: guild.name,
            channels: [],
            date: new Date()
        });
    }
    let currentChannel = currentNewsGuild.channels.find(value => value.id === channel.id);
    if (!currentChannel) {
        currentNewsGuild.channels.push({
            id: channel.id,
            name: channel.name,
            topics: [newTopic]
        });
    }
    else {
        currentChannel.name = channel.name;
        let found = currentChannel.topics.find(value => value.topic === topic && value.language === language);
        if (!found) {
            currentChannel.topics.push(newTopic);
        }
    }
    currentNewsGuild.save();
}
let topicsCache = {};
let currentArticlesCache = {};
export function prepareForNewBatch() {
    clearTopicsCache();
    clearCurrentArticlesCache();
}
async function patchGuildsData() {
    await guildsDB.write();
}
async function patchNewsData() {
    await newsDB.write();
}
export async function patchData() {
    await patchGuildsData();
    await patchNewsData();
}
export function clearTopicsCache() {
    topicsCache = {};
}
export function clearNewsCache() {
    newsDB.data.articles = {};
}
export function clearCurrentArticlesCache() {
    currentArticlesCache = {};
}
export function addExpensiveQuery(queryString) {
    if (!newsDB.data.expensiveQueries) {
        newsDB.data.expensiveQueries = [];
    }
    newsDB.data.expensiveQueries.push(queryString);
}
export function isQueryTooExpensive(queryString) {
    if (!newsDB.data.expensiveQueries) {
        newsDB.data.expensiveQueries = [];
    }
    return newsDB.data.expensiveQueries.includes(queryString);
}
export async function getCurrentArticle(newsData, queryString) {
    LoggerHelper.dev(`Looking for article in cache - ${queryString}`);
    if (!currentArticlesCache[queryString]) {
        LoggerHelper.dev(`Adding article in cache for - ${queryString}`);
        currentArticlesCache[queryString] = await getCachedStackNewsSanitizedArticle(newsData, queryString);
    }
    return currentArticlesCache[queryString];
}
async function getCachedStackNewsSanitizedArticle(newsData, queryString) {
    let cachedDataItem = newsDB.data.articles[queryString];
    if (!cachedDataItem) {
        return null;
    }
    const currentDate = new Date();
    const cachedDate = new Date(cachedDataItem.dateFetched);
    let diff = (currentDate.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 3) {
        LoggerHelper.error(`INVALID CACHE FOR ${queryString}`);
        return null;
    }
    cachedDataItem.dateFetched = currentDate;
    let newsDBArray = cachedDataItem.items;
    let article = null;
    while (newsDBArray && newsDBArray.length) {
        LoggerHelper.dev(`${newsDBArray.length} currently cached items for ${queryString}`);
        article = newsDBArray.shift();
        article = await findMetaEmbeds(article);
        if (!article || !article.isComplete()) {
            article = null;
        }
        else {
            break;
        }
    }
    await patchNewsData();
    return article;
}
export function cacheRawArticles(queryString, rawArticles) {
    let items = null;
    if (rawArticles instanceof Array) {
        items = rawArticles.splice(0, 20);
    }
    newsDB.data.articles[queryString] = { dateAdded: new Date(), dateFetched: new Date(), items: items };
}
export function getCurrentTopicQuery(topic) {
    let topicData = topicsData[topic];
    if (!topicData) {
        LoggerHelper.error(`Topic Error: ${topic} --- This topic does not exist!`);
        topicData = topicsData[DEFAULT_TOPIC];
    }
    if (topicsCache[topic]) {
        return topicsCache[topic];
    }
    else {
        let rndQuery = rndArrayItem(topicData.queries);
        rndQuery = rndQuery.trim().split(/ +/g).join("+");
        topicsCache[topic] = rndQuery;
        return rndQuery;
    }
}
//# sourceMappingURL=dbAdapter.js.map