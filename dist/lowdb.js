import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lowdb from "lowdb";
import { JSONFile } from "lowdb/node";
const __dirname = dirname(fileURLToPath(import.meta.url));
const guildsFile = join(__dirname, 'db/guildsDB.json');
const newsFile = join(__dirname, 'db/newsDB.json');
const guildsDB = new lowdb.Low(new JSONFile(guildsFile));
const newsDB = new lowdb.Low(new JSONFile(newsFile));
await guildsDB.read();
if (!guildsDB.data) {
    guildsDB.data = { guilds: {}, lastRunAt: null };
    await guildsDB.write();
}
await newsDB.read();
if (!newsDB.data) {
    newsDB.data = { articles: {}, expensiveQueries: [] };
    await newsDB.write();
}
export { guildsDB, newsDB };
//# sourceMappingURL=lowdb.js.map