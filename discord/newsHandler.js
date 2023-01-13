import fetch from "node-fetch";
import * as cheerio from "cheerio";
import xmlParser from "xml2json";
import Discord, {EmbedBuilder} from "discord.js";
import * as newsGuildHandler from "./handlerData/discord-news.js";

let client = null

class ArticleMetadata {
    constructor(url, title, description, imageLink, author) {
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

function rndArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomGoogleNewsFeedUrl(newsData) {
    const prefix = "https://news.google.com/rss/search?q=";
    // const postfix = '&hl=en-US&gl=US&ceid=US:en'
    const postfix = `&hl=${language}`
    let feedUrl = prefix + rndArrayItem(newsData.queries) + postfix;
    console.log(`RSS FEED: ${feedUrl}`);
    return feedUrl
}

async function findMetaEmbeds(article) {
    return new Promise(async resolve => {
        // gets the link from the Google article
        let url = article.description.match(/(?<=href=['"])[^'"]*/g)[0]
        await fetch(url)
            .then(result => result.text())
            .then(html => {
                // console.log(html);
                const $ = cheerio.load(html);
                let title = $('meta[property="og:title"]').attr('content')
                let description = $('meta[property="og:description"]').attr('content')
                let imageLink = $('meta[property="og:image"]').attr('content')
                resolve(new ArticleMetadata(url, title, description, imageLink, article.source['$t']))
            }).catch(error => {
                console.log(error);
            })
    })
}

async function onNewsFeedReceived(news, randomGoogleNewsFeedUrl, newsData) {
    let articleMetaData = await findMetaEmbeds(rndArrayItem(news));
    articleMetaData.googleRSSFEED = randomGoogleNewsFeedUrl
    // is the article complete? or should we look for another one?
    if (articleMetaData.isComplete()) {
        sendNews(newsData, articleMetaData)
    } else {
        console.error(`This article is not complete ${articleMetaData.url}`)
        console.error(`I'll try again!`)
        await onNewsFeedReceived(news, randomGoogleNewsFeedUrl, newsData)
    }
}

/**
 *
 * @param {NewsData}newsData
 */
function fetchGoogleNews(newsData) {
    const randomGoogleNewsFeedUrl = getRandomGoogleNewsFeedUrl(newsData);
    fetch(randomGoogleNewsFeedUrl)
        .then(value => value.text())
        .then(value => JSON.parse(xmlParser.toJson(value, null))['rss']['channel']['item'])
        .then(async news => {
            await onNewsFeedReceived(news, randomGoogleNewsFeedUrl, newsData);
        });
}

export function startNewsHandler(discordClient) {
    // client = discordClient
    // let lastSentHour = null
    // setInterval(() => {
    //     let hour = new Date().getHours()
    //     if (lastSentHour === hour) {
    //         // already sent the news for this hour.
    //         return
    //     }
    //     lastSentHour = hour
    //     for (let newsData of discordNews) {
    //         for (let number of newsData.hourOfDay) {
    //             if (number === hour) {
    //                 // we should send this article.
    //                 fetchGoogleNews(newsData)
    //             }
    //         }
    //     }
    // }, 10 * 60 * 1000)// run once every hour
    // setInterval(() => {
    //     let allGuilds = newsGuildHandler.allGuilds();
    //     console.log(allGuilds.length)
    // }, 2000)
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
 * @param {NewsData}newsData
 * FIXME docs.
 * @param {any}articleMeta
 */
function sendNews(newsData, articleMeta) {
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
    client.channels.fetch(newsData.channelID)
        .then(async channel => {
            if (channel instanceof Discord.NewsChannel) {
                await (await channel.send({embeds: [exampleEmbed]})).crosspost()
            }
            if (channel instanceof Discord.TextChannel) {
                // channel is type of TextChannel
                // channel.send(links[0])
                await channel.send({embeds: [exampleEmbed]});
            }
        })
        .catch(console.error);
}