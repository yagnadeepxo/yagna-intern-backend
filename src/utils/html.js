/**
 * Sanitizes HTML content by removing unwanted tags and elements
 * @param {string} html - Raw HTML content
 * @returns {string} - Cleaned HTML content
 */
function sanitizeHtml(html) {
  if (!html) return '';
  
  // Remove script and style tags
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove image metadata
  clean = clean.replace(/<img[^>]*class="ss-hidden-pin-image"[^>]*>/g, '');
  
  // Convert common HTML entities
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&quot;/g, '"');
  clean = clean.replace(/&#39;/g, "'");
  
  return clean;
}

/**
 * Extracts plain text from HTML content
 * @param {string} html - HTML content
 * @returns {string} - Plain text content
 */
function extractTextFromHtml(html) {
  if (!html) return '';
  
  // First sanitize the HTML
  let text = sanitizeHtml(html);
  
  // Convert paragraph and break tags to newlines
  text = text.replace(/<p>/gi, '\n\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Fix spacing issues
  text = text.replace(/\n\s*\n/g, '\n\n');  // Remove extra blank lines
  text = text.replace(/[ \t]+/g, ' ');      // Remove extra spaces
  text = text.trim();                       // Remove leading/trailing whitespace
  
  return text;
}

module.exports = {
  sanitizeHtml,
  extractTextFromHtml
}; 