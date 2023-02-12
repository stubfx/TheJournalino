import {rndArrayItem} from "../utils.js";

/**
 *
 * @type {Array<{name: string, value: string}>}
 */
const CTAFields = [
    {
        name: 'Vote me on Top.gg!',
        value: 'https://top.gg/bot/1063214678874009701/vote'
    }
];

export function getCTAField() {
    return rndArrayItem(CTAFields)
}