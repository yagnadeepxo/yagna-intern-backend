const { fetchCrunchbaseNews } = require('../scrapers/crunchbase');
const { saveArticles } = require('../services/supabase');

async function fetchAndSaveCrunchbaseNews() {
  try {
    console.log('Starting Crunchbase News fetch...');
    
    // Fetch articles from RSS feed
    const articles = await fetchCrunchbaseNews();
    console.log(`Fetched ${articles.length} articles from Crunchbase News`);
    
    if (articles.length > 0) {
      // Save articles to database
      const savedArticles = await saveArticles(articles);
      console.log(`Successfully saved ${savedArticles.length} articles to database`);
      
      // Log any discrepancy
      if (savedArticles.length < articles.length) {
        console.log(`Note: ${articles.length - savedArticles.length} articles were not saved (likely duplicates)`);
      }
    } else {
      console.log('No new articles found to save');
    }
    
    console.log('Completed Crunchbase News fetch');
  } catch (error) {
    console.error('Error in Crunchbase News fetch script:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveCrunchbaseNews(); 