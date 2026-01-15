import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function mergeBrookeJamesAccounts() {
  console.log('🔍 Finding Brooke James accounts...\n');

  // Search for Brooke James accounts (case-insensitive)
  const { data: students, error: searchError } = await supabase
    .from('students')
    .select('*')
    .or('name.ilike.%brooke james%,name.ilike.%james%brooke%');

  if (searchError) {
    console.error('❌ Error searching for students:', searchError);
    throw searchError;
  }

  if (!students || students.length === 0) {
    console.log('❌ No students found with name containing "Brooke James"');
    return;
  }

  // Filter to exact matches (case-insensitive)
  const brookeAccounts = students.filter(s => 
    (s.name || '').toLowerCase().includes('brooke') && 
    (s.name || '').toLowerCase().includes('james')
  );

  console.log(`✅ Found ${brookeAccounts.length} Brooke James account(s):\n`);

  brookeAccounts.forEach((student, index) => {
    console.log(`${index + 1}. S-Number: ${student.s_number}`);
    console.log(`   Name: ${student.name}`);
    console.log(`   ID: ${student.id}`);
    console.log(`   Volunteering Hours: ${student.volunteering_hours || 0}`);
    console.log(`   Social Hours: ${student.social_hours || 0}`);
    console.log(`   Total Hours: ${student.total_hours || 0}`);
    console.log('');
  });

  if (brookeAccounts.length < 2) {
    console.log('✅ Only one account found - no merge needed');
    return;
  }

  // Find the account with hours (keep this one)
  const accountWithHours = brookeAccounts.find(s => 
    (parseFloat(s.total_hours || 0) > 0) || 
    (parseFloat(s.volunteering_hours || 0) > 0) || 
    (parseFloat(s.social_hours || 0) > 0)
  );

  // Find the account without hours (merge/delete this one)
  const accountWithoutHours = brookeAccounts.find(s => 
    parseFloat(s.total_hours || 0) === 0 && 
    parseFloat(s.volunteering_hours || 0) === 0 && 
    parseFloat(s.social_hours || 0) === 0
  );

  if (!accountWithHours || !accountWithoutHours) {
    console.log('⚠️ Could not identify which account has hours and which doesn\'t');
    console.log('Please check the output above and manually merge if needed');
    return;
  }

  console.log('📊 Merge Plan:');
  console.log(`   ✅ KEEP: ${accountWithHours.s_number} (${accountWithHours.name}) - ${accountWithHours.total_hours || 0} hours`);
  console.log(`   ❌ MERGE/DELETE: ${accountWithoutHours.s_number} (${accountWithoutHours.name}) - ${accountWithoutHours.total_hours || 0} hours\n`);

  // Step 1: Update hour_requests to use the kept account's s_number
  console.log('🔄 Step 1: Updating hour_requests...');
  const { data: hourRequests, error: hrError } = await supabase
    .from('hour_requests')
    .select('id, student_s_number')
    .eq('student_s_number', accountWithoutHours.s_number.toLowerCase());

  if (hrError) {
    console.error('❌ Error fetching hour_requests:', hrError);
  } else if (hourRequests && hourRequests.length > 0) {
    console.log(`   Found ${hourRequests.length} hour_requests to update`);
    
    const { error: updateHrError } = await supabase
      .from('hour_requests')
      .update({ student_s_number: accountWithHours.s_number.toLowerCase() })
      .eq('student_s_number', accountWithoutHours.s_number.toLowerCase());

    if (updateHrError) {
      console.error('❌ Error updating hour_requests:', updateHrError);
    } else {
      console.log(`   ✅ Updated ${hourRequests.length} hour_requests to use ${accountWithHours.s_number}`);
    }
  } else {
    console.log('   ℹ️ No hour_requests found for this account');
  }

  // Step 2: Update meeting_attendance
  console.log('\n🔄 Step 2: Updating meeting_attendance...');
  const { data: attendance, error: attError } = await supabase
    .from('meeting_attendance')
    .select('id, student_s_number')
    .eq('student_s_number', accountWithoutHours.s_number.toLowerCase());

  if (attError) {
    console.error('❌ Error fetching meeting_attendance:', attError);
  } else if (attendance && attendance.length > 0) {
    console.log(`   Found ${attendance.length} attendance records to update`);
    
    // Check for duplicates first
    const { data: existingAttendance } = await supabase
      .from('meeting_attendance')
      .select('meeting_id, student_s_number')
      .eq('student_s_number', accountWithHours.s_number.toLowerCase());

    const existingMeetingIds = new Set((existingAttendance || []).map(a => a.meeting_id));

    // Only update records that won't create duplicates
    const toUpdate = attendance.filter(a => !existingMeetingIds.has(a.meeting_id));
    const toDelete = attendance.filter(a => existingMeetingIds.has(a.meeting_id));

    if (toUpdate.length > 0) {
      const { error: updateAttError } = await supabase
        .from('meeting_attendance')
        .update({ student_s_number: accountWithHours.s_number.toLowerCase() })
        .in('id', toUpdate.map(a => a.id));

      if (updateAttError) {
        console.error('❌ Error updating meeting_attendance:', updateAttError);
      } else {
        console.log(`   ✅ Updated ${toUpdate.length} attendance records`);
      }
    }

    if (toDelete.length > 0) {
      console.log(`   ℹ️ Skipping ${toDelete.length} attendance records (would create duplicates)`);
      const { error: deleteAttError } = await supabase
        .from('meeting_attendance')
        .delete()
        .in('id', toDelete.map(a => a.id));

      if (deleteAttError) {
        console.error('❌ Error deleting duplicate attendance:', deleteAttError);
      } else {
        console.log(`   ✅ Deleted ${toDelete.length} duplicate attendance records`);
      }
    }
  } else {
    console.log('   ℹ️ No meeting_attendance found for this account');
  }

  // Step 3: Update event_attendees (if they have student_id)
  console.log('\n🔄 Step 3: Checking event_attendees...');
  const { data: authUser, error: authError } = await supabase
    .from('auth_users')
    .select('id, s_number')
    .eq('s_number', accountWithoutHours.s_number.toLowerCase())
    .maybeSingle();

  if (authError) {
    console.error('❌ Error fetching auth_users:', authError);
  } else if (authUser) {
    const { data: eventAttendees, error: eaError } = await supabase
      .from('event_attendees')
      .select('id, event_id, student_id')
      .eq('student_id', authUser.id);

    if (eaError) {
      console.error('❌ Error fetching event_attendees:', eaError);
    } else if (eventAttendees && eventAttendees.length > 0) {
      console.log(`   Found ${eventAttendees.length} event_attendees to update`);

      // Get the kept account's auth_user
      const { data: keptAuthUser } = await supabase
        .from('auth_users')
        .select('id, s_number')
        .eq('s_number', accountWithHours.s_number.toLowerCase())
        .maybeSingle();

      if (keptAuthUser) {
        // Check for duplicates
        const { data: existingEa } = await supabase
          .from('event_attendees')
          .select('event_id, student_id')
          .eq('student_id', keptAuthUser.id);

        const existingEventIds = new Set((existingEa || []).map(ea => ea.event_id));

        const toUpdate = eventAttendees.filter(ea => !existingEventIds.has(ea.event_id));
        const toDelete = eventAttendees.filter(ea => existingEventIds.has(ea.event_id));

        if (toUpdate.length > 0) {
          const { error: updateEaError } = await supabase
            .from('event_attendees')
            .update({ student_id: keptAuthUser.id })
            .in('id', toUpdate.map(ea => ea.id));

          if (updateEaError) {
            console.error('❌ Error updating event_attendees:', updateEaError);
          } else {
            console.log(`   ✅ Updated ${toUpdate.length} event_attendees`);
          }
        }

        if (toDelete.length > 0) {
          const { error: deleteEaError } = await supabase
            .from('event_attendees')
            .delete()
            .in('id', toDelete.map(ea => ea.id));

          if (deleteEaError) {
            console.error('❌ Error deleting duplicate event_attendees:', deleteEaError);
          } else {
            console.log(`   ✅ Deleted ${toDelete.length} duplicate event_attendees`);
          }
        }
      }
    } else {
      console.log('   ℹ️ No event_attendees found for this account');
    }
  } else {
    console.log('   ℹ️ No auth_user found for account without hours (no event_attendees to update)');
  }

  // Step 4: Delete auth_user for the account without hours
  console.log('\n🔄 Step 4: Deleting auth_user for duplicate account...');
  if (authUser) {
    const { error: deleteAuthError } = await supabase
      .from('auth_users')
      .delete()
      .eq('id', authUser.id);

    if (deleteAuthError) {
      console.error('❌ Error deleting auth_user:', deleteAuthError);
    } else {
      console.log(`   ✅ Deleted auth_user for ${accountWithoutHours.s_number}`);
    }
  } else {
    console.log('   ℹ️ No auth_user found to delete');
  }

  // Step 5: Delete the student record without hours
  console.log('\n🔄 Step 5: Deleting duplicate student record...');
  const { error: deleteStudentError } = await supabase
    .from('students')
    .delete()
    .eq('id', accountWithoutHours.id);

  if (deleteStudentError) {
    console.error('❌ Error deleting student record:', deleteStudentError);
    throw deleteStudentError;
  } else {
    console.log(`   ✅ Deleted student record for ${accountWithoutHours.s_number}`);
  }

  // Final verification
  console.log('\n✅ Merge Complete!');
  console.log(`   ✅ Kept: ${accountWithHours.s_number} (${accountWithHours.name})`);
  console.log(`   ❌ Deleted: ${accountWithoutHours.s_number} (${accountWithoutHours.name})`);
  console.log('\n📊 Verifying merge...');

  const { data: finalCheck } = await supabase
    .from('students')
    .select('*')
    .or('name.ilike.%brooke james%,name.ilike.%james%brooke%');

  const finalBrookeAccounts = (finalCheck || []).filter(s => 
    (s.name || '').toLowerCase().includes('brooke') && 
    (s.name || '').toLowerCase().includes('james')
  );

  if (finalBrookeAccounts.length === 1) {
    console.log(`   ✅ Success! Only one Brooke James account remains: ${finalBrookeAccounts[0].s_number}`);
  } else {
    console.log(`   ⚠️ Warning: ${finalBrookeAccounts.length} Brooke James accounts still found`);
  }
}

// Run the merge
mergeBrookeJamesAccounts()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
