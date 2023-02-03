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
/**
 *
 * @return {Date}
 */
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
        // @ts-ignore
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
                    // if there is no topic, delete all topics from this channel.
                    // currentChannel.topics = []
                    // actually... just delete the channel.
                    currentNewsGuild.channels = currentNewsGuild.channels.filter(value => value.id !== currentChannel.id);
                    found = true;
                }
                else {
                    // topic is specific! Delete it only if the channel matches!
                    if (currentChannel.topics) {
                        // does the topic match the channel?
                        // so we keep everything except for the specified topic
                        currentChannel.topics = currentChannel.topics.filter(value => {
                            // if you find the element
                            found = value.topic === topic;
                            // just say that it needs to be removed.
                            return !found;
                        });
                    }
                    if (currentChannel.topics.length === 0) {
                        // in this case there are no topics in this channel, just delete it.
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
        // in this case the channel is missing, add it.
        // we cannot keep the reference of the object to change it, it's simply not linked to the document one anymore after the push.
        // add this new channel to the list,
        // that's important.
        currentNewsGuild.channels.push({
            id: channel.id,
            name: channel.name,
            topics: [newTopic]
        });
    }
    else {
        // in this case the channel list already exists.
        currentChannel.name = channel.name; // make sure to keep this up to date.
        // does the topic already exist in the channel tho?
        // if it does, no need to replace it.
        let found = currentChannel.topics.find(value => value.topic === topic && value.language === language);
        if (!found) {
            // well in this case we should add it.
            // create the new topic, it will be replaced with the old one.
            currentChannel.topics.push(newTopic);
        }
    }
    currentNewsGuild.save();
}
let topicsCache = {};
/**
 * holds current articles for this news batch
 * so each server that has the same combo (topic+language) will receive the same one.
 */
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
/**
 *
 * @param {NewsData}newsData
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
export async function getCurrentArticle(newsData, queryString) {
    LoggerHelper.dev(`Looking for article in cache - ${queryString}`);
    // does the current one exist?
    if (!currentArticlesCache[queryString]) {
        // in this the article is not in the cache yet!
        // let's get it
        LoggerHelper.dev(`Adding article in cache for - ${queryString}`);
        currentArticlesCache[queryString] = await getCachedStackNewsSanitizedArticle(newsData, queryString);
    }
    // then just return it.
    return currentArticlesCache[queryString];
}
/**
 * WARNING, THIS FUNCTION IS QUITE HEAVY SOMETIMES.
 * When looking for the article in the cache stack it verifies it fetching its domain,
 * returns the fetched article only if its "complete" (has enough info for the meta article),
 * if not removes that from the cache and proceeds with the next one.
 * returns the first cached article, null if none is cached for the given querystring.
 * @param {NewsData}newsData
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
async function getCachedStackNewsSanitizedArticle(newsData, queryString) {
    let cachedDataItem = newsDB.data.articles[queryString];
    if (!cachedDataItem) {
        // no item in the cache.
        return null;
    }
    // chatGPT wrote this date check because I just wanted to have some fun :P
    const currentDate = new Date();
    const cachedDate = new Date(cachedDataItem.dateFetched);
    let diff = (currentDate.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 3) {
        LoggerHelper.error(`INVALID CACHE FOR ${queryString}`);
        // in this case 3 days or more have passed, this cache is not valid anymore,
        // we need to wait for somebody to update it.
        return null;
    }
    // if we are here, cache is fine, let's have a look into it.
    // first of all, let's write down that we are actually fetching this
    cachedDataItem.dateFetched = currentDate;
    // then we are going to iterate through the items.
    let newsDBArray = cachedDataItem.items;
    let article = null;
    // while (newsDBArray && newsDBArray.length) {
    //     LoggerHelper.dev(`${newsDBArray.length} currently cached items for ${queryString}`)
    article = newsDBArray.shift();
    article = await findMetaEmbeds(article);
    // if (!article || !article.isComplete()) {
    //     article = null
    // } else {
    //     // in this case we are going out with the article!
    //     break
    // }
    // }
    // this is to make sure that if something goes wrong with this news batch, we got rid of the article
    // so in case the bot crashes, nobody will see it twice.
    await patchNewsData();
    return article;
}
export function cacheRawArticles(queryString, rawArticles) {
    // get only the first 20 elements of the array, as usually the one after them are quite OT
    let items = null;
    if (rawArticles instanceof Array) {
        items = rawArticles.splice(0, 20);
    }
    newsDB.data.articles[queryString] = { dateAdded: new Date(), dateFetched: new Date(), items: items };
}
export function getCurrentTopicQuery(topic) {
    let topicData = topicsData[topic];
    // this should never happen, but do it just in case.
    // if we see the error it means that somebody has found a way to sneak custom topics inside the command,
    // or the topic has just been removed :/
    if (!topicData) {
        LoggerHelper.error(`Topic Error: ${topic} --- This topic does not exist!`);
        topicData = topicsData[DEFAULT_TOPIC];
    }
    // check in the cache!
    if (topicsCache[topic]) {
        // LoggerHelper.info(`Topic cache: ${topicsCache[topic]} found topic in cache`)
        return topicsCache[topic];
    }
    else {
        // well, looks like we need a new one!
        let rndQuery = rndArrayItem(topicData.queries);
        // replace spaces with +
        rndQuery = rndQuery.trim().split(/ +/g).join("+");
        topicsCache[topic] = rndQuery;
        return rndQuery;
    }
}
//# sourceMappingURL=dbAdapter.js.map