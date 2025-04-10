require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { scrapeHackerNews } = require('../scrapers/hackernews');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fetchAndSaveArticles() {
  console.log('Starting Hacker News Show article fetch...');

  try {
    // Fetch articles
    const articles = await scrapeHackerNews();
    console.log(`Found ${articles.length} articles from Hacker News Show`);

    if (articles.length === 0) {
      console.log('No articles found to save.');
      return;
    }

    // Log a sample article for debugging
    console.log('\nSample article structure:');
    console.log(JSON.stringify(articles[0], null, 2));

    // Prepare articles for insertion
    const articlesForDb = articles.map(article => ({
      title: article.title,
      content: article.content,
      url: article.url,
      published_date: article.published_date,
      source: article.source,
      scraped_at: new Date()
    }));

    // Insert articles into database
    const { data, error } = await supabase
      .from('startup_articles')
      .upsert(articlesForDb, {
        onConflict: 'url',
        ignoreDuplicates: true
      });

    if (error) {
      throw error;
    }

    // Get statistics about saved articles
    const savedCount = data ? data.length : 0;
    console.log(`\nSuccessfully saved ${savedCount} new articles`);

    // Log statistics about authors
    const authorStats = articles.reduce((acc, article) => {
      if (article.author) {
        acc[article.author] = (acc[article.author] || 0) + 1;
      }
      return acc;
    }, {});

    console.log('\nTop contributors:');
    Object.entries(authorStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([author, count]) => {
        console.log(`${author}: ${count} articles`);
      });

  } catch (error) {
    console.error('Error in fetchAndSaveArticles:', error);
  }

  console.log('\nHacker News Show fetch process completed.');
}

// Run the script
fetchAndSaveArticles(); 