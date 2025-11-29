import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  created_at?: string;
}

interface HourAdjustment {
  student_id: string;
  student_name: string;
  current_hours: number;
  adjustment: number;
  reason: string;
}

export default function AdminStudentManagementScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adjustmentData, setAdjustmentData] = useState<HourAdjustment>({
    student_id: '',
    student_name: '',
    current_hours: 0,
    adjustment: 0,
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [tshirtSizeFilter, setTshirtSizeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const MAX_MANUAL_ADJUSTMENT = Number.POSITIVE_INFINITY;

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    loadStudents();
  }, [isAdmin, navigate]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const result = await SupabaseService.getAllStudents();
      // Handle the response structure - getAllStudents returns { data, error }
      const studentsData = result.data || result || [];
      const studentsArray = Array.isArray(studentsData) ? studentsData : [];
      
      // Sort students alphabetically by name
      const sortedStudents = [...studentsArray].sort((a, b) => {
        const nameA = (a.name || a.student_name || '').toLowerCase();
        const nameB = (b.name || b.student_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStudents(sortedStudents);
      setFilteredStudents(sortedStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
      setFilteredStudents([]);
      showModal({
        title: 'Error',
        message: 'Failed to load students. Please try again.',
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

  const handleAdjustmentStep = (delta: number) => {
    setAdjustmentData(prev => {
      const nextRaw = Number((prev.adjustment + delta).toFixed(1));
      if (!Number.isFinite(nextRaw)) {
        return prev;
      }

      const minAllowed = -prev.current_hours;
      const clampedValue = Math.min(
        Math.max(nextRaw, minAllowed),
        MAX_MANUAL_ADJUSTMENT
      );

      return {
        ...prev,
        adjustment: clampedValue
      };
    });
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by t-shirt size
    if (tshirtSizeFilter === 'no-size') {
      filtered = filtered.filter(student => !student.tshirt_size);
    } else if (tshirtSizeFilter !== 'all') {
      filtered = filtered.filter(student => student.tshirt_size === tshirtSizeFilter);
    }

    // Filter by search query (name or S-number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const name = (student.name || student.student_name || '').toLowerCase();
        const sNumber = (student.s_number || student.student_s_number || '').toLowerCase();
        return name.includes(query) || sNumber.includes(query);
      });
    }

    // Ensure filtered results are also sorted alphabetically
    const sortedFiltered = [...filtered].sort((a, b) => {
      const nameA = (a.name || a.student_name || '').toLowerCase();
      const nameB = (b.name || b.student_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setFilteredStudents(sortedFiltered);
  };

  useEffect(() => {
    filterStudents();
  }, [tshirtSizeFilter, students, searchQuery]);

  const handleAdjustHours = (student: Student) => {
    setSelectedStudent(student);
    setAdjustmentData({
      student_id: student.id,
      student_name: student.name || student.student_name || student.s_number || student.student_s_number || 'Unknown Student',
      current_hours: student.total_hours || 0,
      adjustment: 0,
      reason: ''
    });
    setShowAdjustmentModal(true);
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

    // Allow zero adjustments - officers might want to reset hours to 0
    // No need to validate for non-zero adjustment

    setSubmitting(true);
    
    try {
      // Calculate new total hours
      const newTotalHours = adjustmentData.current_hours + adjustmentData.adjustment;
      
      // Update student hours directly in the database
      await SupabaseService.updateStudentHours(adjustmentData.student_id, newTotalHours);
      
      // Create a manual hour request for audit trail
      const adjustmentRequest = {
        studentSNumber: selectedStudent?.s_number || selectedStudent?.student_s_number || '',
        studentName: selectedStudent?.name || selectedStudent?.student_name || selectedStudent?.s_number || selectedStudent?.student_s_number || '',
        eventName: `Manual Adjustment - ${adjustmentData.adjustment > 0 ? 'Added' : 'Removed'} ${Math.abs(adjustmentData.adjustment)} hours`,
        eventDate: new Date().toISOString().split('T')[0],
        hoursRequested: Math.abs(adjustmentData.adjustment).toString(),
        description: `Manual hour adjustment by admin. Reason: ${adjustmentData.reason}. Original hours: ${adjustmentData.current_hours}, New total: ${newTotalHours}, Adjustment: ${adjustmentData.adjustment > 0 ? '+' : ''}${adjustmentData.adjustment}`,
        imageData: null,
        imageName: null
      };

      // Submit the hour request for audit trail (this will create a record but not affect the already updated total)
      await SupabaseService.submitHourRequest(adjustmentRequest);
      
      // Reload students to show updated hours
      await loadStudents();

      setShowAdjustmentModal(false);
      const getSuccessMessage = () => {
        const newTotal = adjustmentData.current_hours + adjustmentData.adjustment;
        const hourText = newTotal === 1 ? 'hour' : 'hours';
        const adjustmentHourText = Math.abs(adjustmentData.adjustment) === 1 ? 'hour' : 'hours';
        
        if (adjustmentData.adjustment > 0) {
          return `Successfully added ${adjustmentData.adjustment} ${adjustmentHourText} for ${adjustmentData.student_name}. New total: ${newTotal} ${hourText}.`;
        } else if (adjustmentData.adjustment < 0) {
          return `Successfully removed ${Math.abs(adjustmentData.adjustment)} ${adjustmentHourText} for ${adjustmentData.student_name}. New total: ${newTotal} ${hourText}.`;
        } else {
          return `Successfully updated hours for ${adjustmentData.student_name}. Total remains: ${newTotal} ${hourText}.`;
        }
      };

      showModal({
        title: 'Success',
        message: getSuccessMessage(),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 bg-opacity-90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Student Management</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or S-number..."
                className="bg-slate-700 text-white px-4 py-2 pl-10 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
              <svg 
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* T-Shirt Size Filter */}
            <select
              value={tshirtSizeFilter}
              onChange={(e) => setTshirtSizeFilter(e.target.value)}
              className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Students</option>
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
              <option value="no-size">No Size Set</option>
            </select>
            
            <button
              onClick={loadStudents}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Page Title */}
          <motion.h2 
            className="text-3xl font-bold text-white mb-4 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            Student Management
          </motion.h2>
          
          {/* Filter Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mb-8"
          >
            <p className="text-gray-300">
              Showing {filteredStudents.length} of {students.length} students
              {(tshirtSizeFilter !== 'all' || searchQuery.trim()) && (
                <span className="text-blue-400">
                  {' '}(
                  {tshirtSizeFilter !== 'all' && (
                    <>filtered by {tshirtSizeFilter === 'no-size' ? 'no t-shirt size' : `t-shirt size: ${tshirtSizeFilter}`}</>
                  )}
                  {tshirtSizeFilter !== 'all' && searchQuery.trim() && ' • '}
                  {searchQuery.trim() && (
                    <>searching: "{searchQuery}"</>
                  )}
                  )
                </span>
              )}
            </p>
          </motion.div>

          {/* Students List */}
          <div className="space-y-4">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.4 + index * 0.1, 
                  type: "spring", 
                  stiffness: 100 
                }}
                onClick={() => {
                  const sNumber = student.s_number || student.student_s_number;
                  if (sNumber) {
                    navigate(`/admin-students/${encodeURIComponent(sNumber)}`);
                  }
                }}
                className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  {/* Student Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">
                        {student.name || student.student_name || 'Unknown Student'}
                      </h3>
                      <p className="text-blue-300 text-sm">{student.s_number || student.student_s_number}</p>
                      {student.tshirt_size && (
                        <p className="text-blue-200 text-xs mt-1">
                          T-Shirt: {student.tshirt_size}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hours and Actions */}
                  <div className="flex items-center gap-6">
                    {/* Current Hours */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex flex-col">
                        <span className="text-white font-semibold text-lg">
                          {student.total_hours || 0} {student.total_hours === 1 ? 'hr' : 'hrs'} total
                        </span>
                        <span className="text-gray-400 text-xs">
                          {(student.volunteering_hours || 0)} vol • {(student.social_hours || 0)} social
                        </span>
                      </div>
                    </div>

                    {/* Adjust Hours Button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdjustHours(student);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Adjust Hours
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center py-12"
            >
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Students Found</h3>
              <p className="text-slate-400">No students have been registered yet.</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Hour Adjustment Modal */}
      {showAdjustmentModal && selectedStudent && (
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Adjust Hours</h3>
            
            {/* Student Info */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <p className="text-gray-700"><span className="font-medium">Student:</span> {adjustmentData.student_name}</p>
              <p className="text-gray-700"><span className="font-medium">Current Hours:</span> {adjustmentData.current_hours}</p>
            </div>

            {/* Hour Counter */}
            <motion.div 
              className="mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-gray-700 font-semibold mb-2">Adjust Hours</label>
              <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-4">
                {/* Decrease Button */}
                <motion.button
                  onClick={() => handleAdjustmentStep(-0.5)}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                  whileHover={{ 
                    scale: 1.15,
                    rotate: -5,
                    boxShadow: "0 0 20px rgba(239, 68, 68, 0.5)"
                  }}
                  whileTap={{ 
                    scale: 0.85,
                    rotate: 0
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(239, 68, 68, 0.4)",
                      "0 0 0 10px rgba(239, 68, 68, 0)",
                      "0 0 0 0 rgba(239, 68, 68, 0)"
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
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  >
                    −
                  </motion.span>
                </motion.button>

                {/* Current Hours Display */}
                <motion.div 
                  className="text-center min-w-[120px]"
                  animate={{
                    scale: adjustmentData.adjustment !== 0 ? [1, 1.05, 1] : 1
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut"
                  }}
                >
                  <motion.div 
                    className="text-3xl font-bold text-gray-900"
                    animate={{
                      color: adjustmentData.adjustment > 0 ? "#10b981" : adjustmentData.adjustment < 0 ? "#ef4444" : "#111827"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {adjustmentData.current_hours + adjustmentData.adjustment}
                  </motion.div>
                  <motion.div 
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {adjustmentData.adjustment !== 0 && (
                      <motion.span 
                        className={adjustmentData.adjustment > 0 ? 'text-green-600' : 'text-red-600'}
                        animate={{
                          scale: [1, 1.2, 1]
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          repeatDelay: 1
                        }}
                      >
                        {adjustmentData.adjustment > 0 ? '+' : ''}{adjustmentData.adjustment}
                      </motion.span>
                    )}
                  </motion.div>
                </motion.div>

                {/* Increase Button */}
                <motion.button
                  onClick={() => handleAdjustmentStep(0.5)}
                  className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold transition-colors"
                  whileHover={{ 
                    scale: 1.15,
                    rotate: 5,
                    boxShadow: "0 0 20px rgba(34, 197, 94, 0.5)"
                  }}
                  whileTap={{ 
                    scale: 0.85,
                    rotate: 0
                  }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(34, 197, 94, 0.4)",
                      "0 0 0 10px rgba(34, 197, 94, 0)",
                      "0 0 0 0 rgba(34, 197, 94, 0)"
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
                  <motion.span
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 0.3,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  >
                    +
                  </motion.span>
                </motion.button>
              </div>
              
              <div className="flex justify-center gap-2 mt-3">
                <button
                  onClick={() => setAdjustmentData(prev => ({ ...prev, adjustment: 0 }))}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setAdjustmentData(prev => ({ ...prev, adjustment: -adjustmentData.current_hours }))}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
                >
                  Set to 0
                </button>
              </div>
            </motion.div>

            {/* Reason */}
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-gray-700 font-semibold mb-2">Reason for Adjustment</label>
              <textarea
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for this hour adjustment..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                onClick={() => setShowAdjustmentModal(false)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleSubmitAdjustment}
                disabled={submitting || !adjustmentData.reason.trim()}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  'Submit Adjustment'
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
