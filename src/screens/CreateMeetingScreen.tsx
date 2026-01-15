import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

export default function CreateMeetingScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState('both');
  const [attendanceCode, setAttendanceCode] = useState('');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Generate random attendance code if not provided
  const generateCode = () => {
    const code = SupabaseService.generateAttendanceCode();
    setAttendanceCode(code);
  };

  // Auto-generate code on mount
  useEffect(() => {
    if (!attendanceCode) {
      generateCode();
    }
  }, []);

  const handleCreateMeeting = async () => {
    // Validate input
    if (!meetingDate.trim()) {
      showModal({
        title: 'Error',
        message: 'Please select a meeting date',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    if (!attendanceCode.trim()) {
      showModal({
        title: 'Error',
        message: 'Please enter an attendance code or generate one',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    setLoading(true);

    try {
      await SupabaseService.createMeeting({
        meetingDate: meetingDate,
        meetingType: meetingType,
        attendanceCode: attendanceCode.trim().toUpperCase(),
        isOpen: isOpen,
        createdBy: 'admin'
      });

      showModal({
        title: 'Success',
        message: 'Meeting created successfully!',
        onCancel: () => {},
        onConfirm: () => {
          navigate('/admin-meetings');
        },
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      showModal({
        title: 'Error',
        message: error.message || 'Failed to create meeting. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not admin
  if (!isAdmin) {
    navigate('/home');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 bg-opacity-50 backdrop-blur-sm border-b border-slate-700 p-6"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin-meetings')}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-white">Create Meeting</h1>
        </div>
      </motion.div>

      {/* Content */}
      <div className="p-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
        >
          {/* Meeting Date */}
          <div className="mb-6">
            <label className="block text-gray-200 font-semibold mb-2">
              Meeting Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Meeting Type */}
          <div className="mb-6">
            <label className="block text-gray-200 font-semibold mb-2">
              Meeting Type
            </label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="both">Both Sessions</option>
              <option value="morning">Morning Only</option>
              <option value="afternoon">Afternoon Only</option>
            </select>
          </div>

          {/* Attendance Code */}
          <div className="mb-6">
            <label className="block text-gray-200 font-semibold mb-2">
              Attendance Code <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={attendanceCode}
                onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                placeholder="Enter or generate code"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={6}
                required
              />
              <button
                onClick={generateCode}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                type="button"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="mb-6">
            <label className="block text-gray-200 font-semibold mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting description or notes..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Meeting Status */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-200 font-semibold">
                Open for attendance submissions
              </span>
            </label>
            <p className="text-slate-400 text-sm mt-1 ml-8">
              If checked, students can submit attendance for this meeting. If unchecked, only admins can mark attendance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => navigate('/admin-meetings')}
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateMeeting}
              disabled={loading || !meetingDate || !attendanceCode}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Meeting'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
