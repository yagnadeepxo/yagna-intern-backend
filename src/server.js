const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Fetch latest reports
app.get('/api/reports', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('name, html, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }

    res.status(200).json({ reports: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 🚀 NEW: Trigger automation via API
app.post('/api/generate-report', async (req, res) => {
  try {
    console.log('\n[0/4] Deleting previous articles...');
    execSync('npm run delete', { stdio: 'inherit' });

    console.log('\n[1/4] Fetching sources...');
    execSync('npm run run-all', { stdio: 'inherit' });

    console.log('\n[2/4] Exporting articles...');
    execSync('npm run export', { stdio: 'inherit' });

    console.log('\n[3/4] Running AI report...');
    execSync('npm run get-report', { stdio: 'inherit' });

    console.log('\n✅ Done! Full report generated.');
    res.status(200).json({ success: true, message: 'Report generated successfully.' });
  } catch (err) {
    console.error('❌ Error during automation:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
