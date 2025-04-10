const { fetchVentureBeatNews } = require('../scrapers/venturebeat');
const { saveArticles } = require('../services/supabase');

async function fetchAndSaveVentureBeatNews() {
  try {
    console.log('Starting VentureBeat fetch...');
    
    // Fetch articles from RSS feed
    const articles = await fetchVentureBeatNews();
    console.log(`Fetched ${articles.length} articles from VentureBeat`);
    
    if (articles.length > 0) {
      // Save articles to database
      const savedArticles = await saveArticles(articles);
      console.log(`Successfully saved ${savedArticles.length} articles to database`);
      
      // Log any discrepancy
      if (savedArticles.length < articles.length) {
        console.log(`Note: ${articles.length - savedArticles.length} articles were not saved (likely duplicates)`);
      }

      // Log article statistics
      const stats = articles.reduce((stats, article) => {
        // Count by type
        const type = article.metadata.articleData?.type || 'unknown';
        stats.typeCount[type] = (stats.typeCount[type] || 0) + 1;

        // Count articles with various data points
        if (article.metadata.articleData?.companies?.length > 0) {
          stats.withCompanies++;
        }
        if (article.metadata.articleData?.funding) {
          stats.withFunding++;
        }
        if (article.metadata.articleData?.stats?.length > 0) {
          stats.withStats++;
        }
        if (article.metadata.articleData?.keyPoints?.length > 0) {
          stats.withKeyPoints++;
        }

        return stats;
      }, {
        typeCount: {},
        withCompanies: 0,
        withFunding: 0,
        withStats: 0,
        withKeyPoints: 0
      });

      console.log('Article statistics:', stats);

      // Log unique companies mentioned
      const allCompanies = new Set(
        articles.flatMap(article => article.metadata.articleData?.companies || [])
      );
      if (allCompanies.size > 0) {
        console.log('Companies mentioned:', Array.from(allCompanies));
      }
    } else {
      console.log('No new articles found to save');
    }
    
    console.log('Completed VentureBeat fetch');
  } catch (error) {
    console.error('Error in VentureBeat fetch script:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveVentureBeatNews(); 