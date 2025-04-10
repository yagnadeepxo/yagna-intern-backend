/**
 * Clean HTML content and remove CDATA tags
 * @param {string} content - Raw content to clean
 * @returns {string} - Cleaned content
 */
function sanitizeContent(content) {
  if (!content) return '';
  
  return content
    // Remove CDATA
    .replace(/\[CDATA\[|\]\]/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Fix HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Trim
    .trim();
}

module.exports = {
  sanitizeContent
}; 