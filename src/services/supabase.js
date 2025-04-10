const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Save article data to Supabase
 * @param {Array} articles - Array of article objects
 * @returns {Promise} - Supabase response
 */
async function saveArticles(articles) {
  try {
    // Deduplicate articles based on URL
    const uniqueArticles = Array.from(
      new Map(articles.map(article => [article.url, article])).values()
    );

    console.log(`Deduplicating articles: ${articles.length} -> ${uniqueArticles.length}`);

    // Format articles to match our schema
    const formattedArticles = uniqueArticles.map(article => ({
      title: article.title,
      content: article.content || null,
      url: article.url,
      image_url: article.imageUrl || null,
      published_date: article.publishedDate || new Date().toISOString(),
      source: article.source,
      scraped_at: new Date().toISOString()
    }));

    // Split articles into smaller batches to avoid potential issues
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < formattedArticles.length; i += batchSize) {
      batches.push(formattedArticles.slice(i, i + batchSize));
    }

    console.log(`Processing ${batches.length} batches of articles...`);

    const results = [];
    for (const batch of batches) {
      try {
        const { data, error } = await supabase
          .from('startup_articles')
          .upsert(batch, {
            onConflict: 'url',
            ignoreDuplicates: true // Changed to true to skip duplicates instead of updating
          });

        if (error) {
          console.error('Error saving batch to Supabase:', error);
          throw error;
        }

        if (data) {
          results.push(...data);
        }
      } catch (batchError) {
        console.error('Error processing batch:', batchError);
        // Continue with next batch instead of failing completely
      }
    }

    console.log(`Successfully processed ${results.length} articles`);
    return results;
  } catch (error) {
    console.error('Error in saveArticles:', error);
    throw error;
  }
}

/**
 * Check if an article already exists in the database
 * @param {string} url - URL of the article
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function articleExists(url) {
  try {
    const { data, error } = await supabase
      .from('startup_articles')
      .select('id')
      .eq('url', url)
      .maybeSingle();

    if (error) {
      console.error('Error checking article existence:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error in articleExists:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  saveArticles,
  articleExists
};