import * as Utils from "../utils.js";
export class ArticleMetadata {
    get resolvedUrl() {
        return this._resolvedUrl;
    }
    set resolvedUrl(value) {
        this._resolvedUrl = value;
    }
    get author() {
        return this._author;
    }
    set author(value) {
        this._author = value;
    }
    get imageLink() {
        let imageLink = Utils.getCorrectHttpsUrl(this._imageLink);
        if (!imageLink || this.isGoogleNews()) {
            imageLink = Utils.getTimageFromTopicValue(this.newsData.topic);
        }
        return imageLink;
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
    _resolvedUrl;
    _title;
    _description;
    _imageLink;
    _author;
    constructor(newsData, url, resolvedUrl, title, description, imageLink, author) {
        this.newsData = newsData;
        this._url = url;
        this._resolvedUrl = resolvedUrl;
        this._title = title;
        this._description = description;
        this._imageLink = imageLink;
        this._author = author;
    }
    isGoogleNews() {
        return Utils.isGoogleUrl(this.resolvedUrl);
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