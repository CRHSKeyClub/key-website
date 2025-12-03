import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findChickFila2HourRequests() {
  console.log('🔍 Finding all Chick-fil-A Social hour requests for 2 hours...\n');

  // Search for hour requests with "chick fil a" in the event name (case insensitive)
  const { data: requests, error } = await supabase
    .from('hour_requests')
    .select('*')
    .ilike('event_name', '%chick fil a%')
    .eq('hours_requested', 2)
    .order('student_name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching requests:', error);
    throw error;
  }

  if (!requests || requests.length === 0) {
    console.log('✅ No Chick-fil-A Social requests found for 2 hours.');
    return;
  }

  console.log(`📊 Found ${requests.length} Chick-fil-A Social request(s) for 2 hours:\n`);

  requests.forEach((request, index) => {
    console.log('\n' + '='.repeat(100));
    console.log(`Request #${index + 1}`);
    console.log('='.repeat(100));
    console.log(`Student Name:     ${request.student_name || 'Unknown'}`);
    console.log(`Student S#:       ${request.student_s_number || 'N/A'}`);
    console.log(`Event Name:       ${request.event_name || 'N/A'}`);
    console.log(`Event Date:       ${request.event_date ? new Date(request.event_date).toLocaleDateString() : 'N/A'}`);
    console.log(`Hours Requested:  ${request.hours_requested} ${request.type || 'hours'}`);
    console.log(`Status:           ${request.status || 'pending'}`);
    console.log(`Type:             ${request.type || 'N/A'}`);
    console.log(`Submitted At:     ${request.submitted_at ? new Date(request.submitted_at).toLocaleString() : 'N/A'}`);
    console.log(`Reviewed At:      ${request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}`);
    console.log(`Reviewed By:      ${request.reviewed_by || 'N/A'}`);
    console.log(`Description:      ${request.description || 'N/A'}`);
    if (request.admin_notes) {
      console.log(`Admin Notes:      ${request.admin_notes}`);
    }
    if (request.id) {
      console.log(`Request ID:       ${request.id}`);
    }
  });

  console.log('\n' + '='.repeat(100));
  console.log(`\n📋 Summary:`);
  console.log(`   Total requests: ${requests.length}`);
  
  const byStatus = requests.reduce((acc: any, req) => {
    const status = req.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`   By status:`);
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`      ${status}: ${count}`);
  });

  const byType = requests.reduce((acc: any, req) => {
    const type = req.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`   By type:`);
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`      ${type}: ${count}`);
  });

  console.log('\n');
}

findChickFila2HourRequests()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

