import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStudent() {
  const studentId = '127820'; // Alice Sosa's ID
  
  console.log(`🔍 Checking Alice Sosa (Student ID: ${studentId})...\n`);
  
  // Try different variations of the student ID
  const variations = [
    studentId,
    studentId.toLowerCase(),
    studentId.toUpperCase(),
    `s${studentId}`,
    `S${studentId}`,
  ];
  
  for (const id of variations) {
    console.log(`Trying ID: ${id}`);
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('s_number', id)
      .maybeSingle();
    
    if (error) {
      console.log(`   Error: ${error.message}`);
      continue;
    }
    
    if (student) {
      console.log(`\n✅ Found student!`);
      console.log(`   Name: ${student.name}`);
      console.log(`   S Number: ${student.s_number}`);
      console.log(`   Email: ${student.email || 'N/A'}`);
      console.log(`   Volunteering Hours: ${student.volunteering_hours || 0}`);
      console.log(`   Social Hours: ${student.social_hours || 0}`);
      console.log(`   Total Hours: ${student.total_hours || 0}`);
      console.log(`   Account Status: ${student.account_status || 'N/A'}`);
      console.log(`   Created At: ${student.created_at || 'N/A'}`);
      return;
    } else {
      console.log(`   Not found`);
    }
  }
  
  // Also try searching by name
  console.log(`\n🔍 Searching by name "Alice Sosa"...`);
  const { data: studentsByName, error: nameError } = await supabase
    .from('students')
    .select('*')
    .ilike('name', '%Alice%')
    .ilike('name', '%Sosa%');
  
  if (nameError) {
    console.log(`   Error: ${nameError.message}`);
  } else if (studentsByName && studentsByName.length > 0) {
    console.log(`\n✅ Found ${studentsByName.length} student(s) with similar name:`);
    studentsByName.forEach((s: any) => {
      console.log(`\n   Name: ${s.name}`);
      console.log(`   S Number: ${s.s_number}`);
      console.log(`   Volunteering Hours: ${s.volunteering_hours || 0}`);
      console.log(`   Social Hours: ${s.social_hours || 0}`);
      console.log(`   Total Hours: ${s.total_hours || 0}`);
    });
  } else {
    console.log(`   Not found by name either`);
  }
  
  // Also check all students to see if there's any with similar ID
  console.log(`\n🔍 Checking for similar student IDs (127xxx range)...`);
  const { data: similarStudents, error: similarError } = await supabase
    .from('students')
    .select('s_number, name, volunteering_hours, social_hours, total_hours')
    .like('s_number', '127%')
    .limit(10);
  
  if (similarError) {
    console.log(`   Error: ${similarError.message}`);
  } else if (similarStudents && similarStudents.length > 0) {
    console.log(`\n   Found ${similarStudents.length} student(s) with IDs starting with 127:`);
    similarStudents.forEach((s: any) => {
      console.log(`   - ${s.name} (ID: ${s.s_number}) - Hours: ${s.volunteering_hours || 0}V / ${s.social_hours || 0}S / ${s.total_hours || 0}T`);
    });
  }
  
  console.log(`\n❌ Alice Sosa (ID: 127820) was not found in the database.`);
  console.log(`   This is correct - she has an 'X' in the "Added to App" column, so her hours should NOT be in the database.`);
}

checkStudent()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });



