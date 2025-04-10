require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAll() {
  try {
    console.log('\n[1/2] Deleting all rows from article_exports...');
    const { error: error1 } = await supabase.from('article_exports').delete().neq('id', '');
    if (error1) throw error1;
    console.log('✅ article_exports cleared.');

    console.log('\n[2/2] Deleting all rows from startup_articles...');
    const { error: error2 } = await supabase.from('startup_articles').delete().neq('id', '');
    if (error2) throw error2;
    console.log('✅ startup_articles cleared.');

    console.log('\n🎉 All articles deleted successfully!');
  } catch (err) {
    console.error('❌ Error deleting articles:', err.message);
    process.exit(1);
  }
}

deleteAll();
