// Remember to set type: module in package.json or use .mjs extension
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// File path
const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'db.json')

// Configure lowdb to write to JSONFile
const adapter = new JSONFile(file)
const db = new Low(adapter)

// Read data from JSON file, this will set db.data content
await db.read()
if (!db.data) {
    db.data = {guilds: {}, news: {}}
    await db.write()
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
export default db