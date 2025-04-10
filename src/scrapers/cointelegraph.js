const axios = require('axios');
const xml2js = require('xml2js');
const { sanitizeContent } = require('../utils/contentCleaner');

const COINTELEGRAPH_RSS_URL = 'https://cointelegraph.com/rss';

/**
 * Fetch and parse articles from Cointelegraph RSS feed
 * @returns {Promise<Array>} Array of parsed articles
 */
async function fetchCointelegraphNews() {
  try {
    console.log('Fetching Cointelegraph RSS feed...');
    
    const response = await axios.get(COINTELEGRAPH_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      }
    });

    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(response.data);
    
    if (!result.rss?.channel?.item) {
      console.log('No items found in Cointelegraph RSS feed');
      return [];
    }

    // Ensure items is always an array
    const items = Array.isArray(result.rss.channel.item) 
      ? result.rss.channel.item 
      : [result.rss.channel.item];

    console.log(`Found ${items.length} articles in Cointelegraph feed`);

    const articles = items.map(item => {
      // Extract image URL from media:content or enclosure
      const imageUrl = item['media:content']?.$.url || 
                      item.enclosure?.$.url || 
                      null;

      // Extract author from dc:creator
      const author = item['dc:creator']?.replace('Cointelegraph by ', '') || null;

      // Clean content from HTML and CDATA
      const content = sanitizeContent(item.description);

      return {
        title: item.title?.replace(/\[CDATA\[|\]\]/g, '').trim(),
        content: content,
        url: item.link,
        published_date: new Date(item.pubDate).toISOString(),
        source: 'cointelegraph',
        image_url: imageUrl,
      };
    }).filter(article => article.title && article.content && article.url);

    console.log(`Successfully parsed ${articles.length} valid articles from Cointelegraph`);
    return articles;

  } catch (error) {
    console.error('Error fetching Cointelegraph news:', error);
    throw error;
  }
}

module.exports = {
  scrape: fetchCointelegraphNews
}; 