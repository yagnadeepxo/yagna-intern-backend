const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrape() {
    console.log('Starting Fast Company scraper...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080'
        ],
        defaultViewport: { width: 1920, height: 1080 }
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log('Fetching Fast Company RSS feed...');
        const feedUrl = 'https://www.fastcompany.com/feed';
        await page.goto(feedUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Get and parse RSS content
        const rssContent = await page.evaluate(() => document.body.textContent);
        const items = [];

        try {
            const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g) || [];
            console.log(`Found ${itemMatches.length} articles in RSS feed`);
            
            for (const item of itemMatches) {
                try {
                    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
                    const linkMatch = item.match(/<link>(.*?)<\/link>/i);
                    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
                    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is);
                    const mediaMatch = item.match(/<media:content[^>]*url="([^"]*)"[^>]*>/i);
                    const categoryMatches = item.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/g);
                    const creatorMatch = item.match(/<dc:creator>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:creator>/i);

                    if (titleMatch && titleMatch[1] && linkMatch && linkMatch[1]) {
                        const categories = categoryMatches 
                            ? categoryMatches.map(cat => 
                                cat.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/i)[1].trim())
                            : [];

                        items.push({
                            title: titleMatch[1].trim(),
                            url: linkMatch[1].trim(),
                            published_date: pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : null,
                            content: descMatch ? descMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim() : null,
                            image_url: mediaMatch ? mediaMatch[1] : null,
                            categories: categories,
                            author: creatorMatch ? creatorMatch[1].trim() : null,
                            source: 'fastcompany'
                        });
                    }
                } catch (e) {
                    console.error('Error parsing item:', e.message);
                }

            }
        } catch (e) {
            console.error('Error parsing RSS:', e.message);
        }

        console.log(`Successfully parsed ${items.length} articles`);
        return items;

    } catch (error) {
        console.error('Error in Fast Company scraper:', error);
        return [];
    } finally {
        await browser.close();
        console.log('Browser closed');
    }
}

module.exports = {
    scrape
};  
