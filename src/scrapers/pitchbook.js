const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer');

puppeteer.use(StealthPlugin());

async function scrape() {
    console.log('🚀 Starting PitchBook scraper...');

    const browser = await puppeteer.launch({
        headless: false, // Use visible browser for debugging
        executablePath: executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080',
            '--disable-blink-features=AutomationControlled'
        ],
        defaultViewport: null // Remove fixed viewport
    });

    try {
        const page = await browser.newPage();
        
        // Enhanced anti-detection measures
        await page.evaluateOnNewDocument(() => {
            // Overwrite the 'webdriver' property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            // Add more realistic plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = {
                        length: 5,
                        item: () => { return null; },
                        namedItem: () => { return null; },
                        refresh: () => {}
                    };
                    for (let i = 0; i < 5; i++) {
                        plugins[i] = {
                            name: `Plugin ${i+1}`,
                            filename: `plugin${i+1}.dll`,
                            description: `Dummy plugin ${i+1}`
                        };
                    }
                    return plugins;
                }
            });
            
            // Add realistic languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en', 'es']
            });
            
            // Add a mock WebGL renderer
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris Pro Graphics';
                }
                return getParameter.apply(this, arguments);
            };
        });
        
        // Set more realistic viewport with random dimensions
        await page.setViewport({
            width: 1900 + Math.floor(Math.random() * 100),
            height: 1000 + Math.floor(Math.random() * 100)
        });
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        console.log('🌐 Navigating to PitchBook news page...');
        await page.goto('https://pitchbook.com/news/articles', {
            waitUntil: 'networkidle2',
            timeout: 90000 // Allow more time for loading
        });
        
        // Check for and handle login screens
        await handleLogin(page);
        
        // Introduce human-like behavior
        await humanInteraction(page);

        console.log('⏳ Waiting for content...');
        
        // Wait for content to load
        await page.waitForSelector('body', { timeout: 30000 });
            
        // Add a delay to ensure JavaScript rendering completes
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Scroll down to load lazy-loaded content
        await autoScroll(page);

        // Extract article URLs from the main page - this is specifically looking for article pages
        console.log('📑 Extracting article links...');
        const articleLinks = await extractArticleLinks(page);
        console.log(`✅ Found ${articleLinks.length} article links`);
        
        if (articleLinks.length === 0) {
            console.log('⚠️ No article links found! Debugging page content...');
            // Take a screenshot for debugging
            await page.screenshot({ path: 'debug-pitchbook.png' });
            
            // Try browsing category pages
            console.log('Trying to find articles through category pages...');
            const categoryLinks = [
                'https://pitchbook.com/news/articles',
                'https://pitchbook.com/news/venture-capital',
                'https://pitchbook.com/news/private-equity',
                'https://pitchbook.com/news/technology'
            ];
            
            for (const categoryUrl of categoryLinks) {
                console.log(`Trying category page: ${categoryUrl}`);
                await page.goto(categoryUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                await autoScroll(page);
                
                const categoryArticles = await extractArticleLinks(page);
                if (categoryArticles.length > 0) {
                    console.log(`Found ${categoryArticles.length} articles in category ${categoryUrl}`);
                    articleLinks.push(...categoryArticles);
                    break;
                }
            }
        }
        
        // Use a Set to remove duplicates
        const uniqueLinks = [...new Set(articleLinks)];
        console.log(`Found ${uniqueLinks.length} unique article links after deduplication`);
        
        // Limit the number of articles to process to avoid overloading
        const linksToProcess = uniqueLinks.slice(0, 5); // Process up to 5 articles
        console.log(`🔍 Will process ${linksToProcess.length} articles in detail`);
        
        // Process each article
        const articles = [];
        for (let i = 0; i < linksToProcess.length; i++) {
            const articleUrl = linksToProcess[i];
            console.log(`📄 Processing article ${i+1}/${linksToProcess.length}: ${articleUrl}`);
            
            try {
                // Navigate to the article page
                await page.goto(articleUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 60000
                });
                
                // Check for login walls again
                await handleLogin(page);
                
                // Wait for page to load fully
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // First try to get content using evaluate
                const article = await extractArticleContent(page, articleUrl);
                
                // If we didn't get good content, try direct DOM extraction
                if (!article.content || article.content.length < 100) {
                    console.log('Standard extraction failed, trying direct DOM methods...');
                    
                    // Get the article content using direct DOM manipulation
                    const directContent = await directContentExtraction(page);
                    
                    // Update the article object with any additional content found
                    if (directContent.content && directContent.content.length > 0) {
                        article.content = directContent.content;
                    }
                    if (!article.title && directContent.title) {
                        article.title = directContent.title;
                    }
                    if (!article.date && directContent.date) {
                        article.date = directContent.date;
                    }
                    if (!article.author && directContent.author) {
                        article.author = directContent.author;
                    }
                    if (!article.image && directContent.image) {
                        article.image = directContent.image;
                    }
                }
                
                // If we still don't have content, try one more extraction method
                if (!article.content || article.content.length < 100) {
                    console.log('Direct DOM extraction failed, trying HTML parsing...');
                    const htmlContent = await extractFullHtml(page);
                    if (htmlContent && htmlContent.length > 0) {
                        article.content = htmlContent;
                    }
                }
                
                // Make sure we have a title
                if (!article.title) {
                    article.title = await page.title();
                }
                
                // Log success or failure
                if (article.content && article.title) {
                    articles.push(article);
                    console.log(`✅ Successfully extracted article: "${article.title.substring(0, 30)}..."`);
                    console.log(`Content length: ${article.content.length} characters`);
                } else {
                    console.log('❌ Failed to extract valid article content');
                }
                
                // Add a delay between requests
                await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
            } catch (error) {
                console.error(`❌ Error processing article ${articleUrl}: ${error.message}`);
            }
        }

        // Process articles to ensure all required fields are present
        const processedArticles = articles.map(article => ({
            title: article.title || 'PitchBook Article',
            url: article.url || '',
            content: article.content || 'No content extracted',
            imageUrl: article.image || null,
            publishedDate: article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
            source: 'pitchbook', // Ensure source is always set
            author: article.author || null
        })).filter(article => article.url); // Filter out invalid articles

        console.log(`🎉 Processed ${processedArticles.length} valid articles with full content`);
        
        return processedArticles;
    } catch (error) {
        console.error('❌ Scraping failed:', error.message);
        return [];
    } finally {
        await browser.close();
        console.log('🛑 Browser closed');
    }
}

// Extract the full HTML of the article for parsing
async function extractFullHtml(page) {
    try {
        // Try to extract just the article content HTML
        const articleHtml = await page.evaluate(() => {
            const articleSelectors = [
                'article',
                '.article-content',
                '.article-body',
                '.pb-article',
                'main'
            ];
            
            for (const selector of articleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element.innerHTML;
                }
            }
            
            // If we can't find a specific article container, get the body content
            return document.body.innerHTML;
        });
        
        // Get just the text content without HTML tags
        const textContent = await page.evaluate((html) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Remove script tags, style tags, and other non-content elements
            const scripts = tempDiv.querySelectorAll('script, style, nav, footer, header, aside');
            scripts.forEach(script => script.remove());
            
            // Get all paragraph text
            const paragraphs = Array.from(tempDiv.querySelectorAll('p'));
            return paragraphs.map(p => p.textContent.trim()).filter(t => t.length > 0).join('\n\n');
        }, articleHtml);
        
        return textContent;
    } catch (error) {
        console.error('Error extracting HTML:', error);
        return '';
    }
}

// Extract content directly from the DOM
async function directContentExtraction(page) {
    try {
        // Get content directly from the page
        return await page.evaluate(() => {
            // Get title
            let title = '';
            const titleElement = document.querySelector('h1');
            if (titleElement) {
                title = titleElement.textContent.trim();
            }
            
            // Get content paragraphs
            let content = '';
            const paragraphs = document.querySelectorAll('p');
            if (paragraphs.length > 0) {
                content = Array.from(paragraphs)
                    .map(p => p.textContent.trim())
                    .filter(text => text.length > 30) // Only include substantial paragraphs
                    .join('\n\n');
            }
            
            // Get date
            let date = '';
            const dateElement = document.querySelector('time') || 
                                document.querySelector('.date') || 
                                document.querySelector('[datetime]');
            if (dateElement) {
                date = dateElement.textContent.trim() || dateElement.getAttribute('datetime');
            }
            
            // Get author
            let author = '';
            const authorElement = document.querySelector('.author') || 
                                  document.querySelector('.byline');
            if (authorElement) {
                author = authorElement.textContent.trim();
            }
            
            // Get image
            let image = '';
            const imageElement = document.querySelector('article img') || 
                                 document.querySelector('.featured-image img') ||
                                 document.querySelector('main img');
            if (imageElement) {
                image = imageElement.src;
            }
            
            return { title, content, date, author, image };
        });
    } catch (error) {
        console.error('Error in direct content extraction:', error);
        return { title: '', content: '', date: '', author: '', image: '' };
    }
}

// Check for and handle login screens
async function handleLogin(page) {
    const isLoginPage = await page.evaluate(() => {
        // Check for common login elements
        return document.querySelector('form[action*="login"]') !== null ||
               document.querySelector('input[type="password"]') !== null ||
               document.querySelector('button[type="submit"]') !== null && 
               (document.body.innerText.includes('Login') || 
                document.body.innerText.includes('Sign in'));
    });
    
    if (isLoginPage) {
        console.log('⚠️ Login page detected! The site may require authentication.');
        console.log('Please log in manually in the browser window.');
        
        try {
            // Wait for navigation after login
            await page.waitForNavigation({ timeout: 60000 });
            console.log('✅ Login successful or page navigated.');
        } catch (error) {
            console.log('⚠️ Timeout waiting for login. Continuing anyway...');
        }
    }
}

// Simulate human-like interactions with the page
async function humanInteraction(page) {
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
        const x = 100 + Math.floor(Math.random() * 800);
        const y = 100 + Math.floor(Math.random() * 600);
        await page.mouse.move(x, y, { steps: 10 });
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    }
    
    // Small, natural scrolls
    await page.evaluate(() => {
        window.scrollBy(0, 300);
        return new Promise(resolve => setTimeout(resolve, 1000));
    });
}

// Scroll down the page to trigger lazy loading
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
        
        // Wait for any new content to load after scrolling
        return new Promise(resolve => setTimeout(resolve, 2000));
    });
}

// Extract article links from the news page
async function extractArticleLinks(page) {
    return page.evaluate(() => {
        // Try to find article links - specifically looking for article pages, not category pages
        const articleLinkPatterns = [
            '/news/articles/',
            '/news/article/',
            '/news/story/',
            '/news/press-release/'
        ];
        
        // Get all links on the page
        const allLinks = Array.from(document.querySelectorAll('a[href]'))
            .map(el => el.href)
            .filter(href => {
                // Check if the href contains any of our article patterns
                return articleLinkPatterns.some(pattern => href.includes(pattern)) &&
                       !href.includes('#');
            });
            
        console.log(`Found ${allLinks.length} potential article links`);
        
        // If we didn't find article links, look for any links that might be article cards
        if (allLinks.length === 0) {
            const cardElements = document.querySelectorAll('.card, .article-card, .news-card, .news-item');
            console.log(`Found ${cardElements.length} potential article cards`);
            
            const cardLinks = Array.from(cardElements)
                .map(card => {
                    const anchor = card.querySelector('a[href]');
                    return anchor ? anchor.href : null;
                })
                .filter(href => href !== null);
                
            return cardLinks;
        }
        
        // Remove duplicates and return
        return [...new Set(allLinks)];
    });
}

// Extract full content from an individual article page
async function extractArticleContent(page, url) {
    try {
        // First, take a screenshot for debugging
        await page.screenshot({ path: `article-page-${Date.now()}.png` });
        
        // Log the page title
        const pageTitle = await page.title();
        console.log(`Page title: ${pageTitle}`);
        
        // Get content using a wide range of selectors
        return await page.evaluate((articleUrl) => {
            // Function to get text from elements matching a selector
            const getTextContent = (selectors) => {
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements && elements.length > 0) {
                        const textArray = Array.from(elements)
                            .map(el => el.textContent.trim())
                            .filter(text => text.length > 0);
                            
                        const text = textArray.join('\n\n');
                        if (text && text.length > 0) {
                            console.log(`Found content with selector: ${selector}`);
                            return text;
                        }
                    }
                }
                return '';
            };
            
            // Function to get text from a single element
            const getSingleText = (selectors) => {
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent) {
                        const text = element.textContent.trim();
                        if (text) {
                            console.log(`Found single text with selector: ${selector}`);
                            return text;
                        }
                    }
                }
                return '';
            };
            
            // Get main image
            const getMainImage = () => {
                const imgSelectors = [
                    'article img', 
                    '.article-header img',
                    'header img',
                    '.featured-image img',
                    'main img',
                    '.article img:first-of-type'
                ];
                
                for (const selector of imgSelectors) {
                    const img = document.querySelector(selector);
                    if (img && img.src) {
                        return img.src;
                    }
                }
                
                // Try open graph image
                const ogImage = document.querySelector('meta[property="og:image"]');
                if (ogImage && ogImage.content) {
                    return ogImage.content;
                }
                
                return null;
            };
            
            // Try to get content using multiple approaches
            
            // 1. Try to get article content
            const contentSelectors = [
                'article p',
                '.article-content p',
                '.article-body p',
                '.pb-article-content p',
                '.content p',
                'main p'
            ];
            
            let content = getTextContent(contentSelectors);
            
            // 2. If no article content found, try to get all paragraphs
            if (!content || content.length < 100) {
                const paragraphs = document.querySelectorAll('p');
                if (paragraphs.length > 0) {
                    content = Array.from(paragraphs)
                        .map(p => p.textContent.trim())
                        .filter(text => text.length > 20) // Only include substantial paragraphs
                        .join('\n\n');
                }
            }
            
            // 3. If still no content, try to get any text content
            if (!content || content.length < 100) {
                // Try to get content from the main element
                const mainElement = document.querySelector('main') || 
                                    document.querySelector('article') || 
                                    document.querySelector('.content');
                                    
                if (mainElement) {
                    content = mainElement.textContent.trim();
                }
            }
            
            // Try to get other metadata
            const titleSelectors = ['h1', '.article-title', 'header h1', '.title', '.headline'];
            const dateSelectors = ['time', '.date', '.timestamp', '.published-date'];
            const authorSelectors = ['.author', '.byline', '.writer', '.contributor'];
            
            // Get title
            const title = getSingleText(titleSelectors) || document.title;
            
            // Get date
            let date = '';
            const publishedTimeElement = document.querySelector('meta[property="article:published_time"]');
            if (publishedTimeElement) {
                date = publishedTimeElement.content;
            } else {
                date = getSingleText(dateSelectors);
            }
            
            // Get author
            let author = '';
            const metaAuthor = document.querySelector('meta[name="author"]');
            if (metaAuthor) {
                author = metaAuthor.content;
            } else {
                author = getSingleText(authorSelectors);
            }
            
            // Get image
            const image = getMainImage();
            
            // Log content length
            console.log(`Content length: ${content ? content.length : 0} characters`);
            
            return {
                title,
                url: articleUrl,
                content,
                date,
                image,
                author,
                source: 'pitchbook'
            };
        }, url);
    } catch (error) {
        console.error(`Error extracting content from ${url}:`, error);
        return {
            title: '',
            url: url,
            content: '',
            date: '',
            image: null,
            author: '',
            source: 'pitchbook'
        };
    }
}

module.exports = { scrape };