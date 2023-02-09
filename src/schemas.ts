import mongoose from "mongoose";

export interface NewsGuildTopicChannel {
    topic: String,
    language: String,
    date: Date,
    user: {
        id: String,
        name: String
    }
}

export interface NewsGuildSchemaChannel {
    id: String,
    name: String,
    topics: Array<NewsGuildTopicChannel>
}

export interface NewsGuildSchemaInterface {
    id: String,
    name: String,
    promo: {
        enabled: Boolean,
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
    }
    channels: Array<NewsGuildSchemaChannel>,
    date: Date
}

export interface NewsGuildModelInterface extends NewsGuildSchemaInterface {
    save: Function
}

export const NewsGuildSchema = new mongoose.Schema<NewsGuildModelInterface>({
    id: String,
    name: String,
    promo: {
        enabled: {type: Boolean, default: true},
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

export const NewsGuild = mongoose.model<NewsGuildSchemaInterface>('newsGuild', NewsGuildSchema)