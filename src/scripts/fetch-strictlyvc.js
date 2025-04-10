const { fetchStrictlyVCNews } = require('../scrapers/strictlyvc');
const { saveArticles } = require('../services/supabase');

async function fetchAndSaveStrictlyVCNews() {
  try {
    console.log('Starting StrictlyVC fetch...');
    
    // Fetch articles from RSS feed
    const articles = await fetchStrictlyVCNews();
    console.log(`Fetched ${articles.length} articles from StrictlyVC`);
    
    if (articles.length > 0) {
      // Save articles to database
      const savedArticles = await saveArticles(articles);
      console.log(`Successfully saved ${savedArticles.length} articles to database`);
      
      // Log any discrepancy
      if (savedArticles.length < articles.length) {
        console.log(`Note: ${articles.length - savedArticles.length} articles were not saved (likely duplicates)`);
      }

      // Log funding data statistics
      const fundingStats = articles.reduce((stats, article) => {
        if (article.metadata.fundingData) {
          stats.articlesWithFunding++;
          stats.massiveFundings += article.metadata.fundingData.massiveFundings.length;
          stats.bigFundings += article.metadata.fundingData.bigFundings.length;
          stats.smallerFundings += article.metadata.fundingData.smallerFundings.length;
        }
        return stats;
      }, {
        articlesWithFunding: 0,
        massiveFundings: 0,
        bigFundings: 0,
        smallerFundings: 0
      });

      console.log('Funding statistics:', fundingStats);
    } else {
      console.log('No new articles found to save');
    }
    
    console.log('Completed StrictlyVC fetch');
  } catch (error) {
    console.error('Error in StrictlyVC fetch script:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveStrictlyVCNews(); 