import * as cheerio from "cheerio";
import xmlParser from "xml2json";
import { DiscordAPIError, EmbedBuilder } from "discord.js";
import * as dbAdapter from "./dbAdapter.js";
import { forEachGuild } from "./dbAdapter.js";
import * as LoggerHelper from "./loggerHelper.js";
import * as Utils from "./utils.js";
import { getPhrase } from "./datamodels/footer_labels.js";
import { getCTAField } from "./datamodels/news_random_cta.js";
let client = null;
class ArticleMetadata {
    googleRSSFEED;
    url;
    title;
    description;
    imageLink;
    author;
    constructor(url, title, description, imageLink, author) {
        this.googleRSSFEED = null;
        this.url = url;
        this.title = title;
        this.description = description;
        this.imageLink = imageLink;
        this.author = author;
    }
    hashCode() {
        let string = this.toString();
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + code;
            hash = hash & hash;
        }
        return hash;
    }
    isComplete() {
        return !!(Utils.isValidHttpsUrl(this.url)
            && Utils.checkStringLength(this.title, 256)
            && Utils.checkStringLength(this.description, 4096)
            && Utils.isValidHttpsUrl(this.imageLink));
    }
}
function getGoogleNewsFeedUrl(newsData) {
    const prefix = "https://news.google.com/rss/search?q=";
    const postfix = `&hl=${newsData.language}`;
    let feedUrl = prefix + dbAdapter.getCurrentTopicQuery(newsData.topic) + postfix;
    LoggerHelper.dev(`GENERATED RSS FEED: ${feedUrl}`);
    return feedUrl;
}
export async function findMetaEmbeds(rawGoogleArticle) {
    return new Promise(async (resolve) => {
        let url = rawGoogleArticle.description.match(/(?<=href=['"])[^'"]*/g)[0];
        LoggerHelper.dev(`Fetching ${url}`);
        try {
            let response = await Utils.fetchWithTimeout(url);
            let html = await response.text();
            const $ = cheerio.load(html);
            let title = $('meta[property="og:title"]').attr('content');
            let description = $('meta[property="og:description"]').attr('content');
            let imageLink = $('meta[property="og:image"]').attr('content');
            resolve(new ArticleMetadata(url, title, description, imageLink, rawGoogleArticle.source['$t']));
        }
        catch (e) {
            LoggerHelper.consoleError(`Fetching ${url}`);
            LoggerHelper.consoleError(e);
            resolve(null);
        }
    });
}
async function sendArticleFromCache(googleNewsFeedUrl, newsData) {
    let cachedNewsArticle = await dbAdapter.getCurrentArticle(newsData, googleNewsFeedUrl);
    if (cachedNewsArticle) {
        sendNudes(googleNewsFeedUrl, newsData, cachedNewsArticle);
        return true;
    }
    return false;
}
async function retrieveGoogleArticles(googleNewsFeedUrl) {
    try {
        LoggerHelper.dev(`Fetching Google for ${googleNewsFeedUrl}`);
        let response = await Utils.fetchWithTimeout(googleNewsFeedUrl);
        let rssText = await response.text();
        let news = JSON.parse(xmlParser.toJson(rssText, null))['rss']['channel']['item'];
        if (!news) {
            dbAdapter.addExpensiveQuery(googleNewsFeedUrl);
            LoggerHelper.error(`Adding ${googleNewsFeedUrl} to the expensive list`);
            return;
        }
        else if (news.length < 5) {
            dbAdapter.addExpensiveQuery(googleNewsFeedUrl);
            LoggerHelper.error(`Adding ${googleNewsFeedUrl} to the expensive list`);
        }
        dbAdapter.cacheRawArticles(googleNewsFeedUrl, news);
    }
    catch (e) {
        LoggerHelper.error(e);
    }
}
async function sendTopicNewsInChannel(newsData) {
    const googleNewsFeedUrl = getGoogleNewsFeedUrl(newsData);
    if (dbAdapter.isQueryTooExpensive(googleNewsFeedUrl)) {
        LoggerHelper.dev(`Not looking for ${googleNewsFeedUrl}`);
        return;
    }
    if (await sendArticleFromCache(googleNewsFeedUrl, newsData)) {
        return;
    }
    await retrieveGoogleArticles(googleNewsFeedUrl);
    await sendArticleFromCache(googleNewsFeedUrl, newsData);
}
async function startNewsBatch() {
    LoggerHelper.info('--------------------- NEWS BATCH ---------------------');
    await dbAdapter.updateLastNewsBatchRun();
    dbAdapter.prepareForNewBatch();
    await forEachGuild(async (newsGuild) => {
        console.log(newsGuild);
        let log = [`Running for ${newsGuild.name}`];
        let channels = newsGuild.channels;
        for (let channel of channels) {
            let topics = channel.topics;
            log.push(`Topics: ${topics ? topics.toString() : "No topics found"}`);
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
    const hoursToRunAt = [1, 4, 7, 10, 13, 16, 19, 22];
}
function sendNudes(feedUrl, newsData, articleMeta) {
    try {
        LoggerHelper.dev(`Sending article "${articleMeta.title}"`);
        if (process.env.dev) {
            LoggerHelper.dev(`Not sending article in dev mode - "${articleMeta.title}"`);
        }
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
            .setImage(articleMeta.imageLink)
            .setFooter({ text: getPhrase() });
        if (articleMeta.author) {
            msgEmbed.addFields({ name: 'Author', value: articleMeta.author, inline: true }, { name: 'Topic', value: Utils.getNameFromTopicValue(newsData.topic), inline: true });
        }
        if (Math.random() < 0.3) {
            msgEmbed.addFields(getCTAField());
        }
        client.channels.fetch(newsData.channelId)
            .then(async (channel) => {
            await channel.send({ embeds: [msgEmbed] });
        }).catch(reason => {
            const skipError = [
                "50013",
                "50001"
            ];
            if (reason instanceof DiscordAPIError) {
                LoggerHelper.error(reason, `Guild: ${newsData.guildName}(${newsData.guildId})`, `Channel: ${newsData.channelName}(${newsData.channelId})`);
                if (!skipError.includes(reason.code.toString())) {
                    LoggerHelper.error(feedUrl, articleMeta.url, articleMeta.imageLink, reason);
                }
            }
            else {
                LoggerHelper.error(feedUrl, articleMeta.url, articleMeta.imageLink, reason);
            }
        });
    }
    catch (e) {
        LoggerHelper.error(`ChannelID: ${newsData.channelId}`, feedUrl, e);
    }
}
//# sourceMappingURL=newsHandler.js.map