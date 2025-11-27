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
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY must be set');
  console.error('   Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/run_migration_simple.mjs');
  process.exit(1);
}

// Extract project ref
const projectRef = 'zvoavkzruhnzzeqyihrc';

async function main() {
  console.log('🔐 Connecting to Supabase database...\n');

  let client;
  
  // Try to connect with database password if provided
  if (SUPABASE_DB_PASSWORD) {
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;
    
    client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      console.log('✅ Connected to database via PostgreSQL\n');
    } catch (err) {
      console.error('❌ Failed to connect:', err.message);
      console.log('\n💡 Trying alternative method...\n');
      client = null;
    }
  }

  // If no direct connection, try using Supabase API
  if (!client) {
    console.log('⚠️  Direct database connection not available.');
    console.log('   Need SUPABASE_DB_PASSWORD for ALTER TABLE commands.');
    console.log('   Get it from: Supabase Dashboard → Settings → Database → Connection string\n');
    
    // Try to use Supabase Management API (if available)
    console.log('💡 Alternative: Run SQL manually in Supabase Dashboard → SQL Editor');
    console.log('   File: scripts/add_hours_columns.sql\n');
    
    // Show the SQL commands
    const sqlPath = path.join(__dirname, 'add_hours_columns.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📋 SQL Commands to run:');
    console.log('─'.repeat(60));
    console.log(sqlContent);
    console.log('─'.repeat(60));
    
    process.exit(1);
  }

  // Read SQL file
  const sqlPath = path.join(__dirname, 'add_hours_columns.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Parse SQL statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      const upper = s.toUpperCase();
      return s.length > 0 && 
             !upper.startsWith('--') &&
             !upper.startsWith('COMMENT'); // Skip comments for now
    });

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    // Skip SELECT (run separately)
    if (statement.toUpperCase().trim().startsWith('SELECT')) continue;

    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      await client.query(statement);
      console.log('   ✅ Success\n');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log('   ⚠️  Already exists (okay)\n');
      } else {
        console.error(`   ❌ Error: ${err.message}\n`);
        throw err;
      }
    }
  }

  // Verification
  console.log('📊 Verifying migration...');
  const result = await client.query(`
    SELECT 
      COUNT(*) as total_students,
      SUM(COALESCE(volunteering_hours, 0)) as total_volunteering,
      SUM(COALESCE(social_hours, 0)) as total_social,
      SUM(COALESCE(total_hours, 0)) as total_hours_sum
    FROM students;
  `);
  
  console.log('✅ Migration complete!');
  console.log(JSON.stringify(result.rows[0], null, 2));
  
  await client.end();
  console.log('\n🎉 Ready to import CSV!');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

