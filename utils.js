import topicsData from "./datamodels/topicsData.js";
import fetch from "node-fetch";
import locales from './datamodels/locales.js'

export function rndArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function getNameFromTopicValue(topicValue) {
    if ((topicsData[topicValue])) {
        return topicsData[topicValue].name
    }
    return `ERROR(${topicValue})`
}

export function getNameFromLanguageValue(languageValue) {
    let find = locales.find(value => value.value === languageValue);
    if (find) {
        return find.name
    }
    return `ERROR(${languageValue})`
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