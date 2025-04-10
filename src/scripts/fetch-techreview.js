const { fetchTechReviewNews } = require('../scrapers/techreview');
const { saveArticles } = require('../services/supabase');

async function fetchAndSaveTechReviewNews() {
  try {
    console.log('Starting MIT Technology Review fetch...');
    
    // Fetch articles from RSS feed
    const articles = await fetchTechReviewNews();
    console.log(`Fetched ${articles.length} articles from MIT Technology Review`);
    
    if (articles.length > 0) {
      // Save articles to database
      const savedArticles = await saveArticles(articles);
      console.log(`Successfully saved ${savedArticles.length} articles to database`);
      
      // Log any discrepancy
      if (savedArticles.length < articles.length) {
        console.log(`Note: ${articles.length - savedArticles.length} articles were not saved (likely duplicates)`);
      }

      // Log categories found
      const categories = new Set(articles.flatMap(article => article.categories));
      console.log('Categories found:', Array.from(categories));
    } else {
      console.log('No new articles found to save');
    }
    
    console.log('Completed MIT Technology Review fetch');
  } catch (error) {
    console.error('Error in MIT Technology Review fetch script:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveTechReviewNews(); 