/**
 * Add a student to the students table.
 * Run with: npx tsx scripts/add_student.ts [s_number] [name]
 * Example: npx tsx scripts/add_student.ts s933563 "Paige Nyanteh"
 *
 * Uses same Supabase client as export_database.ts (service role).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addStudent(sNumber: string, name: string) {
  const normalizedSNumber = sNumber.trim().toLowerCase();
  if (!normalizedSNumber.startsWith('s')) {
    throw new Error('S-number must start with "s"');
  }

  const { data: existing } = await supabase
    .from('students')
    .select('id, s_number, name')
    .eq('s_number', normalizedSNumber)
    .maybeSingle();

  if (existing) {
    console.log('Student already exists:', existing);
    return existing;
  }

  const { data, error } = await supabase
    .from('students')
    .insert([{
      s_number: normalizedSNumber,
      name: name.trim(),
      email: null,
      volunteering_hours: 0,
      social_hours: 0,
      total_hours: 0,
      tshirt_size: null,
      account_status: 'pending',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error adding student:', error);
    throw error;
  }

  console.log('✅ Student added:', data);
  return data;
}

const sNumber = process.argv[2] || 's933563';
const name = process.argv[3] || 'Paige Nyanteh';

addStudent(sNumber, name).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
