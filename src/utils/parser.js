/**
 * Extract currency amount from text
 * @param {string} text - Text containing currency
 * @returns {number|null} - Extracted amount or null
 */
function extractCurrencyAmount(text) {
    if (!text) return null;
    
    const regex = /\$(\d+(?:\.\d+)?)\s*(million|billion|m|b|k)?/i;
    const match = text.match(regex);
    
    if (!match) return null;
    
    let amount = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();
    
    if (unit === 'billion' || unit === 'b') {
      amount *= 1000000000;
    } else if (unit === 'million' || unit === 'm') {
      amount *= 1000000;
    } else if (unit === 'k') {
      amount *= 1000;
    }
    
    return amount;
  }
  
  /**
   * Extract funding stage from text
   * @param {string} text - Text to extract from
   * @returns {string|null} - Funding stage or null
   */
  function extractFundingStage(text) {
    if (!text) return null;
    
    const stageRegex = /series\s+([a-z])|seed|pre-seed|angel|ipo/i;
    const match = text.match(stageRegex);
    
    if (!match) return null;
    
    return match[0].toLowerCase();
  }
  
  /**
   * Clean HTML text
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  function cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  module.exports = {
    extractCurrencyAmount,
    extractFundingStage,
    cleanText
  };