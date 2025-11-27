import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

const projectRef = 'zvoavkzruhnzzeqyihrc';

async function trySupabaseAPI() {
  console.log('🔐 Trying Supabase REST API...\n');
  
  // Try using Supabase's REST API to execute SQL
  // Note: This might not work for ALTER TABLE, but let's try
  const sqlStatements = [
    'ALTER TABLE students ADD COLUMN IF NOT EXISTS volunteering_hours NUMERIC(10, 2) DEFAULT 0',
    'ALTER TABLE students ADD COLUMN IF NOT EXISTS social_hours NUMERIC(10, 2) DEFAULT 0',
    'UPDATE students SET volunteering_hours = COALESCE(total_hours, 0) WHERE (volunteering_hours = 0 OR volunteering_hours IS NULL) AND total_hours > 0',
    'UPDATE students SET total_hours = COALESCE(volunteering_hours, 0) + COALESCE(social_hours, 0)'
  ];

  for (const sql of sqlStatements) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (response.ok) {
        console.log(`✅ ${sql.substring(0, 50)}...`);
      } else {
        const text = await response.text();
        console.log(`⚠️  API method failed: ${text.substring(0, 100)}`);
        return false;
      }
    } catch (err) {
      console.log(`⚠️  API error: ${err.message}`);
      return false;
    }
  }
  
  return true;
}

async function tryDirectConnection() {
  if (!SUPABASE_DB_PASSWORD) {
    console.log('⚠️  SUPABASE_DB_PASSWORD not set. Cannot connect directly.\n');
    return false;
  }

  console.log('🔐 Connecting directly to PostgreSQL...\n');
  
  // Try different connection string formats
  const connectionStrings = [
    `postgresql://postgres.${projectRef}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`,
  ];

  for (const connString of connectionStrings) {
    const client = new Client({
      connectionString: connString,
      ssl: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : {
        rejectUnauthorized: false
      },
    });

    try {
      await client.connect();
      console.log('✅ Connected to database!\n');

      const sqlPath = path.join(__dirname, 'add_hours_columns.sql');
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          const upper = s.toUpperCase();
          return s.length > 0 && 
                 !upper.startsWith('--') &&
                 !upper.startsWith('COMMENT') &&
                 !upper.startsWith('SELECT');
        });

      console.log(`📝 Executing ${statements.length} SQL statements...\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;

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

      // Verify
      console.log('📊 Verifying...');
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_students,
          SUM(COALESCE(volunteering_hours, 0)) as total_volunteering,
          SUM(COALESCE(social_hours, 0)) as total_social
        FROM students;
      `);
      
      console.log('✅ Migration complete!');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      await client.end();
      return true;
    } catch (err) {
      console.log(`⚠️  Connection failed: ${err.message}\n`);
      if (client) await client.end().catch(() => {});
    }
  }

  return false;
}

async function main() {
  console.log('🚀 Running SQL migration to add columns...\n');

  // Try API first (unlikely to work for ALTER TABLE)
  const apiWorked = await trySupabaseAPI();
  if (apiWorked) {
    console.log('\n✅ Migration complete via API!');
    return;
  }

  // Try direct connection
  const directWorked = await tryDirectConnection();
  if (directWorked) {
    console.log('\n✅ Migration complete!');
    return;
  }

  // If both failed, show instructions
  console.log('\n❌ Could not execute SQL automatically.');
  console.log('\n📋 Please run this SQL manually in Supabase Dashboard → SQL Editor:\n');
  const sqlPath = path.join(__dirname, 'add_hours_columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(sql);
  console.log('\n💡 Or provide SUPABASE_DB_PASSWORD to run from terminal:');
  console.log('   SUPABASE_DB_PASSWORD=your_password node scripts/run_sql_migration.mjs');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

