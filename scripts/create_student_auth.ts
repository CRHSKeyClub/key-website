/**
 * Create an auth_users record for a student so they can sign in with S-number + password.
 * Uses the same password hash format as the app (SHA-256 of password+salt, stored as "hash:salt").
 *
 * Run with: npx tsx scripts/create_student_auth.ts <s_number> <password>
 * Example: npx tsx scripts/create_student_auth.ts s933563 "KeyClub2025!"
 */

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Match app's format: SHA-256(password + salt), output "hex:salt" (same as SupabaseService.hashPassword) */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(12).toString('hex').slice(0, 13);
  const salted = password + salt;
  const hash = crypto.createHash('sha256').update(salted, 'utf8').digest('hex');
  return `${hash}:${salt}`;
}

async function createStudentAuth(sNumber: string, password: string) {
  const normalizedSNumber = sNumber.trim().toLowerCase();
  if (!normalizedSNumber.startsWith('s')) {
    throw new Error('S-number must start with "s"');
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, s_number, name, account_status')
    .eq('s_number', normalizedSNumber)
    .maybeSingle();

  if (studentError || !student) {
    throw new Error(`Student not found: ${normalizedSNumber}. Add them first with add_student.ts`);
  }

  const { data: existingAuth } = await supabase
    .from('auth_users')
    .select('id')
    .eq('s_number', normalizedSNumber)
    .maybeSingle();

  if (existingAuth) {
    console.log('Auth account already exists for', normalizedSNumber);
    return existingAuth;
  }

  const passwordHash = hashPassword(password);

  const { data: authUser, error: authError } = await supabase
    .from('auth_users')
    .insert([{ s_number: normalizedSNumber, password_hash: passwordHash }])
    .select()
    .single();

  if (authError) {
    console.error('Error creating auth_users:', authError);
    throw authError;
  }

  await supabase
    .from('students')
    .update({
      account_status: 'active',
      account_created: new Date().toISOString(),
    })
    .eq('s_number', normalizedSNumber);

  console.log('✅ Auth account created for', student.name, `(${normalizedSNumber})`);
  console.log('   They can sign in with S-number and the password you provided.');
  return authUser;
}

const sNumber = process.argv[2];
const password = process.argv[3];

if (!sNumber || !password) {
  console.error('Usage: npx tsx scripts/create_student_auth.ts <s_number> <password>');
  console.error('Example: npx tsx scripts/create_student_auth.ts s933563 "KeyClub2025!"');
  process.exit(1);
}

createStudentAuth(sNumber, password).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
