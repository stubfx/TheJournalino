import mongoose from "mongoose";

export interface NewsGuildSchemaInterface {
    id: String,
    name: String,
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
}

export const NewsGuildSchema = new mongoose.Schema({
    id: String,
    name: String,
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

export const NewsGuild = mongoose.model('newsGuild', NewsGuildSchema)