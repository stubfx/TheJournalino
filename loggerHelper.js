let client = null

export function init(discordClient) {
    client = discordClient
}

export function error(data) {
    console.error(data)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`\`\`\`${data.toString()}\`\`\``);
        })
        .catch(console.error);
}

export function info(data) {
    console.log(data)
    client.channels.fetch(process.env.discord_log_channel_id)
        .then(async channel => {
            // await channel.send({embeds: [exampleEmbed]});
            await channel.send(`\`\`\`${data}\`\`\``);
        })
        .catch(console.error);
}

export function dev(data) {
    console.log(data);
}