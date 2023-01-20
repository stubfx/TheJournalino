import topicsData from "./datamodels/topicsData.js";

export function rndArrayItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function getNameFromTopicValue(topicValue) {
    if ((topicsData[topicValue])) {
        return topicsData[topicValue].name
    }
    return "ERROR"
}