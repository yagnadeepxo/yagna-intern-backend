const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { DOMParser } = require('@xmldom/xmldom');

puppeteer.use(StealthPlugin());

async function scrapeChinaTechNews() {
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
    const response = await page.goto('https://www.chinatechnews.com/feed', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Get the raw XML content
    const content = await response.text();
    
    // Clean up the content before parsing
    const cleanContent = content
      .replace(/<\?xml[^>]*\?>\s*/, '') // Remove XML declaration
      .replace(/<!\[CDATA\[/g, '') // Remove CDATA start markers
      .replace(/\]\]>/g, '') // Remove CDATA end markers
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remove style tags
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;)/g, '&amp;') // Encode unescaped ampersands
      .trim();

    // Add XML declaration back
    const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>' + cleanContent;

    const parser = new DOMParser();
    parser.onError = () => {}; // Ignore errors
    
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const items = xmlDoc.getElementsByTagName('item');
    const articles = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Extract title
        const title = item.getElementsByTagName('title')[0]?.textContent || '';

        // Extract description and clean HTML
        const description = item.getElementsByTagName('description')[0]?.textContent || '';
        const cleanDescription = description
          .replace(/<img[^>]*>/g, '') // Remove image tags
          .replace(/<[^>]*>/g, ' ') // Remove other HTML tags
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/comes via ChinaTechNews\.com\.$/, '') // Remove the footer text
          .trim();

        // Get other metadata
        const link = item.getElementsByTagName('link')[0]?.textContent;
        const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent;
        const creator = item.getElementsByTagName('dc:creator')[0]?.textContent;
        
        // Get categories
        const categoryNodes = item.getElementsByTagName('category');
        const categories = [];
        for (let j = 0; j < categoryNodes.length; j++) {
          const category = categoryNodes[j]?.textContent;
          if (category) {
            categories.push(category);
          }
        }

        // Extract image URL from description if it exists
        const imageMatch = description.match(/src="([^"]+)"/);
        const imageUrl = imageMatch ? imageMatch[1] : null;

        articles.push({
          title: title.trim(),
          content: cleanDescription,
          url: link,
          image_url: imageUrl,
          published_date: new Date(pubDate),
          source: 'ChinaTechNews',
          author: creator,
          categories: categories
        });
      } catch (itemError) {
        console.error('Error processing article:', itemError);
        continue;
      }
    }

    console.log(`Successfully parsed ${articles.length} articles from ChinaTechNews`);
    return articles;

  } catch (error) {
    console.error('Error scraping ChinaTechNews:', error);
    return [];
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeChinaTechNews }; 