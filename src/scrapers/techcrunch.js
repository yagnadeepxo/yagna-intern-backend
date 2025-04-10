const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function scrape() {
    console.log('Starting TechCrunch scraper...');

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

        console.log('Fetching TechCrunch RSS feed...');
        const feedUrl = 'https://techcrunch.com/feed/';
        await page.goto(feedUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Get and log raw RSS content for debugging
        const rssContent = await page.evaluate(() => document.body.textContent);
        console.log('Raw RSS content length:', rssContent.length);
        
        // Parse the RSS feed more robustly
        const items = [];
        try {
            const itemMatches = rssContent.match(/<item>[\s\S]*?<\/item>/g) || [];
            console.log(`Found ${itemMatches.length} raw items in RSS feed`);
            
            for (const item of itemMatches) {
                try {
                    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
                    const linkMatch = item.match(/<link>(.*?)<\/link>/i);
                    const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
                    const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is);

                    if (titleMatch && titleMatch[1] && linkMatch && linkMatch[1]) {
                        items.push({
                            title: titleMatch[1].trim(),
                            link: linkMatch[1].trim(),
                            pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
                            description: descMatch ? descMatch[1].replace(/<\/?[^>]+(>|$)/g, '').trim() : ''
                        });
                    }
                } catch (e) {
                    console.error('Error parsing item:', e.message);
                }
            }
        } catch (e) {
            console.error('Error parsing RSS:', e.message);
        }

        console.log(`Parsed ${items.length} valid items from RSS`);
        
        const articles = [];
        const startupKeywords = ['startup', 'fund', 'raise', 'series', 'venture', 'acquisition', 'seed', 
                              'angel', 'investment', 'launch', 'founder', 'valuation', 'ipo', 'merger', 
                              'saas', 'tech', 'ai', 'ml', 'funding', 'million', 'billion', 'round'];

        for (const item of items) {
            try {
                const isStartupRelated = startupKeywords.some(keyword => 
                    item.title.toLowerCase().includes(keyword.toLowerCase()) || 
                    item.description.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isStartupRelated) {
                    console.log(`Found startup-related article: ${item.title}`);
                    articles.push({
                        title: item.title,
                        url: item.link,
                        content: item.description,
                        publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : '',
                        source: 'techcrunch'
                    });
                }
            } catch (itemError) {
                console.error('Error processing item:', itemError.message);
            }
        }

        console.log(`🎉 TechCrunch scraper completed. Found ${articles.length} articles.`);
        return articles;
    } catch (feedError) {
        console.error('❌ Error fetching RSS feed:', feedError.message);
        return [];
    } finally {
        await browser.close();
        console.log('🛑 Browser closed');
    }
}

module.exports = {
    scrape
};