/**
 * @typedef NewsData
 * @property {string}name
 * @property {string}channelID
 * @property {Array<String>}queries
 * @property {Array<number>}hourOfDay
 */


/**
 *
 * @type {Array<NewsData>}
 */
const discordNews = [
    {
        name: "Gaming",
        channelID: "760191387433304086",
        queries: [
            "SeaOfThieves",
            "Overwatch+2",
            "Rainbow+six+siege",
            "Valve+Steam+games",
            "Warzone+2"
        ],
        hourOfDay: [10, 15, 20]
    },
    {
        name: "Tech",
        channelID: "1050107246509572228",
        queries: [
            "tech+news",
            "Intel+chip",
            "AMD+chip",
            "Nvidia+GPU",
            "Nvidia+AI"
        ],
        hourOfDay: [10, 15, 20]
    },
    {
        name: "Stocks",
        channelID: "1050107294437883966",
        queries: [
            "Google+Market+Stocks",
            "Intel+Market+Stocks",
            "AMD+chip+Market+Stocks",
            "Nvidia+Market+Stocks",
            "Nvidia+Market+Stocks"
        ],
        hourOfDay: [10, 20]
    },
    {
        name: "TopNews",
        channelID: "1050314737923149894",
        queries: [
            "top+news"
        ],
        hourOfDay: [9, 14]
    }
]
export default discordNews;