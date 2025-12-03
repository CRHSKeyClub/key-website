import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSophiaKelly() {
  const studentId = '912842'; // Sophia Kelly's ID from CSV line 20
  
  console.log(`🔍 Checking Sophia Kelly (Student ID: ${studentId})...\n`);
  console.log(`CSV shows: 4 volunteering, 1 social (NOT marked with X)\n`);
  
  // Get student from database
  const variations = ['912842', 's912842'];
  
  for (const id of variations) {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('s_number', id)
      .maybeSingle();
    
    if (error) {
      console.log(`❌ Error with ID ${id}: ${error.message}`);
      continue;
    }
    
    if (student) {
      console.log(`✅ Found student!`);
      console.log(`   Name: ${student.name}`);
      console.log(`   S Number: ${student.s_number}`);
      console.log(`\n📊 CURRENT HOURS IN DATABASE:`);
      console.log(`   Volunteering Hours: ${student.volunteering_hours || 0}`);
      console.log(`   Social Credits: ${student.social_hours || 0}`);
      console.log(`   Total Hours: ${student.total_hours || 0}`);

      // Get all hour requests
      const { data: requests } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', student.s_number)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (requests && requests.length > 0) {
        console.log(`\n📝 Approved Hour Requests (${requests.length}):`);
        
        let totalFromRequests = { volunteering: 0, social: 0, total: 0 };
        
        requests.forEach((req: any, index: number) => {
          const hours = parseFloat(req.hours_requested || 0) || 0;
          const type = (req.type || 'volunteering').toLowerCase();
          const eventName = req.event_name || 'Unknown';
          const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
          
          console.log(`   ${index + 1}. ${eventName}`);
          console.log(`      Hours: ${hours} ${type === 'social' ? 'social credits' : 'volunteering'}`);
          console.log(`      Reviewed: ${date} by ${req.reviewed_by || 'Unknown'}`);
          
          if (type === 'volunteering') {
            totalFromRequests.volunteering += hours;
          } else {
            totalFromRequests.social += hours;
          }
          totalFromRequests.total += hours;
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total from requests: ${totalFromRequests.volunteering}V / ${totalFromRequests.social}S / ${totalFromRequests.total}T`);
        console.log(`   Database hours: ${student.volunteering_hours || 0}V / ${student.social_hours || 0}S / ${student.total_hours || 0}T`);
        
        const match = 
          Math.abs((student.volunteering_hours || 0) - totalFromRequests.volunteering) < 0.01 &&
          Math.abs((student.social_hours || 0) - totalFromRequests.social) < 0.01 &&
          Math.abs((student.total_hours || 0) - totalFromRequests.total) < 0.01;
        
        if (match) {
          console.log(`\n✅ Hours match requests perfectly!`);
        } else {
          console.log(`\n⚠️  Hours don't match requests`);
        }
      } else {
        console.log(`\n📝 No approved hour requests found`);
      }
      
      return;
    }
  }
  
  console.log(`❌ Sophia Kelly (ID: 912842) was not found in the database.`);
}

checkSophiaKelly()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });


