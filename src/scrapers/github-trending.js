const puppeteer = require('puppeteer');

const GITHUB_TRENDING_URL = 'https://github.com/trending';

/**
 * Fetches trending repositories from GitHub
 * @returns {Promise<Array>} Array of formatted repository data
 */
async function fetchTrendingRepos() {
  try {
    console.log('Launching browser to fetch GitHub trending repositories...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to GitHub trending page
    await page.goto(GITHUB_TRENDING_URL, { waitUntil: 'networkidle0' });
    
    // Wait for the repositories to load
    await page.waitForSelector('article.Box-row', { timeout: 10000 });

    // Extract repository information
    const repositories = await page.evaluate(() => {
      const repos = [];
      const repoElements = document.querySelectorAll('article.Box-row');

      repoElements.forEach(repo => {
        // Extract repository title and URL
        const titleElement = repo.querySelector('h2.h3 a');
        const relativeUrl = titleElement?.getAttribute('href');
        const fullUrl = relativeUrl ? `https://github.com${relativeUrl}` : null;
        const [owner, name] = (relativeUrl || '').slice(1).split('/');

        // Extract description
        const description = repo.querySelector('p')?.textContent?.trim();

        // Extract language
        const language = repo.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim();

        // Extract stars
        const starsText = repo.querySelector('a[href$="/stargazers"]')?.textContent?.trim();
        const stars = starsText ? parseInt(starsText.replace(/,/g, '')) : 0;

        // Extract forks
        const forksText = repo.querySelector('a[href$="/forks"]')?.textContent?.trim();
        const forks = forksText ? parseInt(forksText.replace(/,/g, '')) : 0;

        // Extract today's stars
        const todayStarsText = repo.querySelector('span.d-inline-block.float-sm-right')?.textContent?.trim();
        const todayStars = todayStarsText ? parseInt(todayStarsText.match(/\d+/)?.[0] || '0') : 0;

        // Extract contributors
        const contributorsImages = Array.from(repo.querySelectorAll('a[data-hovercard-type="user"] img'))
          .map(img => ({
            username: img.getAttribute('alt')?.replace('@', ''),
            avatar: img.getAttribute('src')
          }));

        if (fullUrl) {
          repos.push({
            title: `${owner}/${name}`,
            content: description || '',
            url: fullUrl,
            image_url: contributorsImages[0]?.avatar || null,
            source: 'github-trending',
            metadata: {
              owner,
              name,
              language,
              stars,
              forks,
              todayStars,
              contributors: contributorsImages
            }
          });
        }
      });

      return repos;
    });

    await browser.close();
    console.log(`Found ${repositories.length} trending repositories`);

    // Add published_date as current date since these are trending today
    const now = new Date();
    repositories.forEach(repo => {
      repo.published_date = now.toISOString();
    });

    return repositories;
  } catch (error) {
    console.error('Error fetching GitHub trending:', error.message);
    throw error;
  }
}

module.exports = {
  fetchTrendingRepos
}; 