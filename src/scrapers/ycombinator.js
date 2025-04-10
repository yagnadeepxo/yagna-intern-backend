const puppeteer = require('puppeteer');

/**
 * Scrape startup news from Y Combinator News
 * @returns {Promise<Array>} - Array of article data objects
 */
async function scrape() {
  console.log('Starting Y Combinator scraper...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Enable request interception
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      // Block images and stylesheets to speed up loading
      if (['image', 'stylesheet'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Array of YC News sections to scrape
    const sections = [
      'https://news.ycombinator.com/newest',
      'https://news.ycombinator.com/show',
      'https://news.ycombinator.com/jobs'
    ];

    const allPosts = [];
    const startupKeywords = [
      'startup', 'fund', 'raise', 'series', 'venture', 'acquisition', 'acquired',
      'seed', 'angel', 'investment', 'launch', 'yc', 'y combinator', 'founder',
      'valuation', 'ipo', 'merger', 'startup', 'saas', 'tech', 'ai', 'ml',
      'raised', 'funding', 'round', 'million', 'billion'
    ];

    for (const url of sections) {
      try {
        console.log(`Processing ${url}...`);
        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for content to load
        await page.waitForSelector('.athing', { timeout: 10000 });

        const sectionPosts = await page.evaluate((keywords) => {
          const posts = [];
          const rows = document.querySelectorAll('.athing');

          rows.forEach(row => {
            try {
              // Get title and link
              const titleElement = row.querySelector('.titleline > a, .storylink');
              if (!titleElement) return;

              const title = titleElement.textContent.trim();
              const url = titleElement.href;

              // Check if post is startup-related
              const isStartupRelated = keywords.some(keyword =>
                title.toLowerCase().includes(keyword.toLowerCase())
              );

              if (!isStartupRelated) return;

              // Get metadata from subtext
              const subtext = row.nextElementSibling;
              if (!subtext) return;

              const score = subtext.querySelector('.score')?.textContent.split(' ')[0] || '0';
              const timeElement = subtext.querySelector('.age a');
              const publishedDate = timeElement?.getAttribute('title') || null;

              // Get comment count
              const links = Array.from(subtext.querySelectorAll('a'));
              const commentLink = links[links.length - 1];
              const commentCount = commentLink?.textContent.includes('comment') 
                ? parseInt(commentLink.textContent.split(' ')[0]) || 0
                : 0;

              // Get domain
              const siteElement = row.querySelector('.sitestr');
              const domain = siteElement?.textContent || new URL(url).hostname;

              posts.push({
                title,
                url,
                publishedDate,
                points: parseInt(score, 10),
                commentCount,
                domain,
                source: 'ycombinator'
              });
            } catch (err) {
              console.log('Error processing post:', err);
            }
          });

          return posts;
        }, startupKeywords);

        console.log(`Found ${sectionPosts.length} startup-related posts in ${url}`);
        allPosts.push(...sectionPosts);
      } catch (error) {
        console.error(`Error processing section ${url}:`, error.message);
        continue;
      }
    }

    // Sort posts by points to prioritize most relevant content
    allPosts.sort((a, b) => b.points - a.points);

    // Process top posts to get their content
    const postsToProcess = allPosts.slice(0, 15); // Process top 15 posts
    const articles = [];

    for (const post of postsToProcess) {
      try {
        console.log(`Processing post: ${post.title}`);

        // Skip certain domains that don't need content extraction
        const skipDomains = ['twitter.com', 'x.com', 'youtube.com', 'github.com', 't.co'];
        if (skipDomains.some(domain => post.url.includes(domain))) {
          articles.push({
            ...post,
            content: `[Link to ${post.domain}]`
          });
          continue;
        }

        try {
          await page.goto(post.url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });

          const content = await page.evaluate(() => {
            // Try multiple content extraction strategies
            const articleContent = 
              document.querySelector('article')?.innerText ||
              document.querySelector('.article-content')?.innerText ||
              document.querySelector('.post-content')?.innerText;

            if (articleContent) return articleContent;

            // Fallback: get text from paragraphs
            const paragraphs = Array.from(document.querySelectorAll('p'));
            const text = paragraphs
              .map(p => p.innerText.trim())
              .filter(text => text.length > 50) // Filter out short paragraphs
              .join('\n\n');

            return text;
          });

          if (content && content.length > 100) {
            articles.push({
              ...post,
              content
            });
            console.log(`Successfully extracted content for: ${post.title}`);
          } else {
            articles.push({
              ...post,
              content: `[No content extracted from ${post.domain}]`
            });
          }
        } catch (navError) {
          console.log(`Navigation error for ${post.url}: ${navError.message}`);
          articles.push({
            ...post,
            content: `[Error accessing content: ${navError.message}]`
          });
        }
      } catch (error) {
        console.error(`Error processing post ${post.url}:`, error.message);
        articles.push(post);
      }
    }

    console.log(`Y Combinator scraper completed. Processed ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('Error in Y Combinator scraper:', error);
    return [];
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

module.exports = {
  scrape
};