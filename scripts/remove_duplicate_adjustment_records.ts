import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicateAdjustmentRecords() {
  console.log('🔍 Finding and removing duplicate "Hours Adjustment" records...\n');

  // Get all "Hours Adjustment" records that were auto-created
  const { data: adjustmentRecords, error: fetchError } = await supabase
    .from('hour_requests')
    .select('*')
    .or(`event_name.ilike.%Hours Adjustment - Added from CSV/Other Events%,event_name.ilike.%hours adjustment - added from csv/other events%`)
    .eq('status', 'approved');

  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError);
    throw fetchError;
  }

  if (!adjustmentRecords || adjustmentRecords.length === 0) {
    console.log('✅ No duplicate adjustment records found.');
    return;
  }

  console.log(`📊 Found ${adjustmentRecords.length} "Hours Adjustment" records\n`);
  console.log('🗑️  Removing duplicate records...\n');

  let deletedCount = 0;
  let failedCount = 0;

  for (const record of adjustmentRecords) {
    console.log(`   Deleting: ${record.student_name} - ${record.event_name} (${record.hours_requested} ${record.type})`);
    
    const { error: deleteError } = await supabase
      .from('hour_requests')
      .delete()
      .eq('id', record.id);

    if (deleteError) {
      console.log(`      ❌ Error: ${deleteError.message}`);
      failedCount++;
    } else {
      deletedCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 REMOVAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal records found: ${adjustmentRecords.length}`);
  console.log(`✅ Successfully deleted: ${deletedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

removeDuplicateAdjustmentRecords()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });



