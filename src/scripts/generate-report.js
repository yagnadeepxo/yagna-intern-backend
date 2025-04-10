const { execSync } = require('child_process');

try {

  console.log('\n[0/3] Deleting previous-articles...');
  execSync('npm run delete', { stdio: 'inherit' });

  console.log('\n[1/3] Fetching sources...');
  execSync('npm run run-all', { stdio: 'inherit' });

  console.log('\n[2/3] Exporting articles...');
  execSync('npm run export', { stdio: 'inherit' });

  console.log('\n[3/3] Running AI report...');
  execSync('npm run get-report', { stdio: 'inherit' });

  console.log('\n✅ Done! Full report generated.');
} catch (err) {
  console.error('❌ Error during automation:', err.message);
  process.exit(1);
}
