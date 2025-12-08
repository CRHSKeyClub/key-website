import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

interface Student {
  id: string;
  s_number?: string;
  name?: string;
  email?: string;
  volunteering_hours?: number;
  social_hours?: number;
  total_hours?: number;
  tshirt_size?: string;
  account_status?: string;
  created_at?: string;
  last_login?: string;
  account_created?: string;
  last_hour_update?: string;
  role?: string;
}

export default function AdminStudentExportScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

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
      const result = await SupabaseService.getAllStudentsForExport();
      // Handle both { data: [...] } and direct array responses
      const studentsData = result?.data || (Array.isArray(result) ? result : []);
      const studentsArray = Array.isArray(studentsData) ? studentsData : [];
      
      // Sort students alphabetically by name
      const sortedStudents = [...studentsArray].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setStudents(sortedStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
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

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const exportToCSV = () => {
    try {
      setExporting(true);

      // Define CSV headers
      const headers = [
        'ID',
        'S-Number',
        'Name',
        'Email',
        'Volunteering Hours',
        'Social Hours',
        'Total Hours',
        'T-Shirt Size',
        'Account Status',
        'Role',
        'Account Created',
        'Last Login',
        'Last Hour Update',
        'Created At'
      ];

      // Create CSV rows
      const csvRows = [
        headers.join(',')
      ];

      // Add student data rows
      students.forEach((student: any) => {
        const row = [
          escapeCSV(student.id || ''),
          escapeCSV(student.s_number || ''),
          escapeCSV(student.name || ''),
          escapeCSV(student.email || ''),
          escapeCSV(student.volunteering_hours ?? 0),
          escapeCSV(student.social_hours ?? 0),
          escapeCSV(student.total_hours ?? 0),
          escapeCSV(student.tshirt_size || 'zero'),
          escapeCSV(student.account_status || ''),
          escapeCSV(student.role || ''),
          escapeCSV(formatDate(student.account_created)),
          escapeCSV(formatDateTime(student.last_login)),
          escapeCSV(formatDateTime(student.last_hour_update)),
          escapeCSV(formatDate(student.created_at))
        ];
        csvRows.push(row.join(','));
      });

      // Create CSV content
      const csvContent = csvRows.join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `key-club-students-export-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      showModal({
        title: 'Success',
        message: `Successfully exported ${students.length} students to CSV.`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to export CSV:', error);
      showModal({
        title: 'Error',
        message: 'Failed to export CSV. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setExporting(false);
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
            <h1 className="text-2xl font-bold text-white">Export Students</h1>
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
          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-600"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Export All Students</h2>
                <p className="text-gray-300">
                  Export all student data to a CSV file that can be imported into Google Sheets or Excel.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                <div className="text-gray-300 text-sm mb-1">Total Students</div>
                <div className="text-3xl font-bold text-white">{students.length}</div>
              </div>
              <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                <div className="text-gray-300 text-sm mb-1">With Accounts</div>
                <div className="text-3xl font-bold text-green-400">
                  {students.filter(s => s.account_status === 'active' || s.account_status === 'pending').length}
                </div>
              </div>
              <div className="bg-slate-700 bg-opacity-50 rounded-lg p-4">
                <div className="text-gray-300 text-sm mb-1">Total Hours</div>
                <div className="text-3xl font-bold text-blue-400">
                  {students.reduce((sum, s) => sum + (s.total_hours || 0), 0).toFixed(1)}
                </div>
              </div>
            </div>

            {/* Export Button */}
            <motion.button
              onClick={exportToCSV}
              disabled={exporting || students.length === 0}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-3"
              whileHover={{ scale: students.length > 0 && !exporting ? 1.02 : 1 }}
              whileTap={{ scale: students.length > 0 && !exporting ? 0.98 : 1 }}
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export to CSV ({students.length} students)
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Data Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
          >
            <h3 className="text-xl font-bold text-white mb-4">Export Includes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Student ID
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                S-Number
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Name
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Email
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Volunteering Hours
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Social Hours
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Total Hours
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                T-Shirt Size
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Account Status
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Role
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Account Created Date
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Last Login
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Last Hour Update
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Created At
              </div>
            </div>
          </motion.div>

          {/* Empty State */}
          {students.length === 0 && (
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
    </div>
  );
}

