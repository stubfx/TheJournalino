declare type guildsDB = {
    guilds: {},
    lastRunAt: Date | null
}

declare type newsDB = {
    articles: {},
    expensiveQueries: Array<String>
}

declare type User = {
    id: String
    name: String
}

declare type NewsData = {
 topic : string
 guildId : string
 guildName : string
 channelId : string
 channelName : string
 jobCreator : User
 language : string
 hourInterval : number
}
