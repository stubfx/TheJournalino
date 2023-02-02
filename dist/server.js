import * as discordBot from "./discordbot.js";
import path from "path";
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({
    logger: false
});
fastify.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
    prefix: "/",
});
fastify.get("/help", async (request, reply) => {
    reply.redirect("/help.html");
});
fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Http server ready.`);
});
discordBot.initBot();
//# sourceMappingURL=server.js.map