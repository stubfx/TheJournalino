import {rndArrayItem} from "../utils.js";

const phrases = [
    "Why did the frozen yogurt go to the doctor? It had a case of the chills.",
    "What do you call a cold nose? A frosty-sneeze.",
    "How does a snowman keep warm in winter? With a scarf and hat.",
    "Why did the snowflake feel embarrassed? It was caught falling in public.",
    "What do you call a cold fish? A frosty-fin.",
    "Why did the ice cube feel left out? It was all by itself.",
    "What do you call a cold bird? A chill-dove.",
    "Why did the snowman go to the bar? To warm up with a hot toddy.",
    "What do you call a cold tree? A frosty-branch.",
    "Why did the ice cube feel lonely? It was feeling a little cube-er.",
    "What do you call a cold insect? A frosty-bug.",
    "Why did the snowman join a band? He wanted to rock-out with his frost-out.",
    "What do you call a cold plant? A frosty-bloom.",
    "Why did the ice cube go to the dance? To heat up the floor.",
    "What do you call a cold bear? A frosty-hugger.",
    "Why did the snowman go to the movies? To catch a chill-ler.",
    "What do you call a cold dog? A frosty-paw.",
    "Why did the ice cube go on vacation? To melt its stress away.",
    "What do you call a cold cat? A frosty-purr.",
    "Why did the snowman go to the party? To let its hair down and have a frost-tastic time.",
    "Why did the ice cube go to school? To learn to chill.",
    "What do you call a cold frog? A frosty-jump.",
    "Why did the snowman go to the beach? To soak up the sun and warm up.",
    "What do you call a cold horse? A frosty-trot.",
    "Why did the ice cube go on a date? To find a chill mate."
];

export function getPhrase() {
    return rndArrayItem(phrases)
}