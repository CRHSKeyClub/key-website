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

export default function AdminTshirtManagementScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [tshirtSizeSummary, setTshirtSizeSummary] = useState<{[key: string]: number}>({});
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [tshirtSizeFilter, setTshirtSizeFilter] = useState<string>('all');

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
      const studentsData = result.data || result || [];
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
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

  const calculateTshirtSummary = () => {
    const summary: {[key: string]: number} = {};
    students.forEach(student => {
      const size = student.tshirt_size || 'No Size';
      summary[size] = (summary[size] || 0) + 1;
    });
    setTshirtSizeSummary(summary);
  };

  const filterStudents = () => {
    if (tshirtSizeFilter === 'all') {
      setFilteredStudents(students);
    } else if (tshirtSizeFilter === 'no-size') {
      setFilteredStudents(students.filter(student => !student.tshirt_size));
    } else {
      setFilteredStudents(students.filter(student => student.tshirt_size === tshirtSizeFilter));
    }
  };

  useEffect(() => {
    filterStudents();
    calculateTshirtSummary();
  }, [tshirtSizeFilter, students]);

  const exportTshirtOrder = () => {
    const orderData = {
      'XS': tshirtSizeSummary['XS'] || 0,
      'S': tshirtSizeSummary['S'] || 0,
      'M': tshirtSizeSummary['M'] || 0,
      'L': tshirtSizeSummary['L'] || 0,
      'XL': tshirtSizeSummary['XL'] || 0,
      'XXL': tshirtSizeSummary['XXL'] || 0,
      'XXXL': tshirtSizeSummary['XXXL'] || 0,
      'No Size Set': tshirtSizeSummary['No Size'] || 0,
      'Total Students': students.length
    };

    // Create CSV content
    const csvContent = [
      'Size,Quantity',
      ...Object.entries(orderData).map(([size, quantity]) => `${size},${quantity}`)
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `key_club_tshirt_order_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showModal({
      title: 'Export Complete',
      message: 'T-shirt order summary has been downloaded as a CSV file.',
      onCancel: () => {},
      onConfirm: () => {},
      cancelText: '',
      confirmText: 'OK',
      icon: 'checkmark-circle',
      iconColor: '#4CAF50'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading t-shirt data...</p>
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
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-white text-center flex-1">T-Shirt Management</h1>
          <div className="flex gap-2">
            <button
              onClick={loadStudents}
              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-800 hover:bg-opacity-50 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-7xl mx-auto"
        >
          {/* T-Shirt Order Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 mb-8 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-400">T-Shirt Order Summary</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={exportTshirtOrder}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Order
                </button>
                <div className="bg-blue-600 bg-opacity-20 px-4 py-2 rounded-lg border border-blue-500">
                  <span className="text-blue-300 text-sm font-medium">Total Students</span>
                  <div className="text-white font-bold text-xl">{students.length}</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
              {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                <motion.div
                  key={size}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].indexOf(size) * 0.1) }}
                  className="bg-slate-700 bg-opacity-50 rounded-lg p-4 text-center border border-slate-500 hover:border-blue-400 transition-colors"
                >
                  <div className="text-gray-300 text-sm font-medium mb-1">{size}</div>
                  <div className="text-3xl font-bold text-white">{tshirtSizeSummary[size] || 0}</div>
                  <div className="text-xs text-gray-400">shirts</div>
                </motion.div>
              ))}
            </div>
            
            {tshirtSizeSummary['No Size'] > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-4 bg-yellow-600 bg-opacity-20 rounded-lg border border-yellow-500"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-300 font-medium">
                    {tshirtSizeSummary['No Size']} students need to set their t-shirt size
                  </span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Filter Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 mb-8 border border-slate-600"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-400">Filter Students</h3>
              <div className="flex items-center gap-4">
                <select
                  value={tshirtSizeFilter}
                  onChange={(e) => setTshirtSizeFilter(e.target.value)}
                  className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Students</option>
                  <option value="XS">XS Size</option>
                  <option value="S">S Size</option>
                  <option value="M">M Size</option>
                  <option value="L">L Size</option>
                  <option value="XL">XL Size</option>
                  <option value="XXL">XXL Size</option>
                  <option value="XXXL">XXXL Size</option>
                  <option value="no-size">No Size Set</option>
                </select>
                <div className="text-gray-300">
                  Showing {filteredStudents.length} of {students.length} students
                </div>
              </div>
            </div>
          </motion.div>

          {/* Students List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {(student.name || student.student_name || 'Unknown').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">
                        {student.name || student.student_name || 'Unknown Student'}
                      </h4>
                      <p className="text-gray-400">
                        S-Number: {student.s_number || student.student_s_number || 'Unknown'}
                      </p>
                      {student.tshirt_size && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            T-Shirt: {student.tshirt_size}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-sm">
                      {student.total_hours || 0} hrs ({(student.volunteering_hours || 0)} vol • {(student.social_hours || 0)} social)
                    </div>
                    {!student.tshirt_size && (
                      <div className="text-yellow-400 text-sm font-medium">
                        No t-shirt size set
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Empty State */}
          {filteredStudents.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center py-12"
            >
              <div className="text-gray-400 text-lg">
                {tshirtSizeFilter === 'all' 
                  ? 'No students found' 
                  : `No students found with ${tshirtSizeFilter === 'no-size' ? 'no t-shirt size' : `t-shirt size ${tshirtSizeFilter}`}`
                }
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
