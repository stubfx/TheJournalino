import topicsData from "./datamodels/topicsData.js";
import fetch from "node-fetch";
import locales from './datamodels/locales.js'

export function rndArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function isValidHttpsUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }
    // no http.
    // !url.host.includes("_") IS FOR DISCORD PURPOSES ONLY.
    return /*url.protocol === "http:" || */url.protocol === "https:" || !url.host.includes("_");
}

export function checkStringLength(string, max, min = 1) {
    // Primitives are a different kind of type than objects created from within Javascript,
    // therefore the check below will always be false.
    // if (string instanceof String) {
    if (typeof string === "string") {
        return string.length > min && string.length < max
    }
    return false
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

export async function fetchWithTimeout(resource, options = {timeout: 5000}) {
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