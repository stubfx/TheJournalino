let client = null

function getSanitizedLog(data) {
    try {
        return data.split("\n")
            .map(s => s.trim())
            // If you want to remove empty lines.
            .filter(Boolean)
            .join("\n");
    } catch (e) {
        error(data)
        return data
    }
}

function getSanitizedSuggestion(data) {
    try {
        return "Suggestion: " + data.replace(/[^a-zA-Z ]/g, "[%]")
    } catch (e) {
        error(e)
        return null
    }
}

export function init(discordClient) {
    client = discordClient
}

export function error(data, consoleOnly = false) {
    console.error(data)
    if (!consoleOnly) {
        client.channels.fetch(process.env.discord_log_channel_id)
            .then(async channel => {
                // await channel.send({embeds: [exampleEmbed]});
                await channel.send(`:red_circle:\`${data.toString()}\``);
            })
            .catch(console.error);
    }
}

export function success(data) {
    // clear data in case of template string multiline
    let log = getSanitizedLog(data)
    console.info(log)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`:green_circle:\`${log.toString()}\``);
        })
        .catch(console.error);
}

export function suggestion(data, toSanitize) {
    // clear data in case of template string multiline
    let log = data + "\n" + getSanitizedSuggestion(toSanitize)
    console.info(log)
    client.channels.fetch(process.env.discord_log_suggestion_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`:green_circle:\`${log.toString()}\``);
        })
        .catch(console.error);
}

export function info(data) {
    console.log(data)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`:blue_circle:\`${data}\``);
        })
        .catch(console.error);
}

export function dev(data) {
    console.log(data);
}