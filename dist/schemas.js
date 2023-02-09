import mongoose from "mongoose";
export const NewsGuildSchema = new mongoose.Schema({
    id: String,
    name: String,
    promo: {
        enabled: { type: Boolean, default: true },
        invite: {
            topic: String,
            url: String,
            text: String
        },
    },
    invite: {
        topic: String,
        url: String,
        text: String
    },
    channels: [{
            id: String,
            name: String,
            topics: [
                {
                    topic: String,
                    language: String,
                    date: Date,
                    user: {
                        id: String,
                        name: String
                    }
                }
            ]
        }],
    date: Date
});
export const NewsGuild = mongoose.model('newsGuild', NewsGuildSchema);
//# sourceMappingURL=schemas.js.map