import xmlParser from "xml2json";
import { DiscordAPIError, EmbedBuilder } from "discord.js";
import * as dbAdapter from "./dbAdapter.js";
import { forEachGuild } from "./dbAdapter.js";
import * as LoggerHelper from "./loggerHelper.js";
import * as Utils from "./utils.js";
import { getPhrase } from "./datamodels/footer_labels.js";
import { getCTAField } from "./datamodels/news_random_cta.js";
import * as cheerio from "cheerio";
let client = null;
export class ArticleMetadata {
    get author() {
        return this._author;
    }
    set author(value) {
        this._author = value;
    }
    get imageLink() {
        return Utils.getCorrectHttpsUrl(this._imageLink) || Utils.getTimageFromTopicValue(this.newsData.topic);
    }
    set imageLink(value) {
        this._imageLink = value;
    }
    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value;
    }
    get title() {
        return this._title;
    }
    set title(value) {
        this._title = value;
    }
    get url() {
        return this._url;
    }
    set url(value) {
        this._url = value;
    }
    newsData;
    _url;
    _title;
    _description;
    _imageLink;
    _author;
    constructor(newsData, url, title, description, imageLink, author) {
        this.newsData = newsData;
        this._url = Utils.getCorrectHttpsUrl(url);
        this._title = Utils.checkStringLength(title, 256);
        this._description = Utils.checkStringLength(description, 4096);
        this._imageLink = Utils.getCorrectHttpsUrl(imageLink);
        this._author = author;
    }
    /**
     * not used yet, may be useful later while working with multithreading
     * @return {number}
     */
    hashCode() {
        let string = this.toString();
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + code;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
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
    const postfix = `&hl=${newsData.language}`;
    let feedUrl = prefix + dbAdapter.getCurrentTopicQuery(newsData.topic) + postfix;
    LoggerHelper.dev(`GENERATED RSS FEED: ${feedUrl}`);
    return feedUrl;
}
export async function findMetaEmbeds(newsData, rawGoogleArticle) {
    return new Promise(async (resolve) => {
        // gets the link from the Google article
        let url = rawGoogleArticle.description.match(/(?<=href=['"])[^'"]*/g)[0];
        LoggerHelper.dev(`Fetching ${url}`);
        try {
            // let articleMetadata = await scrapeThis(url);
            // articleMetadata.author = rawGoogleArticle.source['$t']
            // resolve(articleMetadata)
            let response = await Utils.fetchWithTimeout(url);
            let html = await response.text();
            const $ = cheerio.load(html);
            let title = $('meta[property="og:title"]').attr('content');
            let description = $('meta[property="og:description"]').attr('content');
            let imageLink = $('meta[property="og:image"]').attr('content');
            if (title === "Google News") {
                // look for the specific article pls.
                let googleNewsArticleMetaEmbeds = await findGoogleNewsArticleMetaEmbeds(url, newsData, $);
                if (googleNewsArticleMetaEmbeds) {
                    // found the article <3
                    // for legal reasons, im afraid this needs to remain the Google's news url.
                    googleNewsArticleMetaEmbeds.url = url;
                    googleNewsArticleMetaEmbeds.author = rawGoogleArticle.source['$t'];
                    resolve(googleNewsArticleMetaEmbeds);
                }
            }
            resolve(new ArticleMetadata(newsData, url, title, description, imageLink, rawGoogleArticle.source['$t']));
        }
        catch (e) {
            LoggerHelper.consoleError(`Fetching ${url}`);
            LoggerHelper.consoleError(e);
            resolve(null);
        }
    });
}
export async function findGoogleNewsArticleMetaEmbeds(googleNewsUrl, newsData, googleNewsScrapedPage) {
    try {
        // gets the link from the Google article
        let linkSelector = googleNewsScrapedPage("a");
        let attributes = linkSelector.attr();
        if (attributes && attributes.jsname === "tljFtd") {
            // ok, we should have found the link.
            let realNewsUrl = Utils.getCorrectHttpsUrl(linkSelector.text());
            if (realNewsUrl) {
                // URL FOUND. (Hopefully :/)
                let response = await Utils.fetchWithTimeout(realNewsUrl);
                let html = await response.text();
                const $ = cheerio.load(html);
                let title = $('meta[property="og:title"]').attr('content');
                let description = $('meta[property="og:description"]').attr('content');
                let imageLink = $('meta[property="og:image"]').attr('content');
                return new ArticleMetadata(newsData, googleNewsUrl, title, description, imageLink, null);
            }
        }
        return null;
    }
    catch (e) {
        LoggerHelper.consoleError(`Fetching ${googleNewsUrl}`);
        LoggerHelper.consoleError(e);
        return null;
    }
}
async function sendArticleFromCache(googleNewsFeedUrl, newsData) {
    // look for the article in the cache if possible
    let cachedNewsArticle = await dbAdapter.getCurrentArticle(newsData, googleNewsFeedUrl);
    if (cachedNewsArticle) {
        // if there is an article, just send it :P
        sendNudes(googleNewsFeedUrl, newsData, cachedNewsArticle);
        return true;
    }
    return false;
}
async function retrieveGoogleArticles(googleNewsFeedUrl) {
    // otherwise we'll need to go through the painful Google process :P
    try {
        LoggerHelper.dev(`Fetching Google for ${googleNewsFeedUrl}`);
        let response = await Utils.fetchWithTimeout(googleNewsFeedUrl);
        let rssText = await response.text();
        let news = JSON.parse(xmlParser.toJson(rssText, null))['rss']['channel']['item'];
        // if this array is not worth fetching for...
        if (!news) {
            // then im sry my little friend.
            dbAdapter.addExpensiveQuery(googleNewsFeedUrl);
            LoggerHelper.error(`Adding ${googleNewsFeedUrl} to the expensive list`);
            return;
        }
        else if (news.length < 5) {
            // we still need to add this query to the expesive list
            dbAdapter.addExpensiveQuery(googleNewsFeedUrl);
            LoggerHelper.error(`Adding ${googleNewsFeedUrl} to the expensive list`);
            // but in this case we have some results, why waste them?
            // return
        }
        // save articles to cache.
        dbAdapter.cacheRawArticles(googleNewsFeedUrl, news);
    }
    catch (e) {
        LoggerHelper.error(e);
    }
}
/**
 *
 * @param {NewsData}newsData
 */
async function sendTopicNewsInChannel(newsData) {
    // get the url first
    const googleNewsFeedUrl = getGoogleNewsFeedUrl(newsData);
    if (dbAdapter.isQueryTooExpensive(googleNewsFeedUrl)) {
        // hell nay.
        LoggerHelper.dev(`Not looking for ${googleNewsFeedUrl}`);
        return;
    }
    // look for the article in the cache if possible
    if (await sendArticleFromCache(googleNewsFeedUrl, newsData)) {
        // article has been found in and sent from cache, abort.
        return;
    }
    await retrieveGoogleArticles(googleNewsFeedUrl);
    // aight, if everything was right, we should have the article in cache
    // if not, then the query has been probably added to the expensive list.
    // we are trying once, just to avoid stupid loops.
    // if it doesn't go through, I'm not using lube this time.
    await sendArticleFromCache(googleNewsFeedUrl, newsData);
}
async function startNewsBatch() {
    LoggerHelper.info('--------------------- NEWS BATCH ---------------------');
    await dbAdapter.updateLastNewsBatchRun();
    // reset cache for the next news cycle.
    dbAdapter.prepareForNewBatch();
    await forEachGuild(async (newsGuild) => {
        let log = [`Running for ${newsGuild.name}`];
        let channels = newsGuild.channels;
        for (let channel of channels) {
            let topics = channel.topics;
            log.push(`Topics: ${topics ? topics.map(value => `${value.topic}(${value.language})`).toString() : "No topics found"}`);
            for (let currentTopic of topics) {
                if (!currentTopic.user) {
                    currentTopic.user = { id: null, name: null };
                }
                try {
                    await sendTopicNewsInChannel({
                        guildId: newsGuild.id,
                        topic: currentTopic.topic,
                        language: currentTopic.language,
                        hourInterval: 1,
                        channelId: channel.id,
                        channelName: channel.name,
                        guildName: newsGuild.name,
                        jobCreator: { id: currentTopic.user.id, name: currentTopic.user.name }
                    });
                }
                catch (e) {
                    // in case of error, keep going.
                    LoggerHelper.error(`Fatal error encountered for ${newsGuild.name}(${newsGuild.id}) - topic: ${currentTopic.topic} - language: ${currentTopic.language}`, e);
                }
            }
        }
        LoggerHelper.info(...log);
    });
    LoggerHelper.info('------------------------ DONE ------------------------');
    await dbAdapter.patchData();
}
export function startNewsHandler(discordClient) {
    client = discordClient;
    // glitch likes to restart the app every 12 hours
    // which is at 2.45 and 14.45 in its local time
    // so, we just choose hours away from those, just to make sure.
    const hoursToRunAt = [1, /*2.45*/ 4, 7, 10, /*14.45*/ 13, 16, 19, 22];
    // setTimeout(async ()=> {
    //     let a =await scrapeThis("https://news.google.com/articles/CBMidWh0dHBzOi8vd3d3LmZveG5ld3MuY29tL3BvbGl0aWNzL2lsaGFuLW9tYXItZ2V0cy1ib290LWhvdXNlLXZvdGVzLW9mZi1mb3JlaWduLWFmZmFpcnMtY29tbWl0dGVlLWRlbW9jcmF0cy1jaXRlLXJhY2lzbdIBeWh0dHBzOi8vd3d3LmZveG5ld3MuY29tL3BvbGl0aWNzL2lsaGFuLW9tYXItZ2V0cy1ib290LWhvdXNlLXZvdGVzLW9mZi1mb3JlaWduLWFmZmFpcnMtY29tbWl0dGVlLWRlbW9jcmF0cy1jaXRlLXJhY2lzbS5hbXA?hl=en-US&gl=US&ceid=US%3Aen")
    //     // console.log(JSON.stringify(a, null, 4))
    // })
    // client.users.fetch("277957115736358922").then(user => {
    //     console.log(user)
    //     user.send("test")
    // })
    if (process.env.dev) {
        setTimeout(async () => {
            await startNewsBatch();
        }, 1000); // run once every 10 seconds
        return;
    }
    //
    setInterval(async () => {
        let runLastTimeAt = dbAdapter.getLastNewsBatchRunTime();
        // is the current hour in the calendar?
        let currentHour = new Date().getHours();
        if (hoursToRunAt.includes(currentHour)) {
            // has the batch already run at this hour?
            if (runLastTimeAt && (currentHour !== runLastTimeAt.getHours())) {
                // if not, we are safe to run another batch.
                await startNewsBatch();
            }
        }
    }, 30 * 60 * 1000); // this should run once every 30 mins
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
 * @param {string}feedUrl
 * @param {NewsData}newsData
 * @param {any}articleMeta
 */
function sendNudes(feedUrl, newsData, articleMeta) {
    try {
        LoggerHelper.dev(`Sending article "${articleMeta.title}"`);
        if (process.env.dev) {
            LoggerHelper.dev(`Not sending article in dev mode - "${articleMeta.title}"`);
            // return
        }
        // inside a command, event listener, etc.
        const msgEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(articleMeta.title)
            .setURL(articleMeta.url)
            .setDescription(articleMeta.description)
            .setAuthor({
            name: "TheJournalino!",
            iconURL: 'https://thejournalino.com/assets/imgs/icon_128.png',
            url: 'https://thejournalino.com/'
        })
            // .setThumbnail('https://thejournalino.com/icon.png')
            // .addFields(
            //     {name: 'Google RSS feed:', value: articleMeta.googleRSSFEED},
            //     // { name: '\u200B', value: '\u200B' },
            //     // { name: 'Inline field title', value: 'Some value here', inline: true },
            //     // { name: 'Inline field title', value: 'Some value here', inline: true },
            // )
            // .addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
            // .setImage(articleMeta.imageLink)
            // "https://ogden_images.s3.amazonaws.com/www.thealpenanews.com/images/2023/01/25214647/Alpena-basketball-Easton-Srebnik-vs-Sault-Ste-Marie-WEB-667x500.jpg"
            // "https://ogden_images.s3.amazonaws.com/www.thealpenanews.com/images/2023/01/25214647/Alpena-basketball-Easton-Srebnik-vs-Sault-Ste-Marie-WEB-667x500.jpg"
            // .setTimestamp()
            .setFooter({ text: getPhrase() /*, iconURL: 'https://i.imgur.com/AfFp7pu.png'*/ });
        if (articleMeta.author) {
            msgEmbed.addFields(
            // {name: 'Google RSS feed:', value: articleMeta.googleRSSFEED},
            // { name: '\u200B', value: '\u200B' },
            { name: 'Author', value: articleMeta.author, inline: true }, { name: 'Topic', value: Utils.getNameFromTopicValue(newsData.topic), inline: true });
        }
        let imageLink = articleMeta.imageLink;
        if (imageLink) {
            msgEmbed.setImage(imageLink);
        }
        else {
            // in this case just make it pretty!
            // msgEmbed.setImage("https://i.imgur.com/AfFp7pu.png")
        }
        if (Math.random() < 0.3) {
            msgEmbed.addFields(getCTAField());
        }
        client.channels.fetch(newsData.channelId)
            .then(async (channel) => {
            await channel.send({ embeds: [msgEmbed] });
        }).catch(reason => {
            const skipError = [
                // DiscordAPIError[50013]: Missing Permissions
                "50013",
                // DiscordAPIError[50001]: Missing Access
                "50001"
            ];
            if (reason instanceof DiscordAPIError) {
                LoggerHelper.error(reason, `Guild: ${newsData.guildName}(${newsData.guildId})`, `Channel: ${newsData.channelName}(${newsData.channelId})`);
                // log the error details, only if is not a common one.
                if (!skipError.includes(reason.code.toString())) {
                    LoggerHelper.error(feedUrl, articleMeta.url, imageLink, reason);
                }
            }
            else {
                LoggerHelper.error(feedUrl, articleMeta.url, imageLink, reason);
            }
        });
    }
    catch (e) {
        // just to make sure.
        LoggerHelper.error(`ChannelID: ${newsData.channelId}`, feedUrl, e);
    }
}
//# sourceMappingURL=newsHandler.js.map