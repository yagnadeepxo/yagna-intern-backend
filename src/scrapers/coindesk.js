const axios = require('axios');
const xml2js = require('xml2js');
const { sanitizeContent } = require('../utils/contentCleaner');

const COINDESK_RSS_URL = 'https://www.coindesk.com/arc/outboundfeeds/rss';

/**
 * Fetch and parse articles from CoinDesk RSS feed
 * @returns {Promise<Array>} Array of parsed articles
 */
async function fetchCoindeskNews() {
  try {
    console.log('Fetching CoinDesk RSS feed...');
    
    const response = await axios.get(COINDESK_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    if (!result.rss?.channel?.item) {
      console.log('No items found in CoinDesk RSS feed');
      return [];
    }

    // Ensure items is always an array
    const items = Array.isArray(result.rss.channel.item) 
      ? result.rss.channel.item 
      : [result.rss.channel.item];

    console.log(`Found ${items.length} articles in CoinDesk feed`);

    const articles = items.map(item => {
      // Extract image URL from media:content
      const imageUrl = item['media:content']?.$.url || null;

      // Clean content from HTML and CDATA
      const content = sanitizeContent(item['content:encoded'] || item.description);

      return {
        title: item.title?.replace(/\[CDATA\[|\]\]/g, '').trim(),
        content: content,
        url: item.link,
        published_date: new Date(item.pubDate).toISOString(),
        source: 'coindesk',
        image_url: imageUrl,
      };
    }).filter(article => article.title && article.content && article.url);

    console.log(`Successfully parsed ${articles.length} valid articles from CoinDesk`);
    return articles;

  } catch (error) {
    console.error('Error fetching CoinDesk news:', error);
    throw error;
  }
}

module.exports = {
  scrape: fetchCoindeskNews
}; 