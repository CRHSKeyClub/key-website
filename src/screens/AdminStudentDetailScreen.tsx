import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

interface Student {
  id: string;
  name?: string;
  student_name?: string;
  s_number?: string;
  student_s_number?: string;
  total_hours?: number;
  volunteering_hours?: number;
  social_hours?: number;
  tshirt_size?: string;
  email?: string;
  account_status?: string;
  created_at?: string;
}

interface HourRequest {
  id: string;
  student_s_number: string;
  student_name: string;
  event_name: string;
  event_date: string;
  hours_requested: number;
  description: string;
  type?: 'volunteering' | 'social';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  image_name?: string;
}

interface AttendanceRecord {
  id: string;
  student_s_number: string;
  meeting_id: string;
  attendance_code: string;
  session_type?: string;
  submitted_at: string;
  marked_at?: string;
  meetings?: {
    id: string;
    meeting_date: string;
    meeting_type?: string;
    is_open: boolean;
  };
}

export default function AdminStudentDetailScreen() {
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [student, setStudent] = useState<Student | null>(null);
  const [hourRequests, setHourRequests] = useState<HourRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'hours' | 'attendance'>('overview');
  const [showAdjustHoursModal, setShowAdjustHoursModal] = useState(false);
  const [showTransferHoursModal, setShowTransferHoursModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment: 0,
    reason: ''
  });
  const [transferData, setTransferData] = useState({
    amount: 0,
    fromType: 'volunteering' as 'volunteering' | 'social',
    toType: 'social' as 'volunteering' | 'social',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [reviewModal, setReviewModal] = useState({
    visible: false,
    request: null as HourRequest | null,
    action: null as 'approve' | 'reject' | null,
    notes: ''
  });
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    if (studentId) {
      loadStudentData();
    }
  }, [isAdmin, navigate, studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      
      // Decode the S-number from URL
      const searchSNumber = decodeURIComponent(studentId).toLowerCase().trim();
      
      // Load student info
      const result = await SupabaseService.getAllStudents();
      const studentsData = result.data || [];
      
      console.log('Searching for student with S-number:', searchSNumber);
      console.log('Total students loaded:', studentsData.length);
      
      // Normalize S-number for comparison (remove any 's' prefix and compare)
      const normalizeSNumber = (sNum: string) => {
        return sNum.toLowerCase().trim().replace(/^s/, '');
      };
      
      // Find student by S-number (primary) or ID (fallback)
      let foundStudent = studentsData.find((s: Student) => {
        const studentSNumber = (s.s_number || s.student_s_number || '').toLowerCase().trim();
        return normalizeSNumber(studentSNumber) === normalizeSNumber(searchSNumber) || studentSNumber === searchSNumber;
      });
      
      // Fallback: try by ID if not found by S-number
      if (!foundStudent) {
        foundStudent = studentsData.find((s: Student) => s.id === studentId);
      }
      
      if (!foundStudent) {
        console.error('Student not found. Looking for S-number:', searchSNumber);
        console.error('Sample students (first 5):', studentsData.slice(0, 5).map((s: Student) => ({
          id: s.id,
          s_number: s.s_number || s.student_s_number,
          name: s.name || s.student_name,
          student_name: s.student_name
        })));
        showModal({
          title: 'Error',
          message: 'Student not found.',
          onCancel: () => {},
          onConfirm: () => navigate('/admin-students'),
          cancelText: '',
          confirmText: 'OK',
          icon: 'alert-circle',
          iconColor: '#ff4d4d'
        });
        return;
      }

      console.log('Found student:', {
        id: foundStudent.id,
        s_number: foundStudent.s_number || foundStudent.student_s_number,
        name: foundStudent.name,
        student_name: foundStudent.student_name,
        fullObject: foundStudent
      });
      setStudent(foundStudent);
      
      // Get S-number for fetching related data (normalize to lowercase for consistency)
      const studentSNumber = (foundStudent.s_number || foundStudent.student_s_number)?.toLowerCase();
      
      if (studentSNumber) {
        console.log('Loading attendance for student S-number:', studentSNumber);
        // Load hour requests and attendance in parallel
        const [requests, attendance] = await Promise.all([
          SupabaseService.getStudentHourRequests(studentSNumber).catch((err) => {
            console.error('Error loading hour requests:', err);
            return [];
          }),
          SupabaseService.getStudentAttendance(studentSNumber).catch((err) => {
            console.error('Error loading attendance:', err);
            return [];
          })
        ]);
        
        console.log('Loaded attendance records:', attendance.length);
        
        setHourRequests(requests);
        setAttendanceRecords(attendance);
      }
    } catch (error) {
      console.error('Failed to load student data:', error);
      showModal({
        title: 'Error',
        message: 'Failed to load student data. Please try again.',
        onCancel: () => {},
        onConfirm: () => navigate('/admin-students'),
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400 bg-opacity-20 border-green-400';
      case 'rejected': return 'text-red-400 bg-red-400 bg-opacity-20 border-red-400';
      case 'pending': return 'text-yellow-400 bg-yellow-400 bg-opacity-20 border-yellow-400';
      default: return 'text-gray-400 bg-gray-400 bg-opacity-20 border-gray-400';
    }
  };

  const handleReviewRequest = (request: HourRequest, action: 'approve' | 'reject') => {
    setReviewModal({
      visible: true,
      request,
      action,
      notes: ''
    });
  };

  const submitReview = async () => {
    if (!reviewModal.request || !reviewModal.action) return;

    const { request, action, notes } = reviewModal;
    const requestId = request.id;

    if (processingRequest === requestId) return;
    setProcessingRequest(requestId);

    // Close modal immediately
    setReviewModal({ visible: false, request: null, action: null, notes: '' });

    try {
      const result = await SupabaseService.updateHourRequestStatus(
        requestId,
        action === 'approve' ? 'approved' : 'rejected',
        notes,
        'Admin',
        request.hours_requested
      );

      if (result) {
        await loadStudentData();
        showModal({
          title: 'Success',
          message: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`,
          onCancel: () => {},
          onConfirm: () => {},
          cancelText: '',
          confirmText: 'OK',
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
      } else {
        await loadStudentData();
        showModal({
          title: 'Error',
          message: 'Failed to update request status',
          onCancel: () => {},
          onConfirm: () => {},
          cancelText: '',
          confirmText: 'OK',
          icon: 'alert-circle',
          iconColor: '#ff4d4d'
        });
      }
    } catch (error) {
      console.error('Error processing request:', error);
      await loadStudentData();
      showModal({
        title: 'Error',
        message: 'An error occurred while processing the request',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeleteHourRequest = async (requestId: string, eventName: string) => {
    showModal({
      title: 'Delete Hour Request',
      message: `Are you sure you want to permanently delete the hour request for "${eventName}"? This action cannot be undone.`,
      onCancel: () => {},
      onConfirm: async () => {
        try {
          await SupabaseService.deleteHourRequest(requestId);
          await loadStudentData();
          showModal({
            title: 'Success',
            message: 'Hour request deleted successfully.',
            onCancel: () => {},
            onConfirm: () => {},
            cancelText: '',
            confirmText: 'OK',
            icon: 'checkmark-circle',
            iconColor: '#4CAF50'
          });
        } catch (error) {
          console.error('Failed to delete hour request:', error);
          showModal({
            title: 'Error',
            message: 'Failed to delete hour request. Please try again.',
            onCancel: () => {},
            onConfirm: () => {},
            cancelText: '',
            confirmText: 'OK',
            icon: 'alert-circle',
            iconColor: '#ff4d4d'
          });
        }
      },
      cancelText: 'Cancel',
      confirmText: 'Delete',
      icon: 'alert-circle',
      iconColor: '#ff4d4d'
    });
  };

  const handleAdjustHours = () => {
    setAdjustmentData({
      adjustment: 0,
      reason: ''
    });
    setShowAdjustHoursModal(true);
  };

  const handleTransferHours = () => {
    setTransferData({
      amount: 0,
      fromType: 'volunteering',
      toType: 'social',
      reason: ''
    });
    setShowTransferHoursModal(true);
  };

  const handleAdjustmentStep = (delta: number) => {
    setAdjustmentData(prev => {
      const nextRaw = Number((prev.adjustment + delta).toFixed(1));
      if (!Number.isFinite(nextRaw)) {
        return prev;
      }
      const minAllowed = -(student?.total_hours || 0);
      const clampedValue = Math.min(
        Math.max(nextRaw, minAllowed),
        Number.POSITIVE_INFINITY
      );
      return {
        ...prev,
        adjustment: clampedValue
      };
    });
  };

  const handleTransferStep = (delta: number) => {
    setTransferData(prev => {
      const nextRaw = Number((prev.amount + delta).toFixed(1));
      if (!Number.isFinite(nextRaw)) {
        return prev;
      }
      const maxAllowed = prev.fromType === 'volunteering' 
        ? (student?.volunteering_hours || 0)
        : (student?.social_hours || 0);
      const clampedValue = Math.min(
        Math.max(nextRaw, 0),
        maxAllowed
      );
      return {
        ...prev,
        amount: clampedValue
      };
    });
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustmentData.reason.trim()) {
      showModal({
        title: 'Error',
        message: 'Please provide a reason for the hour adjustment.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    if (!student) return;

    setSubmitting(true);
    try {
      const newTotalHours = (student.total_hours || 0) + adjustmentData.adjustment;
      await SupabaseService.updateStudentHours(student.id, newTotalHours, 'total');
      
      // Create audit trail
      const adjustmentRequest = {
        studentSNumber: student.s_number || student.student_s_number || '',
        studentName: student.name || student.student_name || '',
        eventName: `Manual Adjustment - ${adjustmentData.adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustmentData.adjustment)} hours`,
        eventDate: new Date().toISOString().split('T')[0],
        hoursRequested: Math.abs(adjustmentData.adjustment).toString(),
        description: `Manual hour adjustment by admin. Reason: ${adjustmentData.reason}. Original hours: ${student.total_hours || 0}, New total: ${newTotalHours}, Adjustment: ${adjustmentData.adjustment > 0 ? '+' : ''}${adjustmentData.adjustment}`,
        type: 'volunteering' as const,
        imageData: null,
        imageName: null
      };
      await SupabaseService.submitHourRequest(adjustmentRequest);
      
      await loadStudentData();
      setShowAdjustHoursModal(false);
      
      showModal({
        title: 'Success',
        message: `Successfully ${adjustmentData.adjustment > 0 ? 'added' : 'removed'} ${Math.abs(adjustmentData.adjustment)} hour${Math.abs(adjustmentData.adjustment) === 1 ? '' : 's'}. New total: ${newTotalHours} hours.`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to adjust hours:', error);
      showModal({
        title: 'Error',
        message: 'Failed to adjust hours. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTransfer = async () => {
    if (!transferData.reason.trim()) {
      showModal({
        title: 'Error',
        message: 'Please provide a reason for transferring hours.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    if (!student || transferData.amount <= 0) return;

    setSubmitting(true);
    try {
      const currentVolunteering = student.volunteering_hours || 0;
      const currentSocial = student.social_hours || 0;
      
      let newVolunteering = currentVolunteering;
      let newSocial = currentSocial;
      
      if (transferData.fromType === 'volunteering') {
        newVolunteering = currentVolunteering - transferData.amount;
        newSocial = currentSocial + transferData.amount;
      } else {
        newSocial = currentSocial - transferData.amount;
        newVolunteering = currentVolunteering + transferData.amount;
      }

      // Update both hour types
      await SupabaseService.updateStudentHours(student.id, newVolunteering, 'volunteering');
      await SupabaseService.updateStudentHours(student.id, newSocial, 'social');
      
      // Create audit trail
      const transferRequest = {
        studentSNumber: student.s_number || student.student_s_number || '',
        studentName: student.name || student.student_name || '',
        eventName: `Hour Transfer - ${transferData.amount} hour${transferData.amount === 1 ? '' : 's'} from ${transferData.fromType} to ${transferData.toType}`,
        eventDate: new Date().toISOString().split('T')[0],
        hoursRequested: transferData.amount.toString(),
        description: `Hour transfer by admin. Reason: ${transferData.reason}. Transferred ${transferData.amount} hour${transferData.amount === 1 ? '' : 's'} from ${transferData.fromType} to ${transferData.toType}. Before: Volunteering: ${currentVolunteering}, Social: ${currentSocial}. After: Volunteering: ${newVolunteering}, Social: ${newSocial}.`,
        type: transferData.toType,
        imageData: null,
        imageName: null
      };
      await SupabaseService.submitHourRequest(transferRequest);
      
      await loadStudentData();
      setShowTransferHoursModal(false);
      
      showModal({
        title: 'Success',
        message: `Successfully transferred ${transferData.amount} hour${transferData.amount === 1 ? '' : 's'} from ${transferData.fromType} to ${transferData.toType}.`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to transfer hours:', error);
      showModal({
        title: 'Error',
        message: 'Failed to transfer hours. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId: string, meetingDate: string) => {
    showModal({
      title: 'Revoke Attendance',
      message: `Are you sure you want to permanently revoke attendance for the meeting on ${formatDate(meetingDate)}? This action cannot be undone.`,
      onCancel: () => {},
      onConfirm: async () => {
        try {
          await SupabaseService.deleteAttendance(attendanceId);
          await loadStudentData();
          showModal({
            title: 'Success',
            message: 'Attendance revoked successfully.',
            onCancel: () => {},
            onConfirm: () => {},
            cancelText: '',
            confirmText: 'OK',
            icon: 'checkmark-circle',
            iconColor: '#4CAF50'
          });
        } catch (error) {
          console.error('Failed to delete attendance:', error);
          showModal({
            title: 'Error',
            message: 'Failed to revoke attendance. Please try again.',
            onCancel: () => {},
            onConfirm: () => {},
            cancelText: '',
            confirmText: 'OK',
            icon: 'alert-circle',
            iconColor: '#ff4d4d'
          });
        }
      },
      cancelText: 'Cancel',
      confirmText: 'Revoke',
      icon: 'alert-circle',
      iconColor: '#ff4d4d'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  const sNumber = student.s_number || student.student_s_number || 'N/A';
  // Try all possible name fields
  const studentName = student.name || 
                      student.student_name || 
                      (student as any).studentName ||
                      (sNumber !== 'N/A' ? `Student ${sNumber}` : 'Unknown Student');
  const totalHours = student.total_hours || 0;
  const volunteeringHours = student.volunteering_hours || 0;
  const socialHours = student.social_hours || 0;

  const approvedHours = hourRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (parseFloat(r.hours_requested as any) || 0), 0);
  const pendingHours = hourRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + (parseFloat(r.hours_requested as any) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 bg-opacity-90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin-students')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Student Details</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-6xl mx-auto"
        >
          {/* Student Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-600"
          >
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{studentName}</h2>
                <p className="text-blue-300 text-lg mb-1">S-Number: {sNumber}</p>
                {student.email && (
                  <p className="text-gray-400 text-sm">{student.email}</p>
                )}
                {student.tshirt_size && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      T-Shirt: {student.tshirt_size}
                    </span>
                  </div>
                )}
              </div>

              {/* Hours Summary */}
              <div className="text-right">
                <div className="text-4xl font-bold text-blue-400 mb-1">{totalHours.toFixed(1)}</div>
                <div className="text-gray-300 text-sm">Total Hours</div>
                <div className="flex gap-4 mt-3 text-sm">
                  <div>
                    <div className="text-green-400 font-semibold">{volunteeringHours.toFixed(1)}</div>
                    <div className="text-gray-400">Volunteering</div>
                  </div>
                  <div>
                    <div className="text-purple-400 font-semibold">{socialHours.toFixed(1)}</div>
                    <div className="text-gray-400">Social</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAdjustHours}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Adjust Hours
                  </button>
                  <button
                    onClick={handleTransferHours}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Transfer Hours
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'hours'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hour Requests ({hourRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'attendance'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Attendance ({attendanceRecords.length})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Hours Breakdown */}
              <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                <h3 className="text-xl font-bold text-blue-400 mb-4">Hours Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-300 text-sm mb-1">Total Hours</div>
                    <div className="text-2xl font-bold text-white">{totalHours.toFixed(1)}</div>
                  </div>
                  <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-300 text-sm mb-1">Volunteering Hours</div>
                    <div className="text-2xl font-bold text-green-400">{volunteeringHours.toFixed(1)}</div>
                  </div>
                  <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                    <div className="text-gray-300 text-sm mb-1">Social Hours</div>
                    <div className="text-2xl font-bold text-purple-400">{socialHours.toFixed(1)}</div>
                  </div>
                </div>
                
                {hourRequests.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-600 bg-opacity-20 rounded-lg p-3 border border-green-500">
                        <div className="text-gray-300 text-sm mb-1">Approved Hours</div>
                        <div className="text-xl font-bold text-green-400">{approvedHours.toFixed(1)}</div>
                      </div>
                      <div className="bg-yellow-600 bg-opacity-20 rounded-lg p-3 border border-yellow-500">
                        <div className="text-gray-300 text-sm mb-1">Pending Hours</div>
                        <div className="text-xl font-bold text-yellow-400">{pendingHours.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">Hour Requests</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Requests</span>
                      <span className="text-white font-semibold">{hourRequests.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Approved</span>
                      <span className="text-green-400 font-semibold">
                        {hourRequests.filter(r => r.status === 'approved').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Pending</span>
                      <span className="text-yellow-400 font-semibold">
                        {hourRequests.filter(r => r.status === 'pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Rejected</span>
                      <span className="text-red-400 font-semibold">
                        {hourRequests.filter(r => r.status === 'rejected').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                  <h3 className="text-xl font-bold text-blue-400 mb-4">Meeting Attendance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Meetings Attended</span>
                      <span className="text-white font-semibold">{attendanceRecords.length}</span>
                    </div>
                    {student.created_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Account Created</span>
                        <span className="text-white font-semibold">{formatDate(student.created_at)}</span>
                      </div>
                    )}
                    {student.account_status && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Account Status</span>
                        <span className={`font-semibold ${
                          student.account_status === 'active' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {student.account_status.charAt(0).toUpperCase() + student.account_status.slice(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'hours' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {hourRequests.length === 0 ? (
                <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-12 border border-slate-600 text-center">
                  <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2">No Hour Requests</h3>
                  <p className="text-slate-400">This student hasn't submitted any hour requests yet.</p>
                </div>
              ) : (
                hourRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-xl font-bold text-white">{request.event_name}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">Event Date: {formatDate(request.event_date)}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-blue-400 font-semibold">Hours Requested: {request.hours_requested}</p>
                          {request.type && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              request.type === 'social' 
                                ? 'bg-purple-600 bg-opacity-30 text-purple-300 border border-purple-500'
                                : 'bg-blue-600 bg-opacity-30 text-blue-300 border border-blue-500'
                            }`}>
                              {request.type === 'social' ? 'Social' : 'Volunteering'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReviewRequest(request, 'approve')}
                              disabled={processingRequest === request.id}
                              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400 hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Approve request"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleReviewRequest(request, 'reject')}
                              disabled={processingRequest === request.id}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400 hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reject request"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteHourRequest(request.id, request.event_name)}
                          disabled={processingRequest === request.id}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400 hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete hour request"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {request.description && (
                      <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">
                          {request.description.replace(/\[PHOTO_DATA:.*?\]/g, '[Photo Attached]').replace(/\[PHOTO_STORAGE:.*?\]/g, '[Photo Attached]')}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <div>
                        Submitted: {formatDateTime(request.submitted_at)}
                      </div>
                      {request.reviewed_at && (
                        <div>
                          {request.reviewed_by && `${request.reviewed_by} - `}
                          Reviewed: {formatDateTime(request.reviewed_at)}
                        </div>
                      )}
                    </div>

                    {request.admin_notes && (
                      <div className="mt-4 pt-4 border-t border-slate-600">
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold">Admin Notes:</span> {request.admin_notes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {attendanceRecords.length === 0 ? (
                <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-12 border border-slate-600 text-center">
                  <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <h3 className="text-2xl font-bold text-white mb-2">No Attendance Records</h3>
                  <p className="text-slate-400">This student hasn't marked attendance for any meetings yet.</p>
                </div>
              ) : (
                attendanceRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white mb-1">
                          {record.meetings?.meeting_date ? formatDate(record.meetings.meeting_date) : 'Unknown Date'}
                        </h4>
                        {record.meetings?.meeting_type && (
                          <p className="text-blue-400 text-sm mb-2">{record.meetings.meeting_type}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>Submitted: {formatDateTime(record.submitted_at)}</span>
                          {record.session_type && (
                            <span className="px-2 py-1 bg-blue-600 bg-opacity-20 rounded text-blue-300">
                              {record.session_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">✓ Attended</div>
                          <div className="text-gray-400 text-xs mt-1">
                            Code: {record.attendance_code}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAttendance(record.id, record.meetings?.meeting_date || '')}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400 hover:bg-opacity-20 rounded-lg transition-colors"
                          title="Revoke attendance"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Adjust Hours Modal */}
      {showAdjustHoursModal && student && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Adjust Total Hours</h3>
            
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-gray-700"><span className="font-medium">Student:</span> {studentName}</p>
              <p className="text-gray-700"><span className="font-medium">Current Total Hours:</span> {totalHours.toFixed(1)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Adjust Hours</label>
              <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => handleAdjustmentStep(-0.5)}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  −
                </button>
                <div className="text-center min-w-[120px]">
                  <div className="text-3xl font-bold text-gray-900">
                    {(totalHours + adjustmentData.adjustment).toFixed(1)}
                  </div>
                  {adjustmentData.adjustment !== 0 && (
                    <div className={`text-sm ${adjustmentData.adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {adjustmentData.adjustment > 0 ? '+' : ''}{adjustmentData.adjustment.toFixed(1)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAdjustmentStep(0.5)}
                  className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => setAdjustmentData(prev => ({ ...prev, adjustment: 0 }))}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Reason for Adjustment</label>
              <textarea
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for this hour adjustment..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustHoursModal(false)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAdjustment}
                disabled={submitting || !adjustmentData.reason.trim()}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Transfer Hours Modal */}
      {showTransferHoursModal && student && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Transfer Hours</h3>
            
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-gray-700"><span className="font-medium">Student:</span> {studentName}</p>
              <p className="text-gray-700"><span className="font-medium">Current Volunteering:</span> {volunteeringHours.toFixed(1)}</p>
              <p className="text-gray-700"><span className="font-medium">Current Social:</span> {socialHours.toFixed(1)}</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Transfer Direction</label>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTransferData(prev => ({ ...prev, fromType: 'volunteering', toType: 'social' }))}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    transferData.fromType === 'volunteering'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Volunteering → Social
                </button>
                <button
                  onClick={() => setTransferData(prev => ({ ...prev, fromType: 'social', toType: 'volunteering' }))}
                  className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                    transferData.fromType === 'social'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Social → Volunteering
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Amount to Transfer</label>
              <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-4">
                <button
                  onClick={() => handleTransferStep(-0.5)}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  −
                </button>
                <div className="text-center min-w-[120px]">
                  <div className="text-3xl font-bold text-gray-900">
                    {transferData.amount.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">hours</div>
                </div>
                <button
                  onClick={() => handleTransferStep(0.5)}
                  className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600 text-center">
                Max: {transferData.fromType === 'volunteering' ? volunteeringHours.toFixed(1) : socialHours.toFixed(1)} hours
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Reason for Transfer</label>
              <textarea
                value={transferData.reason}
                onChange={(e) => setTransferData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for transferring hours..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {transferData.amount > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  After transfer:
                  <br />
                  <span className="font-semibold">Volunteering:</span> {
                    transferData.fromType === 'volunteering'
                      ? (volunteeringHours - transferData.amount).toFixed(1)
                      : (volunteeringHours + transferData.amount).toFixed(1)
                  } hours
                  <br />
                  <span className="font-semibold">Social:</span> {
                    transferData.fromType === 'social'
                      ? (socialHours - transferData.amount).toFixed(1)
                      : (socialHours + transferData.amount).toFixed(1)
                  } hours
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferHoursModal(false)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTransfer}
                disabled={submitting || !transferData.reason.trim() || transferData.amount <= 0}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
              >
                {submitting ? 'Processing...' : 'Transfer'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Review Modal */}
      {reviewModal.visible && reviewModal.request && reviewModal.action && (
        <motion.div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {reviewModal.action === 'approve' ? 'Approve' : 'Reject'} Request
            </h3>
            
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-gray-700"><span className="font-medium">Event:</span> {reviewModal.request.event_name}</p>
              <p className="text-gray-700"><span className="font-medium">Hours:</span> {reviewModal.request.hours_requested}</p>
              <p className="text-gray-700"><span className="font-medium">Type:</span> {reviewModal.request.type === 'social' ? 'Social' : 'Volunteering'}</p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Admin Notes (Optional)
              </label>
              <textarea
                value={reviewModal.notes}
                onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={`Add notes for ${reviewModal.action === 'approve' ? 'approval' : 'rejection'}...`}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {reviewModal.action === 'approve' && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Note:</span> Approving this request will add {reviewModal.request.hours_requested} hour{reviewModal.request.hours_requested !== 1 ? 's' : ''} to the student's {reviewModal.request.type === 'social' ? 'social' : 'volunteering'} hours.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal({ visible: false, request: null, action: null, notes: '' })}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={processingRequest === reviewModal.request?.id}
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={processingRequest === reviewModal.request?.id}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  reviewModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {processingRequest === reviewModal.request?.id ? 'Processing...' : (reviewModal.action === 'approve' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
