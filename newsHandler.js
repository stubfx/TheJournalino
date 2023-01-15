import fetch from "node-fetch";
import * as cheerio from "cheerio";
import xmlParser from "xml2json";
import {EmbedBuilder} from "discord.js";
import * as dbAdapter from "./db/dbAdapter.js";

let client = null

class ArticleMetadata {
    constructor(url, title, description, imageLink, author) {
        // noinspection JSUnusedGlobalSymbols
        this.googleRSSFEED = null
        this.url = url
        this.title = title
        this.description = description
        this.imageLink = imageLink
        this.author = author
    }

    isComplete() {
        return !!(this.url && this.title && this.description && this.imageLink)
    }
}

/**
 *
 * @param {NewsData}newsData
 * @return {string}
 */
function getGoogleNewsFeedUrl(newsData) {
    const prefix = "https://news.google.com/rss/search?q=";
    // const postfix = '&hl=en-US&gl=US&ceid=US:en'
    const postfix = `&hl=${newsData.language}`
    let feedUrl = prefix + dbAdapter.getCurrentTopicQuery(newsData.topic) + postfix;
    console.log(`GENERATED RSS FEED: ${feedUrl}`);
    return feedUrl
}

/**
 *
 * @param {RawGoogleArticle}rawGoogleArticle
 * @return {Promise<ArticleMetadata>}
 */
export async function findMetaEmbeds(rawGoogleArticle) {
    return new Promise(async resolve => {
        // gets the link from the Google article
        let url = rawGoogleArticle.description.match(/(?<=href=['"])[^'"]*/g)[0]
        await fetch(url)
            .then(result => result.text())
            .then(html => {
                // console.log(html);
                const $ = cheerio.load(html);
                let title = $('meta[property="og:title"]').attr('content')
                let description = $('meta[property="og:description"]').attr('content')
                let imageLink = $('meta[property="og:image"]').attr('content')
                resolve(new ArticleMetadata(url, title, description, imageLink, rawGoogleArticle.source['$t']))
            }).catch(error => {
                console.log(error);
            })
    })
}

let tooExpensiveToLookFor = []

async function sendArticleFromCache(googleNewsFeedUrl, newsData) {
    // look for the article in the cache if possible
    let cachedNewsArticle = await dbAdapter.getCurrentArticle(googleNewsFeedUrl);
    if (cachedNewsArticle) {
        // if there is an article, just send it :P
        sendNews(newsData.channelId, cachedNewsArticle)
        return true
    }
    return false
}

/**
 *
 * @param {NewsData}newsData
 */
function fetchGoogleNews(newsData) {
    return new Promise(async resolve => {
        // get the url first
        const googleNewsFeedUrl = getGoogleNewsFeedUrl(newsData);
        if (tooExpensiveToLookFor.includes(googleNewsFeedUrl)) {
            // hell nay.
            console.log(`Not looking for ${googleNewsFeedUrl}`)
            resolve()
            return
        }
        // look for the article in the cache if possible
        if (await sendArticleFromCache(googleNewsFeedUrl, newsData)) {
            resolve()
            return
        }
        // otherwise we'll need to go through the painful Google process :P
        fetch(googleNewsFeedUrl)
            .then(value => value.text())
            .then(value => JSON.parse(xmlParser.toJson(value, null))['rss']['channel']['item'])
            .then(
                /**
                 *
                 * @param {Array<RawGoogleArticle>}news
                 */
                async news => {
                    // if this array is not worth fetching for...
                    if (!news || news.length < 5) {
                        // then im sry my little friend.
                        tooExpensiveToLookFor.push(googleNewsFeedUrl)
                        console.log(`Adding ${googleNewsFeedUrl} to the expensive list`)
                        resolve()
                        return
                    }
                    // we don't wanna fetch them here as we may not need them (if the cache expires for example)
                    // save articles to cache.
                    dbAdapter.cacheRawArticles(googleNewsFeedUrl, news)
                    // await fetchGoogleNews(newsData)
                    await sendArticleFromCache(googleNewsFeedUrl, newsData, resolve);
                    resolve()
                }).catch(reason => {
            console.error(reason)
        });
    })
}

export function startNewsHandler(discordClient) {
    client = discordClient

    setInterval(async () => {
        console.log('--------------------- NEWS BATCH ---------------------')
        let allGuilds = dbAdapter.getAllGuilds();
        // reset cache for the next news cycle.
        dbAdapter.prepareForNewBatch();
        for (let allGuildsKey in allGuilds) {
            let currentGuild = allGuilds[allGuildsKey]
            console.log(`---- ${currentGuild.name} ----`)
            for (let topicsKey in currentGuild.topics) {
                let topic = currentGuild.topics[topicsKey];
                await fetchGoogleNews({
                    topic: topicsKey,
                    language: topic.language,
                    hourInterval: 1,
                    channelId: topic.channelId
                })
            }
        }
    // }, 10000)// run once every 10 seconds
    }, 3 * 60 * 60 * 1000)// run once every 3 hour
}


// {
//     title: 'I/ITSEC NEWS: Gaming Provides Opportunities, Skills For Military Metaverse - National Defense Magazine',
//         pubDate: 'Wed, 30 Nov 2022 22:45:56 GMT',
//     description: '<a href="https://news.google.com/__i/rss/rd/articles/CBMid2h0dHBzOi8vd3d3Lm5hdGlvbmFsZGVmZW5zZW1hZ2F6aW5lLm9yZy9hcnRpY2xlcy8yMDIyLzExLzMwL2dhbWluZy1wcm92aWRlcy1vcHBvcnR1bml0aWVzLXNraWxscy1mb3ItbWlsaXRhcnktbWV0YXZlcnNl0gEA?oc=5" target="_blank">I/ITSEC NEWS: Gaming Provides Opportunities, Skills For Military Metaverse</a>&nbsp;&nbsp;<font color="#6f6f6f">National Defense Magazine</font>',
//     source: {
//     url: 'https://www.nationaldefensemagazine.org',
//         '$t': 'National Defense Magazine'
// }
// }
/**
 *
 * @param {string}channelId
 * FIXME docs.
 * @param {any}articleMeta
 */
function sendNews(channelId, articleMeta) {
    if (process.env.dev) {
        console.log(`DEV SIM: sending article "${articleMeta.title}"`)
        return
    }
    // inside a command, event listener, etc.
    const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(articleMeta.title)
        .setURL(articleMeta.url)
        .setDescription(articleMeta.description)

        // .setThumbnail('https://i.imgur.com/AfFp7pu.png')
        // .addFields(
        //     {name: 'Google RSS feed:', value: articleMeta.googleRSSFEED},
        //     // { name: '\u200B', value: '\u200B' },
        //     // { name: 'Inline field title', value: 'Some value here', inline: true },
        //     // { name: 'Inline field title', value: 'Some value here', inline: true },
        // )
        // .addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
        .setImage(articleMeta.imageLink)
        // .setTimestamp()
        .setFooter({text: 'Ya know im a stub.'/*, iconURL: 'https://i.imgur.com/AfFp7pu.png'*/});

    if (articleMeta.author) {
        exampleEmbed.setAuthor({
            name: articleMeta.author,
            iconURL: 'https://images.unsplash.com/photo-1530669731069-48706bc794ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=880&q=80',
            // url: article.source.url
        })
    }
    client.channels.fetch(channelId)
        .then(async channel => {
            await channel.send({embeds: [exampleEmbed]});
        })
        .catch(console.error);
}