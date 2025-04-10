require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportArticlesToSupabase() {
  try {
    console.log('Fetching articles from startup_articles...');

    // Fetch all articles (excluding id)
    const { data: articles, error } = await supabase
      .from('startup_articles')
      .select(`
        title,
        content,
        source
      `)
      .order('published_date', { ascending: false });

    if (error) throw error;

    console.log(`Fetched ${articles.length} articles.`);

    // Store articles in article_exports as JSON
    const { error: insertError } = await supabase
      .from('article_exports')
      .insert([
        {
          articles: articles
        }
      ]);

    if (insertError) throw insertError;

    console.log('✅ Successfully stored articles in Supabase!');

  } catch (err) {
    console.error('❌ Error exporting articles:', err.message);
    process.exit(1);
  }
}

// Run it
exportArticlesToSupabase();
