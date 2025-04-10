const { fetchTrendingRepos } = require('../scrapers/github-trending');
const { saveArticles } = require('../services/supabase');

async function fetchAndSaveGithubTrending() {
  try {
    console.log('Starting GitHub trending repositories fetch...');
    
    // Fetch trending repositories
    const repositories = await fetchTrendingRepos();
    console.log(`Fetched ${repositories.length} trending repositories from GitHub`);
    
    if (repositories.length > 0) {
      // Save repositories to database
      const savedRepos = await saveArticles(repositories);
      console.log(`Successfully saved ${savedRepos.length} repositories to database`);
      
      // Log any discrepancy
      if (savedRepos.length < repositories.length) {
        console.log(`Note: ${repositories.length - savedRepos.length} repositories were not saved (likely duplicates)`);
      }

      // Log repository statistics
      const stats = repositories.reduce((stats, repo) => {
        // Count by language
        const language = repo.metadata.language || 'Unknown';
        stats.languageCount[language] = (stats.languageCount[language] || 0) + 1;

        // Track star statistics
        stats.totalStars += repo.metadata.stars;
        stats.totalTodayStars += repo.metadata.todayStars;
        stats.totalForks += repo.metadata.forks;

        // Track repositories with most stars today
        stats.topRepositoriesToday.push({
          name: repo.title,
          stars: repo.metadata.todayStars
        });

        return stats;
      }, {
        languageCount: {},
        totalStars: 0,
        totalTodayStars: 0,
        totalForks: 0,
        topRepositoriesToday: []
      });

      // Sort and limit top repositories
      stats.topRepositoriesToday.sort((a, b) => b.stars - a.stars);
      stats.topRepositoriesToday = stats.topRepositoriesToday.slice(0, 5);

      console.log('Repository statistics:', stats);
    } else {
      console.log('No trending repositories found');
    }
    
    console.log('Completed GitHub trending fetch');
  } catch (error) {
    console.error('Error in GitHub trending fetch script:', error);
    process.exit(1);
  }
}

// Run the script
fetchAndSaveGithubTrending(); 