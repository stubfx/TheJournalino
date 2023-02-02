// Remember to set type: module in package.json or use .mjs extension
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

import * as lowdb from "lowdb";
import {JSONFile} from "lowdb/lib/adapters/JSONFile";


// File path
const __dirname = dirname(fileURLToPath(import.meta.url));
const guildsFile = join(__dirname, 'db/guildsDB.json')
const newsFile = join(__dirname, 'db/newsDB.json')

// Configure lowdb to write to JSONFile
// const adapter = new JSONFile(file)

const guildsDB = new lowdb.Low<guildsDB>(new JSONFile(guildsFile))
const newsDB = new lowdb.Low<newsDB>(new JSONFile(newsFile))

// Read data from JSON file, this will set db.data content
await guildsDB.read()
if (!guildsDB.data) {
    guildsDB.data = {guilds: {}, lastRunAt: null}
    await guildsDB.write()
}

// Read data from JSON file, this will set db.data content
await newsDB.read()
if (!newsDB.data) {
    newsDB.data = {articles: {}, expensiveQueries: []}
    await newsDB.write()
}

export {guildsDB, newsDB}