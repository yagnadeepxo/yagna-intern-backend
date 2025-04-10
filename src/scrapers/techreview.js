const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { extractTextFromHtml } = require('../utils/html');

const TECH_REVIEW_RSS_URL = 'https://www.technologyreview.com/feed/';

/**
 * Fetches and parses the MIT Technology Review RSS feed
 * @returns {Promise<Array>} Array of formatted articles
 */
async function fetchTechReviewNews() {
  try {
    console.log('Fetching MIT Technology Review RSS feed...');
    
    const response = await axios.get(TECH_REVIEW_RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const result = await parseStringPromise(response.data);
    
    if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
      throw new Error('Invalid RSS feed structure');
    }

    const items = result.rss.channel[0].item;
    console.log(`Found ${items.length} articles in the feed`);

    const articles = items.map(item => {
      // Extract content and clean it
      const content = item['content:encoded'] ? item['content:encoded'][0] : '';
      const description = item.description ? item.description[0] : '';
      const cleanContent = content ? extractTextFromHtml(content) : extractTextFromHtml(description);

      // Extract image URL from content if available
      let imageUrl = null;
      const imageMatch = content.match(/<img[^>]+src="([^">]+)"/);
      if (imageMatch) {
        imageUrl = imageMatch[1];
      }

      // Extract categories
      const categories = item.category ? 
        (Array.isArray(item.category) ? item.category.map(cat => cat.toString()) : [item.category.toString()]) 
        : [];

      // Format the article
      return {
        title: item.title[0],
        content: cleanContent,
        url: item.link[0],
        publishedDate: new Date(item.pubDate[0]).toISOString(),
        source: 'techreview',
        author: item['dc:creator'] ? item['dc:creator'][0] : null,
        categories: categories,
        imageUrl: imageUrl,
        metadata: {
          description: description,
          guid: item.guid ? item.guid[0]._ || item.guid[0] : null
        }
      };
    });

    return articles;
  } catch (error) {
    console.error('Error fetching MIT Technology Review:', error.message);
    throw error;
  }
}

module.exports = {
  fetchTechReviewNews
}; 