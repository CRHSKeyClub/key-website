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

export default function AdminMeetingManagementScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    loadMeetings();
  }, [isAdmin, navigate]);

  const loadMeetings = async () => {
    try {
      const data = await SupabaseService.getAllMeetings();
      setMeetings(data.sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()));
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAttendanceCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleToggleMeeting = async (meeting: Meeting) => {
    try {
      await SupabaseService.updateMeeting(meeting.id, {
        ...meeting,
        is_open: !meeting.is_open
      });
      
      setMeetings(meetings.map(m => 
        m.id === meeting.id 
          ? { ...m, is_open: !m.is_open }
          : m
      ));

      showModal({
        title: 'Success',
        message: `Meeting ${!meeting.is_open ? 'opened' : 'closed'} successfully!`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to update meeting:', error);
      showModal({
        title: 'Error',
        message: 'Failed to update meeting status.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    }
  };

  const handleNewCode = async (meeting: Meeting) => {
    try {
      const newCode = generateAttendanceCode();
      await SupabaseService.updateMeeting(meeting.id, {
        ...meeting,
        attendance_code: newCode
      });
      
      setMeetings(meetings.map(m => 
        m.id === meeting.id 
          ? { ...m, attendance_code: newCode }
          : m
      ));

      showModal({
        title: 'Success',
        message: `New attendance code generated: ${newCode}`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to update attendance code:', error);
      showModal({
        title: 'Error',
        message: 'Failed to generate new attendance code.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    }
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    try {
      await SupabaseService.deleteMeeting(meeting.id);
      setMeetings(meetings.filter(m => m.id !== meeting.id));
      
      showModal({
        title: 'Success',
        message: 'Meeting deleted successfully!',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      showModal({
        title: 'Error',
        message: 'Failed to delete meeting.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
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
          </button>
          <h1 className="text-3xl font-bold text-white text-center flex-1">Meeting Management</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/create-meeting')}
              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-800 hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="p-6">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-white mb-6"
        >
          All Meetings
        </motion.h2>

        {meetings.length > 0 ? (
          <div className="space-y-4">
            {meetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
              >
                <div className="flex items-start justify-between">
                  {/* Left side - Meeting details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-xl font-bold text-blue-400">{formatDate(meeting.meeting_date)}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${
                        meeting.is_open 
                          ? 'bg-green-900 text-green-400 border border-green-700' 
                          : 'bg-slate-800 text-slate-400 border border-slate-600'
                      }`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        {meeting.is_open ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    
                    <p className="text-slate-300 mb-2">{meeting.description}</p>
                    <p className="text-slate-400">
                      <span className="font-semibold">Attendance Code:</span> 
                      <span className="ml-2 font-mono text-lg font-bold text-yellow-400">{meeting.attendance_code}</span>
                    </p>
                  </div>

                  {/* Right side - Action buttons */}
                  <div className="flex flex-col gap-3 ml-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleMeeting(meeting)}
                        className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                          meeting.is_open
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        {meeting.is_open ? 'Close' : 'Open'}
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleNewCode(meeting)}
                        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        New Code
                      </button>
                      
                      <button
                        onClick={() => navigate(`/meeting-attendance/${meeting.id}`)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                        </svg>
                        Attendance
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteMeeting(meeting)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Meetings Yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first meeting to get started with attendance tracking!
            </p>
            <button
              onClick={() => navigate('/create-meeting')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Create Meeting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}