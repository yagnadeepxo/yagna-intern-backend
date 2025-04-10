require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { scrape: scrapeCointelegraph } = require('../scrapers/cointelegraph');
const { scrape: scrapeCoindesk } = require('../scrapers/coindesk');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndSaveCryptoNews() {
  console.log('Starting to fetch crypto news...');
  
  try {
    // Fetch from Cointelegraph
    console.log('\n=== Fetching from Cointelegraph ===');
    const cointelegraphArticles = await scrapeCointelegraph();
    console.log(`Found ${cointelegraphArticles.length} articles from Cointelegraph`);

    // Fetch from CoinDesk
    console.log('\n=== Fetching from CoinDesk ===');
    const coindeskArticles = await scrapeCoindesk();
    console.log(`Found ${coindeskArticles.length} articles from CoinDesk`);

    // Combine all articles
    const allArticles = [...cointelegraphArticles, ...coindeskArticles];
    console.log(`\nTotal articles found: ${allArticles.length}`);

    // Prepare articles for insertion
    const articlesForDb = allArticles.map(article => ({
      title: article.title,
      content: article.content,
      url: article.url,
      image_url: article.image_url,
      published_date: article.published_date,
      source: article.source,
      scraped_at: new Date().toISOString()
    }));

    // Save to Supabase with conflict handling
    const { data, error } = await supabase
      .from('startup_articles')
      .upsert(articlesForDb, {
        onConflict: 'url',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error saving articles:', error);
      return;
    }

    // Log statistics
    console.log('\n=== Article Statistics ===');
    console.log('Articles by source:');
    console.log('- Cointelegraph:', cointelegraphArticles.length);
    console.log('- CoinDesk:', coindeskArticles.length);

    // Log categories and authors
    const categories = new Set();
    const authors = {};
    allArticles.forEach(article => {
      if (article.metadata?.category) {
        if (Array.isArray(article.metadata.category)) {
          article.metadata.category.forEach(cat => categories.add(cat));
        } else {
          categories.add(article.metadata.category);
        }
      }
      if (article.author) {
        authors[article.author] = (authors[article.author] || 0) + 1;
      }
    });

    console.log('\nCategories found:', Array.from(categories).join(', '));
    console.log('\nTop authors:');
    Object.entries(authors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([author, count]) => {
        console.log(`- ${author}: ${count} articles`);
      });

    // Log sample article for debugging
    if (allArticles.length > 0) {
      console.log('\nSample article structure:');
      const sample = allArticles[0];
      console.log(JSON.stringify({
        title: sample.title,
        url: sample.url,
        source: sample.source,
        has_content: !!sample.content,
        has_image: !!sample.image_url,
        published_date: sample.published_date
      }, null, 2));
    }

    console.log('\nCrypto news fetch completed successfully!');
    
  } catch (error) {
    console.error('Error fetching crypto news:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveCryptoNews(); 