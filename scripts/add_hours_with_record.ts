/**
 * Add hours to a student and create an approved hour_requests record for audit.
 * Matches the same logic as Admin "Adjust Hours" (updateStudentHours + createApprovedHourRequest).
 *
 * Run with: npx tsx scripts/add_hours_with_record.ts "<student_name>" <hours_to_add> [reason]
 * Example: npx tsx scripts/add_hours_with_record.ts "Vedika Nawal" 100
 * To remove: npx tsx scripts/add_hours_with_record.ts "Vedika Nawal" -100 "Removing previously added hours"
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const roundToHalf = (num: number) => Math.round(num * 2) / 2;

async function addHoursWithRecord(studentName: string, hoursToAdd: number, reason: string) {
  const nameLower = studentName.trim().toLowerCase();
  const { data: students, error: searchError } = await supabase
    .from('students')
    .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
    .ilike('name', `%${nameLower}%`);

  if (searchError) {
    console.error('Search error:', searchError);
    throw searchError;
  }

  const match = students?.[0];
  if (!match || !students?.length) {
    throw new Error(`Student not found: "${studentName}". Try exact name as in database.`);
  }
  if (students.length > 1) {
    console.log('Multiple matches; using first:', match.name, `(${match.s_number})`);
  }

  const studentId = match.id;
  const sNumber = (match.s_number || '').toLowerCase();
  const name = match.name || studentName;
  const currentVolunteering = parseFloat(String(match.volunteering_hours || 0)) || 0;
  const currentSocial = parseFloat(String(match.social_hours || 0)) || 0;
  const currentTotal = currentVolunteering + currentSocial;
  const newTotal = Math.max(0, roundToHalf(currentTotal + hoursToAdd));

  let updateData: Record<string, number>;
  let hoursAdded = { volunteering: 0, social: 0 };

  if (currentTotal > 0) {
    const volunteeringRatio = currentVolunteering / currentTotal;
    const socialRatio = currentSocial / currentTotal;
    let newVolunteering = roundToHalf(newTotal * volunteeringRatio);
    let newSocial = roundToHalf(newTotal * socialRatio);
    const sum = newVolunteering + newSocial;
    if (Math.abs(sum - newTotal) > 0.01) {
      const diff = newTotal - sum;
      if (newVolunteering >= newSocial) {
        newVolunteering = roundToHalf(newVolunteering + diff);
      } else {
        newSocial = roundToHalf(newSocial + diff);
      }
    }
    updateData = {
      volunteering_hours: Math.max(0, newVolunteering),
      social_hours: Math.max(0, newSocial),
    };
    hoursAdded.volunteering = newVolunteering - currentVolunteering;
    hoursAdded.social = newSocial - currentSocial;
  } else {
    updateData = { volunteering_hours: newTotal };
    hoursAdded.volunteering = newTotal;
  }

  const { data: studentAfter, error: updateError } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', studentId)
    .select()
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    throw updateError;
  }

  const eventDate = new Date().toISOString().split('T')[0];
  const baseReason = reason || 'Admin adjustment - hours added via script';

  if (hoursAdded.volunteering !== 0) {
    const isAddition = hoursAdded.volunteering > 0;
    await supabase.from('hour_requests').insert([
      {
        student_s_number: sNumber,
        student_name: name,
        event_name: `Manual Adjustment - ${isAddition ? 'Added' : 'Removed'} ${Math.abs(hoursAdded.volunteering)} volunteering hours`,
        event_date: eventDate,
        hours_requested: Math.abs(hoursAdded.volunteering),
        description: `Manual total hour adjustment by admin. ${baseReason}. Original volunteering: ${currentVolunteering}, New: ${studentAfter.volunteering_hours}, Adjustment: ${isAddition ? '+' : ''}${hoursAdded.volunteering}`,
        type: 'volunteering',
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Admin',
        admin_notes: baseReason,
      },
    ]);
  }
  if (hoursAdded.social !== 0) {
    const isAddition = hoursAdded.social > 0;
    await supabase.from('hour_requests').insert([
      {
        student_s_number: sNumber,
        student_name: name,
        event_name: `Manual Adjustment - ${isAddition ? 'Added' : 'Removed'} ${Math.abs(hoursAdded.social)} social credits`,
        event_date: eventDate,
        hours_requested: Math.abs(hoursAdded.social),
        description: `Manual total hour adjustment by admin. ${baseReason}. Original social: ${currentSocial}, New: ${studentAfter.social_hours}, Adjustment: ${isAddition ? '+' : ''}${hoursAdded.social}`,
        type: 'social',
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'Admin',
        admin_notes: baseReason,
      },
    ]);
  }

  console.log('✅ Added', hoursToAdd, 'hours to', name, `(${sNumber})`);
  console.log('   New total:', studentAfter.total_hours, 'hours (vol:', studentAfter.volunteering_hours, ', social:', studentAfter.social_hours, ')');
  console.log('   Audit record(s) created in hour_requests.');
}

const studentName = process.argv[2];
const hoursToAdd = parseFloat(process.argv[3]);
const reason = process.argv[4] || 'Admin adjustment - 100 hours added';

if (!studentName || isNaN(hoursToAdd) || hoursToAdd === 0) {
  console.error('Usage: npx tsx scripts/add_hours_with_record.ts "<student_name>" <hours_to_add> [reason]');
  console.error('Example: npx tsx scripts/add_hours_with_record.ts "Vedika Nawal" 100');
  console.error('Remove hours: npx tsx scripts/add_hours_with_record.ts "Vedika Nawal" -100');
  process.exit(1);
}

addHoursWithRecord(studentName, hoursToAdd, reason).then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
