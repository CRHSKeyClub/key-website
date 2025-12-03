import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateChickFilaHours() {
  console.log('🔍 Finding all Chick-fil-A Social hour requests with 2 hours...\n');

  // Search for hour requests with "chick fil a" in the event name (case insensitive) and 2 hours
  const { data: requests, error: fetchError } = await supabase
    .from('hour_requests')
    .select('*')
    .ilike('event_name', '%chick fil a%')
    .eq('hours_requested', 2);

  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError);
    throw fetchError;
  }

  if (!requests || requests.length === 0) {
    console.log('✅ No Chick-fil-A Social requests found with 2 hours.');
    return;
  }

  console.log(`📊 Found ${requests.length} Chick-fil-A Social request(s) with 2 hours\n`);
  console.log('Updating to 1 hour...\n');

  let updatedCount = 0;
  let failedCount = 0;

  for (const request of requests) {
    console.log(`   Updating: ${request.student_name} (${request.student_s_number}) - ${request.hours_requested} ${request.type} → 1 ${request.type}`);
    
    const { error: updateError } = await supabase
      .from('hour_requests')
      .update({
        hours_requested: 1
      })
      .eq('id', request.id);

    if (updateError) {
      console.log(`      ❌ Error: ${updateError.message}`);
      failedCount++;
    } else {
      updatedCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal requests found: ${requests.length}`);
  console.log(`✅ Successfully updated: ${updatedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

updateChickFilaHours()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });



