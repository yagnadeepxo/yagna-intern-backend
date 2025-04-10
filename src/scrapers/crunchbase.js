const axios = require('axios');
const { parseStringPromise } = require('xml2js');

const CRUNCHBASE_RSS_URL = 'https://news.crunchbase.com/feed/';

/**
 * Fetches and parses the Crunchbase News RSS feed
 * @returns {Promise<Array>} Array of formatted articles
 */
async function fetchCrunchbaseNews() {
  try {
    console.log('Fetching Crunchbase News RSS feed...');
    
    const response = await axios.get(CRUNCHBASE_RSS_URL);
    const result = await parseStringPromise(response.data);
    
    if (!result.rss || !result.rss.channel || !result.rss.channel[0].item) {
      throw new Error('Invalid RSS feed structure');
    }

    const items = result.rss.channel[0].item;
    console.log(`Found ${items.length} articles in the feed`);

    const articles = items.map(item => {
      // Extract categories
      const categories = item.category ? item.category.map(cat => cat[0]) : [];
      
      // Extract content and clean HTML
      const content = item['content:encoded'] ? item['content:encoded'][0] : '';
      const cleanContent = sanitizeHtml(content);
      
      // Format the article
      return {
        title: item.title[0],
        content: cleanContent,
        url: item.link[0],
        publishedDate: new Date(item.pubDate[0]).toISOString(),
        source: 'crunchbase',
        author: item['dc:creator'] ? item['dc:creator'][0] : null,
        categories: categories,
        imageUrl: item.image ? item.image[0] : null,
        metadata: {
          description: item.description ? item.description[0] : null,
          guid: item.guid ? item.guid[0]._ : null
        }
      };
    });

    return articles;
  } catch (error) {
    console.error('Error fetching Crunchbase News:', error.message);
    throw error;
  }
}

/**
 * Sanitizes HTML content and extracts clean text
 * @param {string} html - Raw HTML content
 * @returns {string} - Cleaned text content
 */
function sanitizeHtml(html) {
  // Remove script and style tags
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML tags but preserve paragraphs and line breaks
  clean = clean.replace(/<p>/gi, '\n\n');
  clean = clean.replace(/<br\s*\/?>/gi, '\n');
  clean = clean.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&quot;/g, '"');
  
  // Remove extra whitespace
  clean = clean.replace(/\n\s*\n/g, '\n\n');
  clean = clean.trim();
  
  return clean;
}

module.exports = {
  fetchCrunchbaseNews
}; 