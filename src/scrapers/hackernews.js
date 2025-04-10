const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { DOMParser } = require('@xmldom/xmldom');

puppeteer.use(StealthPlugin());

async function scrapeHackerNews() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-web-security'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() === 'document') {
        req.continue();
      } else {
        req.abort();
      }
    });

    // Fetch the RSS feed
    await page.goto('https://hnrss.org/show', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const content = await page.content();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');
    
    const items = xmlDoc.getElementsByTagName('item');
    const articles = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Extract CDATA content from title
      const titleNode = item.getElementsByTagName('title')[0];
      const titleCData = titleNode.firstChild;
      const title = titleCData ? titleCData.data.trim() : '';

      // Extract CDATA content from description
      const descNode = item.getElementsByTagName('description')[0];
      const descCData = descNode.firstChild;
      const description = descCData ? descCData.data.trim() : '';

      // Get other metadata
      const link = item.getElementsByTagName('link')[0]?.textContent;
      const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent;
      const creator = item.getElementsByTagName('dc:creator')[0]?.textContent;

      // Clean up the description by removing HTML tags
      const cleanDescription = description.replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      articles.push({
        title: title.replace('Show HN: ', '').trim(),
        content: cleanDescription,
        url: link,
        published_date: new Date(pubDate),
        source: 'Hacker News Show',
        author: creator
      });
    }

    console.log(`Successfully parsed ${articles.length} articles from Hacker News Show`);
    return articles;

  } catch (error) {
    console.error('Error scraping Hacker News:', error);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeHackerNews }; 