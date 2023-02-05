import * as Utils from "../utils.js";
export class ArticleMetadata {
    get author() {
        return this._author;
    }
    set author(value) {
        this._author = value;
    }
    get imageLink() {
        return Utils.getCorrectHttpsUrl(this._imageLink) || Utils.getTimageFromTopicValue(this.newsData.topic);
    }
    set imageLink(value) {
        this._imageLink = value;
    }
    get description() {
        return this._description;
    }
    set description(value) {
        this._description = value;
    }
    get title() {
        return this._title;
    }
    set title(value) {
        this._title = value;
    }
    get url() {
        return this._url;
    }
    set url(value) {
        this._url = value;
    }
    newsData;
    _url;
    _title;
    _description;
    _imageLink;
    _author;
    constructor(newsData, url, title, description, imageLink, author) {
        this.newsData = newsData;
        this._url = Utils.getCorrectHttpsUrl(url);
        this._title = Utils.checkStringLength(title, 256);
        this._description = Utils.checkStringLength(description, 4096);
        this._imageLink = Utils.getCorrectHttpsUrl(imageLink);
        this._author = author;
    }
    isComplete() {
        // check if urls are fine! that's important.
        return !!(Utils.getCorrectHttpsUrl(this.url)
            && Utils.checkStringLength(this.title, 256)
            && Utils.checkStringLength(this.description, 4096)
            && Utils.getCorrectHttpsUrl(this.imageLink));
    }
    /**
     * not used yet, may be useful later while working with multithreading
     * @return {number}
     */
    hashCode() {
        let string = this.toString();
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            hash = ((hash << 5) - hash) + code;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}
//# sourceMappingURL=ArticleMetadata.js.map