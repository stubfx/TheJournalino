const discordCTAs = [{
        name: "gamingnews_cta_1",
        async execute(client, interaction) {
            await interaction.update({
                content: 'Aight! News will be here soon!',
                components: []
            });
        }
    }];
export default discordCTAs;
//# sourceMappingURL=discord-cta.js.map