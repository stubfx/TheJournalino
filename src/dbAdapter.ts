import {guildsDB, newsDB} from "./lowdb.js";
import topicsData from "./datamodels/topicsData.js";
import * as Utils from "./utils.js";
import {findMetaEmbeds} from "./newsHandler.js";
import * as LoggerHelper from "./loggerHelper.js";
import mongoose from "mongoose";
import {NewsGuild, NewsGuildModelInterface, NewsGuildSchemaInterface} from "./schemas.js";

export async function deleteChannelBrokenChannelProcess(channel) {
    if (process.env.dev) return
    // will be improved later on.
    let currentNewsGuild = await findGuild(channel.guild.id)
    if (currentNewsGuild) {
        // look for the given channel
        let currentChannel = currentNewsGuild.channels.find(ch => ch.id === channel.id)
        currentChannel.error = true
        // done. just save it.
        currentNewsGuild.save()
    }
}

export async function isChannelBroken(guildId, channelId) {
    // will be improved later on.
    let currentNewsGuild = await findGuild(guildId)
    if (currentNewsGuild) {
        // look for the given channel
        let currentChannel = currentNewsGuild.channels.find(ch => ch.id === channelId)
        return currentChannel.error
    }
    return false
}


const DEFAULT_TOPIC = "top";
let mongooseConnection = null

export async function init() {
    mongoose.set('strictQuery', false);
    mongooseConnection = await mongoose.connect(process.env.db_guilds_conn_string, {dbName: process.env.db_guilds_name});
}

/**
 *
 * @return {Date}
 */
export function getLastNewsBatchRunTime() {
    return new Date(guildsDB.data.lastRunAt)
}


export async function updateLastNewsBatchRun() {
    guildsDB.data.lastRunAt = new Date()
    await patchGuildsData()
}

export async function forEachGuild(func: (newsGuild: NewsGuildModelInterface) => Promise<void>) {
    let cursor = await NewsGuild.find().cursor()
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        await func(doc as NewsGuildModelInterface)
    }
}

export async function findGuild(guildId) {
    return NewsGuild.findOne({id: guildId});
}

export async function getSubscribedGuild(guildId) {
    let currentNewsGuild = await findGuild(guildId)
    if (currentNewsGuild && currentNewsGuild.channels && currentNewsGuild.channels.length > 0) {
        return currentNewsGuild
    } else {
        return null
    }
}

export async function addGuildPromoInvite(guildId: string, topic: string, text: string, inviteUrl: string): Promise<Boolean> {
    let subscribedGuild = await getSubscribedGuild(guildId)
    if (subscribedGuild) {
        // ok add the invite then.
        subscribedGuild.promo = {
            enabled: true,
            invite: {
                topic: topic,
                url: inviteUrl,
                text: Utils.getDiscordSanitizedMessage(text)
            }

        }
        await subscribedGuild.save()
        return true
    }
    return false
}

export async function withGuild(guildId: string, func: (newsGuild: NewsGuildSchemaInterface) => Promise<void>) {
    let newsGuild = NewsGuild.findOne({id: guildId});
    if (newsGuild) {
        // @ts-ignore
        await func(newsGuild as NewsGuildSchemaInterface)
    }
}

export async function disableGuildPromo(guild) {
    let currentNewsGuild = await findGuild(guild.id)
    if (!currentNewsGuild) {
        currentNewsGuild = await createNewsGuild(guild)
    }
    if (currentNewsGuild) {
        currentNewsGuild.promo = {enabled: false, invite: null}
        await currentNewsGuild.save()
    }
}

export async function removeNewsChannel(channel, topic = null) {
    let found = false
    let currentNewsGuild = await findGuild(channel.guild.id)
    if (currentNewsGuild) {
        let channels = currentNewsGuild.channels
        if (channels) {
            let currentChannel = currentNewsGuild.channels.find(value => value.id === channel.id);
            if (currentChannel) {
                if (!topic) {
                    // if there is no topic, delete all topics from this channel.
                    // currentChannel.topics = []
                    // actually... just delete the channel.
                    currentNewsGuild.channels = currentNewsGuild.channels.filter(value => value.id !== currentChannel.id)
                    found = true
                } else {
                    // topic is specific! Delete it only if the channel matches!
                    if (currentChannel.topics) {
                        // does the topic match the channel?
                        // so we keep everything except for the specified topic
                        currentChannel.topics = currentChannel.topics.filter(value => {
                            // if you find the element
                            found = value.topic === topic
                            // just say that it needs to be removed.
                            return !found
                        })
                    }
                    if (currentChannel.topics.length === 0) {
                        // in this case there are no topics in this channel, just delete it.
                        currentNewsGuild.channels = currentNewsGuild.channels.filter(value => value.id !== currentChannel.id)
                    }
                }
            }
        }
    }
    if (found) {
        currentNewsGuild.save()
    }
    return found
}

export async function removeGuild(guild) {
    // does not work without await ?
    // mongoose, what have you done?
    await NewsGuild.findOneAndDelete({id: guild.id})
}

async function createNewsGuild(guild) {
    return await NewsGuild.create({
        id: guild.id,
        name: guild.name,
        channels: [],
        date: new Date()
    });
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
    }
    let currentNewsGuild = await findGuild(guild.id)
    if (!currentNewsGuild) {
        currentNewsGuild = await createNewsGuild(guild)
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
            error: false,
            topics: [newTopic]
        })
    } else {
        // in this case the channel list already exists.
        currentChannel.name = channel.name // make sure to keep this up to date.
        // try to remove the error for now.
        currentChannel.error = false
        // does the topic already exist in the channel tho?
        // if it does, no need to replace it.
        let found = currentChannel.topics.find(value => value.topic === topic && value.language === language);
        if (!found) {
            // well in this case we should add it.
            // create the new topic, it will be replaced with the old one.
            currentChannel.topics.push(newTopic)
        }
    }
    currentNewsGuild.save()
}

let invitesCache = {};
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

async function patchGuildsData() {
    await guildsDB.write()
}

async function patchNewsData() {
    await newsDB.write()
}

export async function patchData() {
    await patchGuildsData();
    await patchNewsData();
}

export function clearTopicsCache() {
    topicsCache = {}
}

export function clearInvitesCache() {
    invitesCache = {}
}

export function clearNewsCache() {
    newsDB.data.articles = {}
}

export function clearCurrentArticlesCache() {
    currentArticlesCache = {}
}

export function addExpensiveQuery(queryString: String) {
    if (!newsDB.data.expensiveQueries) {
        newsDB.data.expensiveQueries = []
    }
    newsDB.data.expensiveQueries.push(queryString)
}

export function isQueryTooExpensive(queryString) {
    if (!newsDB.data.expensiveQueries) {
        newsDB.data.expensiveQueries = []
    }
    return newsDB.data.expensiveQueries.includes(queryString)
}

/**
 *
 * @param {NewsData}newsData
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
export async function getCurrentArticle(newsData, queryString) {
    LoggerHelper.dev(`Looking for article in cache - ${queryString}`)
    // does the current one exist?
    if (!currentArticlesCache[queryString]) {
        // in this the article is not in the cache yet!
        // let's get it
        LoggerHelper.dev(`Adding current article in cache for - ${queryString}`)
        currentArticlesCache[queryString] = await getCachedStackNewsSanitizedArticle(newsData, queryString)
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
 * @param {NewsData}newsData
 * @param queryString
 * @return {Promise<ArticleMetadata|null>}
 */
async function getCachedStackNewsSanitizedArticle(newsData, queryString) {
    let cachedDataItem = newsDB.data.articles[queryString];
    if (!cachedDataItem) {
        // no item in the cache.
        return null
    }
    // chatGPT wrote this date check because I just wanted to have some fun :P
    const currentDate = new Date()
    const cachedDate = new Date(cachedDataItem.dateFetched)
    let diff = (currentDate.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff >= 3) {
        LoggerHelper.dev(`INVALID CACHE FOR ${queryString}`)
        // in this case 3 days or more have passed, this cache is not valid anymore,
        // we need to wait for somebody to update it.
        return null
    }
    // if we are here, cache is fine, let's have a look into it.
    // first of all, let's write down that we are actually fetching this
    cachedDataItem.dateFetched = currentDate
    // then we are going to iterate through the items.
    let newsDBArray = cachedDataItem.items;
    let article = null
    if (newsDBArray) {
        while (newsDBArray && newsDBArray.length) {
            LoggerHelper.dev(`${newsDBArray.length} currently cached items for ${queryString}`)
            article = newsDBArray.shift();
            article = await findMetaEmbeds(newsData, article)
            if (!article || !article.isComplete()) {
                article = null
            } else {
                // in this case we are going out with the article!
                break
            }
        }
    }
    // this is to make sure that if something goes wrong with this news batch, we got rid of the article
    // so in case the bot crashes, nobody will see it twice.
    await patchNewsData()
    return article
}

export function cacheRawArticles(queryString, rawArticles) {
    // get only the first 20 elements of the array, as usually the one after them are quite OT
    let items = null
    if (rawArticles instanceof Array) {
        items = rawArticles.splice(0, 20)
    }
    newsDB.data.articles[queryString] = {dateAdded: new Date(), dateFetched: new Date(), items: items}
}

export function getCurrentTopicQuery(topic) {
    let topicData = topicsData[topic];
    // this should never happen, but do it just in case.
    // if we see the error it means that somebody has found a way to sneak custom topics inside the command,
    // or the topic has just been removed :/
    if (!topicData) {
        LoggerHelper.error(`Topic Error: ${topic} --- This topic does not exist!`)
        topicData = topicsData[DEFAULT_TOPIC]
    }
    // check in the cache!
    if (topicsCache[topic]) {
        // LoggerHelper.info(`Topic cache: ${topicsCache[topic]} found topic in cache`)
        return topicsCache[topic]
    } else {
        // well, looks like we need a new one!
        let rndQuery = Utils.rndArrayItem(topicData.queries);
        // replace spaces with +
        rndQuery = rndQuery.trim().split(/ +/g).join("+")
        topicsCache[topic] = rndQuery
        return rndQuery
    }
}

export async function getRandomPromoInviteExceptThis(guildId: string, topic: string) {
    try {
        // check in cache first.
        let currentInvite = invitesCache[topic];
        if (currentInvite && currentInvite.guildId !== guildId) {
            // we already got a cached one apparently,
            // just use it.
            return currentInvite
        }
        let found = await NewsGuild.aggregate([
            {$match: {id: {$ne: guildId}, "promo.enabled": true, "promo.invite.url": {$exists: true}, "promo.invite.topic": topic}},
            {$sample: {"size": 1}}]
        )
        if (found && found.length > 0) {
            let foundGuild = found[0];
            let result = foundGuild.promo.invite
            // save it in cache by topic
            let invite = {
                guildName: foundGuild.name,
                guildId: guildId,
                topic: result.topic,
                url: result.url,
                text: result.text
            };
            invitesCache[topic] = invite
            return invite
        }
        return null
    } catch (e) {
        LoggerHelper.error("Error fetching invite")
        LoggerHelper.error(e)
    }
}