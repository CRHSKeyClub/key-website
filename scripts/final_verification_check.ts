import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface VerificationResult {
  studentName: string;
  studentNumber: string;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  calculatedVolunteering: number;
  calculatedSocial: number;
  calculatedTotal: number;
  volunteeringDiff: number;
  socialDiff: number;
  totalDiff: number;
  status: 'MATCH' | 'MISMATCH';
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
}

async function finalVerificationCheck() {
  console.log('🔍 Running Final Verification Check...\n');
  console.log('=' .repeat(100) + '\n');

  // Get all students
  let allStudents: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log('📥 Fetching all students...');
  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('students')
      .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch);
      offset += limit;
      hasMore = batch.length === limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students\n`);

  const results: VerificationResult[] = [];
  const mismatches: VerificationResult[] = [];
  let totalChecked = 0;

  for (const student of allStudents) {
    totalChecked++;
    
    if (totalChecked % 50 === 0) {
      console.log(`📊 Progress: ${totalChecked}/${allStudents.length} students checked...`);
    }

    // Get all approved hour requests
    const { data: allRequests } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, status, event_name')
      .eq('student_s_number', student.s_number);

    // Calculate totals from approved requests only
    let calculatedVolunteering = 0;
    let calculatedSocial = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    (allRequests || []).forEach((req: any) => {
      const status = (req.status || '').toLowerCase();
      
      if (status === 'approved') {
        approvedCount++;
        const hours = parseFloat(req.hours_requested || 0) || 0;
        const type = (req.type || 'volunteering').toLowerCase();
        
        if (type === 'volunteering') {
          calculatedVolunteering += hours;
        } else {
          calculatedSocial += hours;
        }
      } else if (status === 'pending') {
        pendingCount++;
      } else if (status === 'rejected') {
        rejectedCount++;
      }
    });

    const calculatedTotal = calculatedVolunteering + calculatedSocial;

    // Get student's current hours
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    // Calculate differences
    const volunteeringDiff = Math.abs(dbVolunteering - calculatedVolunteering);
    const socialDiff = Math.abs(dbSocial - calculatedSocial);
    const totalDiff = Math.abs(dbTotal - calculatedTotal);

    // Check if there's a mismatch (allowing for small floating point differences)
    const hasMismatch = volunteeringDiff > 0.01 || socialDiff > 0.01 || totalDiff > 0.01;

    const result: VerificationResult = {
      studentName: student.name || 'Unknown',
      studentNumber: student.s_number,
      dbVolunteering,
      dbSocial,
      dbTotal,
      calculatedVolunteering,
      calculatedSocial,
      calculatedTotal,
      volunteeringDiff,
      socialDiff,
      totalDiff,
      status: hasMismatch ? 'MISMATCH' : 'MATCH',
      approvedRequests: approvedCount,
      pendingRequests: pendingCount,
      rejectedRequests: rejectedCount
    };

    results.push(result);

    if (hasMismatch) {
      mismatches.push(result);
    }

    // Small delay to avoid rate limiting
    if (totalChecked % 20 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(100) + '\n');

  console.log(`Total Students Checked: ${results.length}`);
  console.log(`✅ Matching Records: ${results.filter(r => r.status === 'MATCH').length}`);
  console.log(`❌ Mismatched Records: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('='.repeat(100));
    console.log('⚠️  DISCREPANCIES FOUND');
    console.log('='.repeat(100) + '\n');

    mismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. ${mismatch.studentName} (${mismatch.studentNumber})`);
      console.log(`   Database Hours:`);
      console.log(`      Volunteering: ${mismatch.dbVolunteering}`);
      console.log(`      Social: ${mismatch.dbSocial}`);
      console.log(`      Total: ${mismatch.dbTotal}`);
      console.log(`   Calculated from Approved Requests:`);
      console.log(`      Volunteering: ${mismatch.calculatedVolunteering}`);
      console.log(`      Social: ${mismatch.calculatedSocial}`);
      console.log(`      Total: ${mismatch.calculatedTotal}`);
      console.log(`   Differences:`);
      console.log(`      Volunteering: ${mismatch.volunteeringDiff > 0.01 ? '⚠️  ' : '✓ '}${mismatch.volunteeringDiff.toFixed(2)}`);
      console.log(`      Social: ${mismatch.socialDiff > 0.01 ? '⚠️  ' : '✓ '}${mismatch.socialDiff.toFixed(2)}`);
      console.log(`      Total: ${mismatch.totalDiff > 0.01 ? '⚠️  ' : '✓ '}${mismatch.totalDiff.toFixed(2)}`);
      console.log(`   Request Counts: ${mismatch.approvedRequests} approved, ${mismatch.pendingRequests} pending, ${mismatch.rejectedRequests} rejected\n`);
    });
  } else {
    console.log('🎉 ALL HOURS MATCH PERFECTLY! 🎉\n');
    console.log('All student hours are correctly synchronized with their approved hour requests.\n');
  }

  // Calculate some statistics
  const totalVolunteeringHours = results.reduce((sum, r) => sum + r.dbVolunteering, 0);
  const totalSocialHours = results.reduce((sum, r) => sum + r.dbSocial, 0);
  const totalAllHours = results.reduce((sum, r) => sum + r.dbTotal, 0);
  const totalApprovedRequests = results.reduce((sum, r) => sum + r.approvedRequests, 0);
  const totalPendingRequests = results.reduce((sum, r) => sum + r.pendingRequests, 0);
  const totalRejectedRequests = results.reduce((sum, r) => sum + r.rejectedRequests, 0);

  console.log('='.repeat(100));
  console.log('📈 OVERALL STATISTICS');
  console.log('='.repeat(100) + '\n');
  console.log(`Total Volunteering Hours: ${totalVolunteeringHours.toFixed(2)}`);
  console.log(`Total Social Hours: ${totalSocialHours.toFixed(2)}`);
  console.log(`Total All Hours: ${totalAllHours.toFixed(2)}`);
  console.log(`\nTotal Approved Requests: ${totalApprovedRequests}`);
  console.log(`Total Pending Requests: ${totalPendingRequests}`);
  console.log(`Total Rejected Requests: ${totalRejectedRequests}`);
  console.log(`Total All Requests: ${totalApprovedRequests + totalPendingRequests + totalRejectedRequests}\n`);

  // Students with most hours
  const topStudents = [...results]
    .sort((a, b) => b.dbTotal - a.dbTotal)
    .slice(0, 10);

  console.log('='.repeat(100));
  console.log('🏆 TOP 10 STUDENTS BY TOTAL HOURS');
  console.log('='.repeat(100) + '\n');
  topStudents.forEach((student, index) => {
    console.log(`${index + 1}. ${student.studentName}`);
    console.log(`   Total: ${student.dbTotal} hours (${student.dbVolunteering}V + ${student.dbSocial}S)`);
    console.log(`   Approved Requests: ${student.approvedRequests}\n`);
  });

  // Save detailed report to JSON
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalStudents: results.length,
      matchingRecords: results.filter(r => r.status === 'MATCH').length,
      mismatchedRecords: mismatches.length,
      totalVolunteeringHours,
      totalSocialHours,
      totalAllHours,
      totalApprovedRequests,
      totalPendingRequests,
      totalRejectedRequests
    },
    mismatches: mismatches,
    topStudents: topStudents,
    allResults: results
  };

  const reportPath = 'final_verification_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log('='.repeat(100));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  console.log('='.repeat(100) + '\n');

  return mismatches.length === 0;
}

finalVerificationCheck()
  .then((allMatch) => {
    if (allMatch) {
      console.log('✅ VERIFICATION PASSED - All hours are correct!\n');
      process.exit(0);
    } else {
      console.log('⚠️  VERIFICATION COMPLETED - Some discrepancies found (see above)\n');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

