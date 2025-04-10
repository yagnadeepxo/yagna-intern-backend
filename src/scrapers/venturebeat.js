const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { extractTextFromHtml } = require('../utils/html');

const VENTUREBEAT_RSS_URL = 'https://venturebeat.com/feed/';

/**
 * Fetches and parses the VentureBeat RSS feed
 * @returns {Promise<Array>} Array of formatted articles
 */
async function fetchVentureBeatNews() {
  try {
    console.log('Fetching VentureBeat RSS feed...');
    
    const response = await axios.get(VENTUREBEAT_RSS_URL, {
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

      // Extract categories and normalize them
      const categories = item.category ? 
        (Array.isArray(item.category) ? item.category.map(cat => cat.toString()) : [item.category.toString()]) 
        : [];

      // Extract article type and topic
      const articleData = extractArticleData(cleanContent, categories);

      // Format the article
      return {
        title: item.title[0],
        content: cleanContent,
        url: item.link[0],
        publishedDate: new Date(item.pubDate[0]).toISOString(),
        source: 'venturebeat',
        author: item['dc:creator'] ? item['dc:creator'][0] : null,
        categories: categories,
        metadata: {
          description: description,
          guid: item.guid ? item.guid[0]._ || item.guid[0] : null,
          articleData: articleData
        }
      };
    });

    return articles;
  } catch (error) {
    console.error('Error fetching VentureBeat:', error.message);
    throw error;
  }
}

/**
 * Extracts article data including type, topic, and key information
 * @param {string} content - Article content
 * @param {Array} categories - Article categories
 * @returns {Object} Extracted article data
 */
function extractArticleData(content, categories) {
  if (!content) return null;

  // Initialize article data
  const articleData = {
    type: determineArticleType(categories),
    topic: determineArticleTopic(categories),
    keyPoints: extractKeyPoints(content),
    companies: extractCompanies(content),
    funding: extractFundingInfo(content),
    stats: extractStats(content)
  };

  return articleData;
}

/**
 * Determines the main type of the article
 * @param {Array} categories - Article categories
 * @returns {string} Article type
 */
function determineArticleType(categories) {
  const typeMapping = {
    'games': 'gaming',
    'game-development': 'gaming',
    'ai': 'ai',
    'artificial-intelligence': 'ai',
    'enterprise': 'enterprise',
    'security': 'security',
    'cloud': 'cloud',
    'mobile': 'mobile'
  };

  for (const category of categories) {
    const normalizedCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(typeMapping)) {
      if (normalizedCategory.includes(key)) {
        return value;
      }
    }
  }

  return 'general';
}

/**
 * Determines the main topic of the article
 * @param {Array} categories - Article categories
 * @returns {string} Article topic
 */
function determineArticleTopic(categories) {
  if (categories.length === 0) return null;
  return categories[0].toString();
}

/**
 * Extracts key points from the article content
 * @param {string} content - Article content
 * @returns {Array} Array of key points
 */
function extractKeyPoints(content) {
  const points = [];
  
  // Look for bullet points or numbered lists
  const bulletMatches = content.match(/[•\-\*]\s+([^\n]+)/g);
  if (bulletMatches) {
    points.push(...bulletMatches.map(point => point.trim().replace(/^[•\-\*]\s+/, '')));
  }

  // Look for sentences with key indicators
  const keyPhrases = ['announced', 'launched', 'revealed', 'introduced', 'released'];
  const sentences = content.split(/[.!?]+/).map(s => s.trim());
  
  for (const sentence of sentences) {
    if (keyPhrases.some(phrase => sentence.toLowerCase().includes(phrase))) {
      points.push(sentence);
    }
  }

  return points;
}

/**
 * Extracts mentioned companies from the content
 * @param {string} content - Article content
 * @returns {Array} Array of company names
 */
function extractCompanies(content) {
  const companies = new Set();
  
  // Look for company names in bold or quotes
  const boldMatches = content.match(/\*\*(.*?)\*\*/g);
  if (boldMatches) {
    boldMatches.forEach(match => companies.add(match.replace(/\*\*/g, '')));
  }

  // Look for common company indicators
  const companyIndicators = ['Inc.', 'Corp.', 'Ltd.', 'LLC'];
  const words = content.split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    if (companyIndicators.some(indicator => words[i].includes(indicator))) {
      const companyName = words[i-1] + ' ' + words[i];
      companies.add(companyName.trim());
    }
  }

  return Array.from(companies);
}

/**
 * Extracts funding information from the content
 * @param {string} content - Article content
 * @returns {Object|null} Funding information
 */
function extractFundingInfo(content) {
  const fundingMatch = content.match(/\$(\d+(?:\.\d+)?)\s*(million|billion|M|B)/i);
  if (!fundingMatch) return null;

  const amount = parseFloat(fundingMatch[1]);
  const unit = fundingMatch[2].toLowerCase();
  const multiplier = (unit === 'billion' || unit === 'b') ? 1000 : 1;

  return {
    amount: amount * multiplier,
    unit: unit.startsWith('b') ? 'billion' : 'million',
    rawText: fundingMatch[0]
  };
}

/**
 * Extracts statistical information from the content
 * @param {string} content - Article content
 * @returns {Array} Array of statistical data points
 */
function extractStats(content) {
  const stats = [];
  
  // Look for percentage statistics
  const percentMatches = content.match(/\d+(?:\.\d+)?%/g);
  if (percentMatches) {
    stats.push(...percentMatches);
  }

  // Look for numerical statistics
  const numberMatches = content.match(/(?:over|about|approximately|nearly)\s+\d+(?:,\d+)*\s+(?:users|customers|downloads|players|developers)/gi);
  if (numberMatches) {
    stats.push(...numberMatches);
  }

  return stats;
}

module.exports = {
  fetchVentureBeatNews
}; 