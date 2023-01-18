import * as discordBot from "./discordbot.js";

// Require the framework and instantiate it
/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */
import path from "path";
// Require the fastify framework and instantiate it
import fastify0 from "fastify";


import fastifyStatic from "@fastify/static";
import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fastify = fastify0({
    // Set this to true for detailed logging:
    logger: false,
});

// Setup our static files
fastify.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
    prefix: "/", // optional: default '/'
});

// Run the server and report out to the logs
fastify.listen(
    // { port: 3000, host: "127.0.0.1" },
    { port: 3000 },
    function (err, address) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Your app is listening on ${address}`);
    }
);

discordBot.initBot()