import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

interface Student {
  id: string;
  s_number: string;
  name: string;
  tshirt_size?: string;
}

interface TshirtUpdate {
  sNumber: string;
  tshirtSize: string;
}

export default function AdminTshirtSizeManagementScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkUpdates, setBulkUpdates] = useState<TshirtUpdate[]>([]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [processing, setProcessing] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const handleTshirtSizeChange = (studentId: string, newSize: string) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { ...student, tshirt_size: newSize }
        : student
    ));
  };

  const saveTshirtSize = async (student: Student) => {
    try {
      await SupabaseService.updateStudent(student.s_number, {
        tshirt_size: student.tshirt_size
      });
      
      showModal({
        title: 'Success',
        message: `T-shirt size updated for ${student.name}`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#10b981'
      });
    } catch (error) {
      console.error('Failed to update t-shirt size:', error);
      showModal({
        title: 'Error',
        message: 'Failed to update t-shirt size. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ef4444'
      });
    }
  };

  const parseBulkUpdates = () => {
    const lines = bulkText.trim().split('\n');
    const updates: TshirtUpdate[] = [];
    
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const sNumber = parts[0];
        const tshirtSize = parts[1].toUpperCase();
        
        if (sNumber && ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(tshirtSize)) {
          updates.push({ sNumber, tshirtSize });
        }
      }
    }
    
    setBulkUpdates(updates);
    return updates;
  };

  const handleBulkImport = () => {
    const updates = parseBulkUpdates();
    if (updates.length === 0) {
      showModal({
        title: 'No Valid Data',
        message: 'No valid S-Number and t-shirt size pairs found. Please check your format.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#f59e0b'
      });
      return;
    }
    
    setShowBulkForm(true);
  };

  const executeBulkUpdate = async () => {
    if (bulkUpdates.length === 0) return;
    
    try {
      setProcessing(true);
      const result = await SupabaseService.bulkUpdateTshirtSizes(bulkUpdates);
      
      showModal({
        title: 'Bulk Update Complete',
        message: `Updated ${result.summary.successful} students successfully. ${result.summary.failed} failed.`,
        onCancel: () => {},
        onConfirm: () => {
          setBulkText('');
          setBulkUpdates([]);
          setShowBulkForm(false);
          loadStudents();
        },
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#10b981'
      });
    } catch (error) {
      console.error('Bulk update failed:', error);
      showModal({
        title: 'Bulk Update Failed',
        message: 'Failed to update t-shirt sizes. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ef4444'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">T-Shirt Size Management</h1>
              <p className="text-gray-600">Manage t-shirt sizes for all students</p>
            </div>
            <button
              onClick={() => navigate('/admin/students')}
              className="btn btn-secondary"
            >
              ← Back to Students
            </button>
          </div>
        </div>

        {/* Bulk Import Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📥 Bulk Import T-Shirt Sizes</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste CSV data (S-Number, T-Shirt Size):
            </label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="s123456,L&#10;s789012,M&#10;s345678,XL"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">
              Format: One student per line, separated by comma (S-Number, T-Shirt Size)
            </p>
          </div>
          <button
            onClick={handleBulkImport}
            className="btn btn-primary"
          >
            📊 Parse & Preview
          </button>
        </div>

        {/* Bulk Update Preview */}
        {showBulkForm && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-yellow-800 mb-4">
              📋 Bulk Update Preview ({bulkUpdates.length} students)
            </h3>
            <div className="max-h-64 overflow-y-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className="p-2 text-left">S-Number</th>
                    <th className="p-2 text-left">T-Shirt Size</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkUpdates.map((update, index) => (
                    <tr key={index} className="border-b border-yellow-200">
                      <td className="p-2">{update.sNumber}</td>
                      <td className="p-2">{update.tshirtSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button
                onClick={executeBulkUpdate}
                disabled={processing}
                className="btn btn-success"
              >
                {processing ? '⏳ Processing...' : '🚀 Execute Bulk Update'}
              </button>
              <button
                onClick={() => {
                  setBulkText('');
                  setBulkUpdates([]);
                  setShowBulkForm(false);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">👥 All Students</h2>
          
          {students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {student.name}
                        </h3>
                        <p className="text-gray-600">{student.s_number}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">T-Shirt Size:</label>
                        <select
                          value={student.tshirt_size || ''}
                          onChange={(e) => handleTshirtSizeChange(student.id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select size</option>
                          <option value="XS">XS</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                          <option value="XXL">XXL</option>
                          <option value="XXXL">XXXL</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={() => saveTshirtSize(student)}
                        className="btn btn-primary btn-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
