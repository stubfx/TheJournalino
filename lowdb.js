// Remember to set type: module in package.json or use .mjs extension
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

import {Low} from 'lowdb'
import {JSONFile} from 'lowdb/node'

// File path
const __dirname = dirname(fileURLToPath(import.meta.url));
const guildsFile = join(__dirname, 'db/guildsDB.json')
const newsFile = join(__dirname, 'db/newsDB.json')

// Configure lowdb to write to JSONFile
// const adapter = new JSONFile(file)
const guildsDB = new Low(new JSONFile(guildsFile))
const newsDB = new Low(new JSONFile(newsFile))

// Read data from JSON file, this will set db.data content
await guildsDB.read()
if (!guildsDB.data) {
    guildsDB.data = {guilds: {}, lastRunAt: {}}
    await guildsDB.write()
}

// Read data from JSON file, this will set db.data content
await newsDB.read()
if (!newsDB.data) {
    newsDB.data = {articles: {}, expensiveQueries: []}
    await newsDB.write()
}

console.log("updating db")
let tmp = {guilds:{}}
if (!guildsDB.data.version) {
    guildsDB.data.version = 1
    tmp.lastRunAt = guildsDB.data.lastRunAt
    tmp.version = 1
    for (let guildsKey in guildsDB.data.guilds) {
        let newGuild = {
            name: "",
            channels: {},
            date: new Date()
        }
        let guild = guildsDB.data.guilds[guildsKey]
        newGuild.name = guild.name
        tmp.guilds[guildsKey] = newGuild
        let topics = guild.topics
        for (let topicsKey in topics) {
            let channelId = topics[topicsKey].channelId;
            if (!newGuild.channels[channelId]) {
                newGuild.channels[channelId] = {topics: []}
            }
            newGuild.channels[channelId].topics.push({topic: topicsKey, language: topics[topicsKey].language, date: topics[topicsKey].date})
        }
    }
    console.log("update db done.")
    guildsDB.data = tmp
    await guildsDB.write()
    console.log(JSON.stringify(tmp, null, 4))
}

// // If db.json doesn't exist, db.data will be null
// // Use the code below to set default data
// // db.data = db.data || { posts: [] } // For Node < v15.x
// db.data ||= { posts: [] }             // For Node >= 15.x
//
// // Create and query items using native JS API
// db.data.posts.push('hello world')
// const firstPost = db.data.posts[0]
//
// // Alternatively, you can also use this syntax if you prefer
// const { posts } = db.data
// posts.push('hello world')
//
// // Finally write db.data content to file
// await db.write()
export {guildsDB, newsDB}