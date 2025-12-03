import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeYesterdayCSVHours() {
  console.log('🗑️  Removing "Hours Added from Other Events" from December 1, 2025...\n');

  // Target date: December 1, 2025
  const targetDate = '2025-12-01';
  
  console.log(`Looking for records with reviewed_at date = ${targetDate}\n`);

  // Find all "Hours Added from Other Events" records from December 1, 2025
  // We'll filter by event_name and then check the reviewed_at date
  const { data: allRecords, error: fetchError } = await supabase
    .from('hour_requests')
    .select('*')
    .eq('event_name', 'Hours Added from Other Events');
  
  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError);
    return;
  }
  
  // Filter to only records from December 1, 2025
  const recordsToRemove = (allRecords || []).filter(record => {
    const reviewedDate = record.reviewed_at ? new Date(record.reviewed_at).toISOString().split('T')[0] : null;
    return reviewedDate === targetDate;
  });

  if (!recordsToRemove || recordsToRemove.length === 0) {
    console.log('✅ No records found to remove');
    return;
  }

  console.log(`Found ${recordsToRemove.length} records to remove:\n`);

  // Group by student for reporting
  const studentGroups = new Map<string, any[]>();
  recordsToRemove.forEach(record => {
    const sNumber = record.student_s_number;
    if (!studentGroups.has(sNumber)) {
      studentGroups.set(sNumber, []);
    }
    studentGroups.get(sNumber)!.push(record);
  });

  console.log(`Affecting ${studentGroups.size} students\n`);

  // Process each student
  let processedCount = 0;
  for (const [sNumber, records] of studentGroups.entries()) {
    processedCount++;
    const studentName = records[0].student_name || 'Unknown';
    
    console.log(`[${processedCount}/${studentGroups.size}] Processing ${studentName} (${sNumber})...`);
    
    // Calculate hours to subtract
    let volunteeringToRemove = 0;
    let socialToRemove = 0;
    
    records.forEach(record => {
      const hours = parseFloat(record.hours_requested || 0);
      const type = record.type || 'volunteering';
      
      console.log(`   - Removing ${hours} ${type} hours`);
      
      if (type === 'volunteering') {
        volunteeringToRemove += hours;
      } else {
        socialToRemove += hours;
      }
    });

    // Get current student hours
    const { data: student } = await supabase
      .from('students')
      .select('volunteering_hours, social_hours, total_hours')
      .eq('s_number', sNumber)
      .single();

    if (student) {
      const currentVolunteering = parseFloat(student.volunteering_hours || 0);
      const currentSocial = parseFloat(student.social_hours || 0);
      const currentTotal = parseFloat(student.total_hours || 0);

      const newVolunteering = Math.max(0, currentVolunteering - volunteeringToRemove);
      const newSocial = Math.max(0, currentSocial - socialToRemove);
      const newTotal = newVolunteering + newSocial;

      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);
      console.log(`   New: ${newVolunteering}V / ${newSocial}S / ${newTotal}T`);

      // Delete the hour requests
      for (const record of records) {
        await supabase
          .from('hour_requests')
          .delete()
          .eq('id', record.id);
      }

      // Update student hours
      await supabase
        .from('students')
        .update({
          volunteering_hours: newVolunteering,
          social_hours: newSocial,
          last_hour_update: new Date().toISOString()
        })
        .eq('s_number', sNumber);

      console.log(`   ✅ Updated\n`);
    } else {
      console.log(`   ⚠️  Student not found in database\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal students updated: ${studentGroups.size}`);
  console.log(`Total hour requests removed: ${recordsToRemove.length}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

removeYesterdayCSVHours()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

