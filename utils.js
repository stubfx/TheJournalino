import topicsData from "./datamodels/topicsData.js";
import fetch from "node-fetch";

export function rndArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function getNameFromTopicValue(topicValue) {
    if ((topicsData[topicValue])) {
        return topicsData[topicValue].name
    }
    return "ERROR"
}

export async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 5000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}