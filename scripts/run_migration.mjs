import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection details
const SUPABASE_URL = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
  console.error('   Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/run_migration.mjs');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL');
  process.exit(1);
}

async function main() {
  console.log('🔐 Setting up database connection...');
  
  // Construct connection string
  // Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  // We need the database password - it's in Supabase Dashboard → Settings → Database → Connection string
  let connectionString;
  
  if (SUPABASE_DB_PASSWORD) {
    connectionString = `postgresql://postgres.${projectRef}:${SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
  } else {
    console.log('⚠️  SUPABASE_DB_PASSWORD not set. Trying alternative method...');
    console.log('   You can get the connection string from:');
    console.log('   Supabase Dashboard → Settings → Database → Connection string');
    console.log('   Or set SUPABASE_DB_PASSWORD environment variable');
    
    // Try using Supabase REST API with service role key for simple operations
    console.log('\n📝 Attempting to run migration via Supabase API...');
    await runViaAPI();
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'add_hours_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Reading SQL migration file...');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const upper = s.toUpperCase();
        return s.length > 0 && 
               !upper.startsWith('--') && 
               !upper.startsWith('COMMENT'); // Skip comments for now
      });

    console.log(`📌 Found ${statements.length} SQL statements to execute...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      // Skip SELECT statements (run verification separately)
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        continue;
      }

      console.log(`📌 Executing statement ${i + 1}/${statements.length}...`);
      const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`   ${preview}${statement.length > 80 ? '...' : ''}`);

      try {
        await client.query(statement);
        console.log('✅ Statement executed successfully\n');
      } catch (err) {
        // If column already exists, that's okay
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⚠️  Column may already exist (this is okay)\n');
        } else {
          console.error(`❌ Error: ${err.message}\n`);
          throw err;
        }
      }
    }

    // Run verification query
    console.log('📊 Running verification query...');
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_students,
        SUM(COALESCE(volunteering_hours, 0)) as total_volunteering,
        SUM(COALESCE(social_hours, 0)) as total_social,
        SUM(COALESCE(total_hours, 0)) as total_hours_sum
      FROM students;
    `);
    
    console.log('✅ Migration verified!');
    console.log(JSON.stringify(result.rows[0], null, 2));

    await client.end();
    console.log('\n✅ Migration complete!');
    console.log('   You can now run the CSV import script.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (client) await client.end();
    process.exit(1);
  }
}

async function runViaAPI() {
  // Alternative: Use Supabase JS client to check if columns exist and add them via API
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('⚠️  Direct SQL execution requires database password.');
  console.log('   Please provide SUPABASE_DB_PASSWORD or run SQL manually.');
  console.log('   File: scripts/add_hours_columns.sql');
  console.log('   Location: Supabase Dashboard → SQL Editor');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
