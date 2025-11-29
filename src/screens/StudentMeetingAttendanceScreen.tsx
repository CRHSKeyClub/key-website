import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_type?: string;
  description?: string;
  attendance_code: string;
  is_open: boolean;
  created_at: string;
  created_by: string;
}

interface AttendanceRecord {
  id: string;
  student_s_number: string;
  meeting_id: string;
  session_type: 'morning' | 'afternoon';
  attendance_code: string;
  marked_at: string;
}

export default function StudentMeetingAttendanceScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showModal } = useModal();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [sessionType, setSessionType] = useState<'morning' | 'afternoon'>('morning');
  const [attendanceCode, setAttendanceCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [meetingsData, attendanceData] = await Promise.all([
        SupabaseService.getAllMeetings(),
        user?.sNumber ? SupabaseService.getStudentAttendance(user.sNumber) : []
      ]);
      
      setMeetings(meetingsData.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()));
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStatus = (meeting: Meeting) => {
    const record = attendanceRecords.find(r => r.meeting_id === meeting.id);
    if (record) {
      return 'attended';
    }
    
    if (!meeting.is_open) {
      return 'closed';
    }
    
    return 'open';
  };

  const getAttendanceStats = () => {
    const attended = attendanceRecords.length;
    const total = meetings.length;
    const missed = total - attended;
    const remaining = meetings.filter(m => m.is_open).length;
    
    return { attended, missed, remaining };
  };

  const handleMarkAttendance = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceCode('');
    setSessionType('morning');
    setShowAttendanceModal(true);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedMeeting || !user?.sNumber || !attendanceCode.trim()) {
      showModal({
        title: 'Error',
        message: 'Please fill in all fields.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    if (attendanceCode.trim().toUpperCase() !== selectedMeeting.attendance_code) {
      showModal({
        title: 'Error',
        message: 'Invalid attendance code. Please check with your meeting leader.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      await SupabaseService.markAttendance({
        student_s_number: user.sNumber,
        meeting_id: selectedMeeting.id,
        session_type: sessionType,
        attendance_code: attendanceCode.trim().toUpperCase()
      });

      setShowAttendanceModal(false);
      await loadData(); // Reload data to update attendance records
      
      showModal({
        title: 'Success',
        message: 'Attendance marked successfully!',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      showModal({
        title: 'Error',
        message: 'Failed to mark attendance. Please try again.',
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    
    try {
      // Handle different date formats
      let date: Date;
      
      // Check if it's already a valid date string
      if (dateString.includes('T')) {
        // ISO format with time
        date = new Date(dateString);
      } else if (dateString.includes('-') && dateString.length === 10) {
        // YYYY-MM-DD format
        date = new Date(dateString + 'T00:00:00');
      } else {
        // Try parsing as-is
        date = new Date(dateString);
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const getMeetingIcon = (meeting: Meeting) => {
    try {
      let date: Date;
      
      // Handle different date formats
      if (meeting.meeting_date.includes('T')) {
        date = new Date(meeting.meeting_date);
      } else if (meeting.meeting_date.includes('-') && meeting.meeting_date.length === 10) {
        date = new Date(meeting.meeting_date + 'T00:00:00');
      } else {
        date = new Date(meeting.meeting_date);
      }
      
      if (isNaN(date.getTime())) {
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
          </svg>
        ); // Default calendar icon for invalid dates
      }
      
      const month = date.getMonth();
      if (month >= 0 && month <= 2) {
        return '❄️'; // Winter
      } else if (month >= 3 && month <= 5) {
        return '🌸'; // Spring
      } else if (month >= 6 && month <= 8) {
        return '☀️'; // Summer
      } else {
        return '🍂'; // Fall
      }
    } catch (error) {
      console.error('Error getting meeting icon:', error);
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
        </svg>
      ); // Default calendar icon
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">Loading meetings...</p>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-slate-800 bg-opacity-80 border-b border-slate-700 py-6 px-6"
      >
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate('/home')} 
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-white text-center flex-1">Meeting Attendance</h1>
          <div className="w-6"></div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="p-6">
        {/* Attendance Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <motion.h2 
            className="text-2xl font-bold text-white mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            Attendance Summary
          </motion.h2>
          <div className="grid grid-cols-3 gap-4">
            <motion.div 
              className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-3xl font-bold text-blue-400 mb-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
              >
                {stats.attended}
              </motion.div>
              <div className="text-blue-300 text-sm">Attended</div>
            </motion.div>
            <motion.div 
              className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-3xl font-bold text-red-400 mb-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
              >
                {stats.missed}
              </motion.div>
              <div className="text-red-300 text-sm">Missed</div>
            </motion.div>
            <motion.div 
              className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-3xl font-bold text-yellow-400 mb-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
              >
                {stats.remaining}
              </motion.div>
              <div className="text-yellow-300 text-sm">Remaining</div>
            </motion.div>
          </div>
        </motion.div>

        {/* All Meetings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">All Meetings</h2>
          <div className="space-y-3">
            {meetings.map((meeting, index) => {
              const status = getAttendanceStatus(meeting);
              
              return (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl border transition-colors ${
                    status === 'attended' 
                      ? 'bg-green-700 bg-opacity-60 border-green-600' 
                      : status === 'open'
                      ? 'bg-blue-700 bg-opacity-60 border-blue-600'
                      : 'bg-slate-700 bg-opacity-60 border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{getMeetingIcon(meeting)}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{formatDate(meeting.meeting_date)}</h3>
                        <p className="text-slate-300 text-sm">{meeting.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {status === 'attended' && (
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-semibold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Attended
                        </span>
                      )}
                      
                      {status === 'closed' && (
                        <span className="px-3 py-1 bg-slate-600 text-slate-300 rounded-full text-sm font-semibold flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Closed
                        </span>
                      )}
                      
                      {status === 'open' && (
                        <motion.div 
                          className="flex flex-col items-end"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                        >
                          <motion.button
                            onClick={() => handleMarkAttendance(meeting)}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
                            whileHover={{ 
                              scale: 1.05,
                              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            animate={{ 
                              boxShadow: [
                                "0 0 0 0 rgba(59, 130, 246, 0.4)",
                                "0 0 0 10px rgba(59, 130, 246, 0)",
                                "0 0 0 0 rgba(59, 130, 246, 0)"
                              ]
                            }}
                            transition={{ 
                              boxShadow: { 
                                duration: 2, 
                                repeat: Infinity,
                                repeatDelay: 3
                              }
                            }}
                          >
                            Mark Attendance
                          </motion.button>
                          <motion.span 
                            className="text-blue-300 text-xs mt-1"
                            animate={{ 
                              opacity: [1, 0.5, 1],
                              x: [0, 5, 0]
                            }}
                            transition={{ 
                              duration: 1.5, 
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          >
                            &gt; Tap to mark attendance
                          </motion.span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Attendance Modal */}
      {showAttendanceModal && selectedMeeting && (
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
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mark Attendance</h3>
            <p className="text-gray-600 mb-6">{formatDate(selectedMeeting.meeting_date)}</p>
            
            <p className="text-gray-700 mb-4">
              Select which session you attended and enter the attendance code:
            </p>
            
            {/* Session Type */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-gray-700 font-semibold mb-3">Session Type</label>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setSessionType('morning')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    sessionType === 'morning'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  animate={sessionType === 'morning' ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Before School
                </motion.button>
                <motion.button
                  onClick={() => setSessionType('afternoon')}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                    sessionType === 'afternoon'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  animate={sessionType === 'afternoon' ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  After School
                </motion.button>
              </div>
            </motion.div>
            
            {/* Attendance Code */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-gray-700 font-semibold mb-2">Attendance Code</label>
              <motion.input
                type="text"
                value={attendanceCode}
                onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                whileFocus={{ 
                  scale: 1.02,
                  boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)"
                }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </motion.div>
            
            {/* Action Buttons */}
            <motion.div 
              className="flex gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                onClick={() => setShowAttendanceModal(false)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSubmitAttendance}
                disabled={submitting || !attendanceCode.trim()}
                className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                animate={!submitting && attendanceCode.trim() ? { 
                  boxShadow: [
                    "0 0 0 0 rgba(59, 130, 246, 0.4)",
                    "0 0 0 5px rgba(59, 130, 246, 0)",
                    "0 0 0 0 rgba(59, 130, 246, 0)"
                  ]
                } : {}}
                transition={{ 
                  boxShadow: { 
                    duration: 2, 
                    repeat: Infinity,
                    repeatDelay: 2
                  }
                }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit'
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}