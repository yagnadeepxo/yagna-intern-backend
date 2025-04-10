const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const { extractTextFromHtml } = require('../utils/html');

const STRICTLY_VC_RSS_URL = 'https://strictlyvc.com/feed/';

/**
 * Fetches and parses the StrictlyVC RSS feed
 * @returns {Promise<Array>} Array of formatted articles
 */
async function fetchStrictlyVCNews() {
  try {
    console.log('Fetching StrictlyVC RSS feed...');
    
    const response = await axios.get(STRICTLY_VC_RSS_URL, {
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

      // Parse funding data from content
      const fundingData = extractFundingData(cleanContent);

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
        source: 'strictlyvc',
        author: item['dc:creator'] ? item['dc:creator'][0] : 'StrictlyVC',
        categories: categories,
        metadata: {
          description: description,
          guid: item.guid ? item.guid[0]._ || item.guid[0] : null,
          fundingData: fundingData
        }
      };
    });

    return articles;
  } catch (error) {
    console.error('Error fetching StrictlyVC:', error.message);
    throw error;
  }
}

/**
 * Extracts funding information from article content
 * @param {string} content - Article content
 * @returns {Object|null} Extracted funding data
 */
function extractFundingData(content) {
  if (!content) return null;

  // Look for funding sections
  const massiveFundingMatch = content.match(/## Massive Fundings([\s\S]*?)(?=##|$)/i);
  const bigFundingMatch = content.match(/## Big-But-Not-Crazy-Big Fundings([\s\S]*?)(?=##|$)/i);
  const smallerFundingMatch = content.match(/## Smaller Fundings([\s\S]*?)(?=##|$)/i);

  const fundingData = {
    massiveFundings: massiveFundingMatch ? parseFundingSection(massiveFundingMatch[1]) : [],
    bigFundings: bigFundingMatch ? parseFundingSection(bigFundingMatch[1]) : [],
    smallerFundings: smallerFundingMatch ? parseFundingSection(smallerFundingMatch[1]) : []
  };

  return Object.values(fundingData).some(arr => arr.length > 0) ? fundingData : null;
}

/**
 * Parses a funding section to extract company and funding details
 * @param {string} section - Section content
 * @returns {Array} Array of funding entries
 */
function parseFundingSection(section) {
  const entries = section.split('\n\n').filter(Boolean);
  return entries.map(entry => {
    // Try to extract company name, amount, and investors
    const companyMatch = entry.match(/\*\*(.*?)\*\*/);
    const amountMatch = entry.match(/\$(\d+(?:\.\d+)?)\s*(million|billion)/i);
    const investorsMatch = entry.match(/from\s+\*\*(.*?)\*\*/);

    return {
      company: companyMatch ? companyMatch[1] : null,
      amount: amountMatch ? parseFloat(amountMatch[1]) * (amountMatch[2].toLowerCase() === 'billion' ? 1000 : 1) : null,
      investors: investorsMatch ? investorsMatch[1].split(/\*\*,\s*\*\*/).map(i => i.trim()) : [],
      rawText: entry.trim()
    };
  }).filter(entry => entry.company || entry.amount);
}

module.exports = {
  fetchStrictlyVCNews
}; 