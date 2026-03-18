/**
 * Remove a student's auth account and reset their status so they must
 * create an account (register) first, like other new students.
 *
 * Run with: npx tsx scripts/require_student_register.ts <s_number>
 * Example: npx tsx scripts/require_student_register.ts s933563
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function requireStudentRegister(sNumber: string) {
  const normalizedSNumber = sNumber.trim().toLowerCase();
  if (!normalizedSNumber.startsWith('s')) {
    throw new Error('S-number must start with "s"');
  }

  const { error: deleteError } = await supabase
    .from('auth_users')
    .delete()
    .eq('s_number', normalizedSNumber);

  if (deleteError) {
    console.error('Error removing auth account:', deleteError);
    throw deleteError;
  }

  const { error: updateError } = await supabase
    .from('students')
    .update({
      account_status: 'pending',
      account_created: null,
    })
    .eq('s_number', normalizedSNumber);

  if (updateError) {
    console.error('Error resetting student status:', updateError);
    throw updateError;
  }

  console.log('✅', normalizedSNumber, 'must create an account first.');
  console.log('   They can go to Student Login → Sign up, enter S-number and name, set a password.');
}

const sNumber = process.argv[2];
if (!sNumber) {
  console.error('Usage: npx tsx scripts/require_student_register.ts <s_number>');
  process.exit(1);
}

requireStudentRegister(sNumber).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
