import * as Utils from "../utils.js";

export class ArticleMetadata {
    get author(): string | null {
        return this._author;
    }

    set author(value: string | null) {
        this._author = value;
    }
    get imageLink(): string | null {
        return Utils.getCorrectHttpsUrl(this._imageLink) || Utils.getTimageFromTopicValue(this.newsData.topic);
    }

    set imageLink(value: string | null) {
        this._imageLink = value;
    }
    get description(): string | null {
        return this._description;
    }

    set description(value: string | null) {
        this._description = value;
    }
    get title(): string | null {
        return this._title;
    }

    set title(value: string | null) {
        this._title = value;
    }
    get url(): string | null {
        return this._url;
    }

    set url(value: string | null) {
        this._url = value;
    }

    private newsData: NewsData;
    private _url: string | null;
    private _title: string | null;
    private _description: string | null;
    private _imageLink: string | null;
    private _author: string | null;

    constructor(newsData: NewsData, url, title, description, imageLink, author) {
        this.newsData = newsData
        this._url = Utils.getCorrectHttpsUrl(url)
        this._title = Utils.checkStringLength(title, 256)
        this._description = Utils.checkStringLength(description, 4096)
        this._imageLink = Utils.getCorrectHttpsUrl(imageLink)
        this._author = author
    }

    isComplete() {
        // check if urls are fine! that's important.
        return !!(Utils.getCorrectHttpsUrl(this.url)
            && Utils.checkStringLength(this.title, 256)
            && Utils.checkStringLength(this.description, 4096)
            && Utils.getCorrectHttpsUrl(this.imageLink))
    }

    /**
     * not used yet, may be useful later while working with multithreading
     * @return {number}
     */
    hashCode() {
        let string = this.toString()
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + code;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}