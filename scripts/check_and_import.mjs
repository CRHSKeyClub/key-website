import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

async function main() {
  console.log('🔍 Checking if columns exist...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Try to query the columns to see if they exist
  try {
    const { data, error } = await supabase
      .from('students')
      .select('volunteering_hours, social_hours')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ Columns do not exist yet.');
        console.log('\n📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
        const sqlPath = path.join(process.cwd(), 'scripts', 'add_hours_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(sql);
        console.log('\n⚠️  After running the SQL, run this script again to import the CSV.');
        process.exit(1);
      } else {
        throw error;
      }
    } else {
      console.log('✅ Columns exist! Proceeding with CSV import...\n');
      // Import the CSV import script and run it
      await importCSV();
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

async function importCSV() {
  // Import and run the CSV import script
  const csvPath = path.join(process.cwd(), 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }
  
  console.log('📄 Running CSV import...\n');
  
  // Use dynamic import to run the import script
  const { default: importScript } = await import('./import_hours_from_csv.mjs');
  // Actually, the import script exports a main function, so we need to call it differently
  // Let's just execute it as a subprocess
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    const child = spawn('node', [
      path.join(process.cwd(), 'scripts', 'import_hours_from_csv.mjs'),
      csvPath
    ], {
      env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY },
      stdio: 'inherit'
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

main().catch(console.error);

