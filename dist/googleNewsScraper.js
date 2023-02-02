import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import { ArticleMetadata } from "./newsHandler.js";
export async function scrapeThis(url) {
    const puppeteerConfig = {
        headless: true,
    };
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    await page.setCookie({
        name: "CONSENT",
        value: `YES+cb.${new Date().toISOString().split('T')[0].replace(/-/g, '')}-04-p0.en-GB+FX+667`,
        domain: ".google.com"
    });
    await page.goto(url, { waitUntil: 'networkidle2' });
    let newUrl = page.url();
    let pageHtml = await page.content();
    await browser.close();
    const $ = cheerio.load(pageHtml);
    let title = $('meta[property="og:title"]').attr('content');
    let description = $('meta[property="og:description"]').attr('content');
    let imageLink = $('meta[property="og:image"]').attr('content');
    return new ArticleMetadata(newUrl, title, description, imageLink, "");
}
//# sourceMappingURL=googleNewsScraper.js.map