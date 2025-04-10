const { createClient } = require('@supabase/supabase-js');
const { scrape } = require('../scrapers/fastcompany');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAndSaveArticles() {
    try {
        console.log('🚀 Starting Fast Company news fetch...');
        const articles = await scrape();
        console.log(`📚 Found ${articles.length} articles`);

        if (articles.length === 0) {
            console.log('ℹ️ No articles found');
            return;
        }

        // Prepare articles for insertion
        const articlesWithMetadata = articles.map(article => {
            // Map the article data to match the database schema
            const mappedArticle = {
                title: article.title,
                content: article.content || '[No content available]',
                url: article.url,
                image_url: article.image_url,
                published_date: article.published_date || new Date().toISOString(),
                source: 'fastcompany',
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
            console.error('❌ Error saving articles:', error.message);
            return;
        }

        const savedCount = data ? data.length : 0;
        console.log(`✅ Successfully saved ${savedCount} articles`);

        // Log article statistics
        const categories = articles.reduce((acc, article) => {
            if (article.categories) {
                article.categories.forEach(category => {
                    acc[category] = (acc[category] || 0) + 1;
                });
            }
            return acc;
        }, {});

        const authors = articles.reduce((acc, article) => {
            if (article.author) {
                acc[article.author] = (acc[article.author] || 0) + 1;
            }
            return acc;
        }, {});

        console.log('\n📊 Article Statistics:');
        console.log('Categories:', Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([cat, count]) => `${cat}: ${count}`)
            .join(', '));
        
        console.log('Top Authors:', Object.entries(authors)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([author, count]) => `${author}: ${count}`)
            .join(', '));

        console.log('\nArticles with images:', articles.filter(a => a.image_url).length);
        console.log('Articles with content:', articles.filter(a => a.content).length);
        console.log('🏁 Fast Company fetch completed');

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
fetchAndSaveArticles().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
}); 