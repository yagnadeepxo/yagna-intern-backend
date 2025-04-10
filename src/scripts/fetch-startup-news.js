const { createClient } = require('@supabase/supabase-js');
const { scrape: scrapeYC } = require('../scrapers/ycombinator');
const { scrape: scrapeTechCrunch } = require('../scrapers/techcrunch');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndSaveArticles(source, scrapeFn) {
    try {
        console.log(`🚀 Starting to fetch articles from ${source}...`);
        const articles = await scrapeFn();
        console.log(`📚 Found ${articles.length} articles from ${source}`);

        if (articles.length === 0) {
            console.log(`ℹ️ No articles found from ${source}`);
            return 0;
        }

        // Prepare articles for insertion with correct column names
        const articlesWithMetadata = articles.map(article => {
            // Convert publishedDate to proper timestamp if it's not already
            let published_date = null;
            if (article.publishedDate) {
                published_date = new Date(article.publishedDate).toISOString();
            } else if (article.published_date) {
                published_date = new Date(article.published_date).toISOString();
            }

            // Map the article data to match the database schema
            const mappedArticle = {
                title: article.title,
                content: article.content || article.description || '[No content available]',
                url: article.url || article.link,
                image_url: article.imageUrl || article.image_url || null,
                published_date: published_date || new Date().toISOString(),
                source: source.toLowerCase(),
                scraped_at: new Date().toISOString()
            };

            // Remove any undefined or null values
            Object.keys(mappedArticle).forEach(key => 
                (mappedArticle[key] === undefined || mappedArticle[key] === null) && delete mappedArticle[key]
            );

            return mappedArticle;
        });

        // Log sample article for debugging
        if (articlesWithMetadata.length > 0) {
            console.log('Sample article structure:', JSON.stringify(articlesWithMetadata[0], null, 2));
        }

        // Insert articles into the database
        const { data, error } = await supabase
            .from('startup_articles')
            .upsert(articlesWithMetadata, {
                onConflict: 'url',
                ignoreDuplicates: true
            });

        if (error) {
            console.error(`❌ Error saving articles from ${source}:`, error.message);
            return 0;
        }

        const savedCount = data ? data.length : 0;
        console.log(`✅ Successfully saved ${savedCount} articles from ${source}`);
        return savedCount;
    } catch (error) {
        console.error(`❌ Error processing ${source}:`, error.message);
        return 0;
    }
}

async function main() {
    console.log('🎬 Starting startup news fetch process...');

    const sources = [
        { name: 'Y Combinator', scraper: scrapeYC },
        { name: 'TechCrunch', scraper: scrapeTechCrunch }
    ];

    let totalSaved = 0;
    for (const source of sources) {
        const savedCount = await fetchAndSaveArticles(source.name, source.scraper);
        totalSaved += savedCount;
    }

    console.log(`\n📊 Summary:`);
    console.log(`Total articles saved: ${totalSaved}`);
    console.log('🏁 Fetch process completed');
}

// Run the script
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 