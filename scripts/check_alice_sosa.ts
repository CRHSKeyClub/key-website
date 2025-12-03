import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAliceSosa() {
  const studentId = '127820'; // Alice Sosa's ID
  
  console.log(`🔍 Checking Alice Sosa (Student ID: ${studentId})...\n`);
  
  // Try different variations of the student ID
  const variations = [
    studentId,
    studentId.toLowerCase(),
    `s${studentId.toLowerCase()}`,
  ];
  
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
      console.log(`   Email: ${student.email || 'N/A'}`);
      console.log(`\n📊 CURRENT HOURS:`);
      console.log(`   Volunteering Hours: ${student.volunteering_hours || 0}`);
      console.log(`   Social Hours: ${student.social_hours || 0}`);
      console.log(`   Total Hours: ${student.total_hours || 0}`);
      console.log(`\n📋 Additional Info:`);
      console.log(`   Account Status: ${student.account_status || 'N/A'}`);
      console.log(`   Created At: ${student.created_at || 'N/A'}`);
      console.log(`   Last Hour Update: ${student.last_hour_update || 'N/A'}`);
      
      // Get all hour requests
      const { data: requests } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', student.s_number)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });
      
      if (requests && requests.length > 0) {
        console.log(`\n📝 Approved Hour Requests (${requests.length}):`);
        requests.forEach((req: any, index: number) => {
          const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
          console.log(`   ${index + 1}. ${req.event_name || 'Unknown Event'}`);
          console.log(`      Hours: ${req.hours_requested} ${req.type || 'volunteering'}`);
          console.log(`      Reviewed: ${date} by ${req.reviewed_by || 'Unknown'}`);
          if (req.description) {
            console.log(`      Description: ${req.description.substring(0, 60)}${req.description.length > 60 ? '...' : ''}`);
          }
        });
        
        // Calculate total from requests
        const totalFromRequests = requests.reduce((sum: number, req: any) => {
          return sum + (parseFloat(req.hours_requested || 0) || 0);
        }, 0);
        const volunteeringFromRequests = requests
          .filter((req: any) => (req.type || 'volunteering').toLowerCase() === 'volunteering')
          .reduce((sum: number, req: any) => sum + (parseFloat(req.hours_requested || 0) || 0), 0);
        const socialFromRequests = requests
          .filter((req: any) => (req.type || 'volunteering').toLowerCase() === 'social')
          .reduce((sum: number, req: any) => sum + (parseFloat(req.hours_requested || 0) || 0), 0);
        
        console.log(`\n📊 Total from requests: ${volunteeringFromRequests}V / ${socialFromRequests}S / ${totalFromRequests}T`);
      } else {
        console.log(`\n📝 No approved hour requests found`);
      }
      
      return;
    }
  }
  
  console.log(`❌ Alice Sosa (ID: 127820) was not found in the database.`);
}

checkAliceSosa()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });




