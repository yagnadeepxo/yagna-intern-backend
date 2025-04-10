require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { scrapeChinaTechNews } = require('../scrapers/chinatechnews');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fetchAndSaveArticles() {
  console.log('Starting ChinaTechNews article fetch...');

  try {
    // Fetch articles
    const articles = await scrapeChinaTechNews();
    console.log(`Found ${articles.length} articles from ChinaTechNews`);

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
      image_url: article.image_url,
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

    // Log statistics about categories
    const categoryStats = articles.reduce((acc, article) => {
      article.categories?.forEach(category => {
        acc[category] = (acc[category] || 0) + 1;
      });
      return acc;
    }, {});

    console.log('\nTop categories:');
    Object.entries(categoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} articles`);
      });

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

  console.log('\nChinaTechNews fetch process completed.');
}

// Run the script
fetchAndSaveArticles(); 