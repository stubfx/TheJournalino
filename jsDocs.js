/**
 * @typedef NewsTopic
 * @property {string}name gaming
 * @property {string}language en
 */

/**
 * @typedef User
 * @property {string}id
 * @property {string}name
 */

/**
 * @typedef NewsChannel
 *
 */

/**
 * @typedef NewsData
 * @property {string}topic
 * @property {string}guildId
 * @property {string}guildName
 * @property {string}channelId
 * @property {string}channelName
 * @property {User}jobCreator
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