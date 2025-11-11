import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHours } from '../contexts/HourContext';
import { useAuth } from '../contexts/AuthContext';
import SupabaseService from '../services/SupabaseService';

interface HourRequest {
  id: string;
  student_s_number: string;
  student_name: string;
  event_name: string;
  event_date: string;
  hours_requested: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  image_name?: string;
}

export default function StudentHourRequestsScreen() {
  const navigate = useNavigate();
  const { getStudentHours, refreshHourRequests } = useHours();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState<HourRequest[]>([]);
  const [currentHours, setCurrentHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [photoModal, setPhotoModal] = useState({
    visible: false,
    imageData: null as string | null,
    eventName: ''
  });

  const loadData = async () => {
    if (!user?.sNumber) return;
    
    try {
      console.log('🔄 Loading student data from Supabase...');
      
      // Load student's requests
      const studentRequests = await SupabaseService.getStudentHourRequests(user.sNumber);
      setRequests(studentRequests);
      console.log('✅ Loaded student requests:', studentRequests.length);
      
      // Load current hours
      const hours = await getStudentHours(user.sNumber);
      setCurrentHours(hours);
      console.log('✅ Loaded current hours:', hours);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered...');
      await loadData();
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return 'Date unavailable';
    }
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }
    return parsedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const extractPhotoData = (description: string) => {
    if (!description) return null;
    
    const patterns = [
      /Photo: ([^|]+)/,
      /\[PHOTO_DATA:(.*?)\]/,
      /data:image\/[^;]+;base64,[^|]+/
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const photoData = match[1] || match[0];
        if (photoData.startsWith('data:image/')) {
          return photoData;
        }
        if (photoData && !photoData.startsWith('data:')) {
          return `data:image/jpeg;base64,${photoData}`;
        }
        return photoData;
      }
    }
    
    return null;
  };

  const cleanDescription = (description: string) => {
    if (!description) return '';
    return description
      .replace(/Photo: [^|]+/, '')
      .replace(/\[PHOTO_DATA:.*?\]/, '')
      .replace(/data:image\/[^;]+;base64,[^|]+/, '')
      .trim();
  };

  const viewPhoto = (imageData: string, eventName: string) => {
    setPhotoModal({
      visible: true,
      imageData,
      eventName
    });
  };

  const getSummaryStats = () => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalRequested = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + parseFloat(r.hours_requested?.toString() || '0'), 0);
    
    return { pending, approved, rejected, totalRequested };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">Loading your requests...</p>
        </div>
      </div>
    );
  }

  const stats = getSummaryStats();

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
          <h1 className="text-3xl font-bold text-blue-400 text-center flex-1">My Hour Requests</h1>
          <button
            onClick={() => navigate('/hour-request')}
            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg bg-blue-900 bg-opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600">
            <div className="text-2xl font-bold text-blue-400">{currentHours.toFixed(1)}</div>
            <div className="text-sm text-slate-400">Total Hours</div>
          </div>
          
          <div className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-sm text-slate-400">Pending</div>
          </div>
          
          <div className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-600">
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-sm text-slate-400">Approved</div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="px-4 pb-8"
      >
        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request, index) => {
              const photoData = extractPhotoData(request.description);
              const cleanDescriptionText = cleanDescription(request.description);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-400">{request.event_name || 'No Event Name'}</h3>
                      <p className="text-slate-300 text-sm">{request.hours_requested} hours requested</p>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1`} style={{ backgroundColor: getStatusColor(request.status) }}>
                      <span>{getStatusIcon(request.status)}</span>
                      <span className="text-white">{request.status?.toUpperCase() || 'UNKNOWN'}</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-slate-300 text-sm">Event: {formatDate(request.event_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-slate-300 text-sm">Submitted: {formatDate(request.submitted_at)}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {cleanDescriptionText && (
                    <div className="mb-4">
                      <p className="text-slate-300 leading-relaxed">{cleanDescriptionText}</p>
                    </div>
                  )}

                  {/* Photo Section */}
                  {photoData && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-blue-400 font-semibold">Proof Photo</span>
                        <div className="flex-1"></div>
                        <span className="text-xs text-green-400 bg-green-900 px-2 py-1 rounded-full">Click to View</span>
                      </div>
                      
                      <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => viewPhoto(photoData, request.event_name)}
                            className="relative group"
                          >
                            <img 
                              src={photoData} 
                              alt="Proof photo thumbnail"
                              className="w-20 h-20 rounded-lg object-cover border-2 border-blue-400 hover:border-blue-300 transition-colors cursor-pointer"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </button>
                          
                          <div className="flex-1">
                            <p className="text-slate-300 text-sm mb-2">
                              Click the photo to view full size
                            </p>
                            <button
                              onClick={() => viewPhoto(photoData, request.event_name)}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              View Full Size
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status-specific information */}
                  {request.status === 'approved' && request.reviewed_at && (
                    <div className="bg-green-900 bg-opacity-50 border border-green-600 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-400 font-medium">
                          ✓ Approved on {formatDate(request.reviewed_at)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {request.status === 'rejected' && request.admin_notes && (
                    <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded-lg p-3 mb-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <div>
                          <p className="text-red-400 font-medium mb-1">Reason for rejection:</p>
                          <p className="text-red-300 text-sm">{request.admin_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">No Hour Requests Yet</h3>
            <p className="text-slate-400 mb-6">
              Submit your first hour request to start tracking your volunteer hours!
            </p>
            <button
              onClick={() => navigate('/hour-request')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Submit Request
            </button>
          </div>
        )}
      </motion.div>

      {/* Photo Modal */}
      {photoModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Proof Photo - {photoModal.eventName}</h3>
              <button
                onClick={() => setPhotoModal({ visible: false, imageData: null, eventName: '' })}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {photoModal.imageData && (
              <div className="mb-6">
                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                  <img 
                    src={photoModal.imageData} 
                    alt="Full size proof photo"
                    className="w-full max-h-[60vh] object-contain rounded-lg mx-auto"
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={() => setPhotoModal({ visible: false, imageData: null, eventName: '' })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}