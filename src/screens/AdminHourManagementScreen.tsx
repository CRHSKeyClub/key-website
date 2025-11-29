import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHours } from '../contexts/HourContext';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

interface HourRequest {
  id: string;
  student_name: string;
  student_s_number: string;
  event_name: string;
  event_date: string | null;
  hours_requested: number;
  description: string;
  type?: 'volunteering' | 'social';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at?: string | null;
  image_name?: string;
}

export default function AdminHourManagementScreen() {
  const navigate = useNavigate();
  const { deleteHourRequest } = useHours();
  const { showModal } = useModal();
  
  const [allRequests, setAllRequests] = useState<HourRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HourRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  
  const [reviewModal, setReviewModal] = useState({
    visible: false,
    request: null as HourRequest | null,
    action: null as 'approve' | 'reject' | null,
    notes: ''
  });
  
  const [photoModal, setPhotoModal] = useState({
    visible: false,
    imageName: null as string | null,
    imageData: null as string | null
  });
  
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    request: null as HourRequest | null
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search effect - only trigger when searchQuery changes (not on initial mount)
  useEffect(() => {
    // Skip on initial mount (when searchQuery is empty and we just loaded)
    if (searchQuery === '' && allRequests.length === 0) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadData();
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Reload when filter changes (but not on initial mount)
  useEffect(() => {
    if (allRequests.length > 0) {
      loadData();
    }
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading hour requests from database...');
      
      let requests: HourRequest[];
      
      // If there's a search query, use the search function
      if (searchQuery.trim()) {
        console.log('🔍 Searching hour requests with query:', searchQuery);
        requests = await SupabaseService.searchHourRequests(searchQuery.trim(), filter === 'all' ? 'pending' : filter, 100);
      } else {
        // Otherwise, get all pending requests (or filtered by status)
        if (filter === 'all') {
          requests = await SupabaseService.getAllHourRequests();
        } else {
          requests = await SupabaseService.searchHourRequests('', filter, 100);
        }
      }
      
      setAllRequests(requests);
      setFilteredRequests(requests); // Search results are already filtered
      setLastLoadTime(new Date());
      
      console.log('✅ Data loading completed successfully');
    } catch (error: any) {
      console.error('❌ Error loading requests:', error);
      showModal({
        title: 'Error',
        message: `Failed to load hour requests: ${error.message}`,
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    // useEffect will trigger loadData when filter changes
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

    if (processingRequests.has(requestId)) return;
    setProcessingRequests(prev => new Set([...prev, requestId]));

    // Close modal immediately for better UX
    setReviewModal({ visible: false, request: null, action: null, notes: '' });

    // Optimistically remove the request from the list immediately
    setAllRequests(prev => prev.filter(r => r.id !== requestId));
    setFilteredRequests(prev => prev.filter(r => r.id !== requestId));

    try {
      const result = await SupabaseService.updateHourRequestStatus(
        requestId,
        action === 'approve' ? 'approved' : 'rejected',
        notes,
        'Admin',
        request.hours_requested
      );

      if (result) {
        // Reload data to get a new pending request to replace the approved one
        await loadData();
        
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
        // If update failed, reload to restore the request
        await loadData();
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
      // If error occurred, reload to restore the request
      await loadData();
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
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleDeleteRequest = (request: HourRequest) => {
    setDeleteModal({
      visible: true,
      request
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.request) return;
    
    const requestId = deleteModal.request.id;
    
    if (processingRequests.has(requestId)) return;
    setProcessingRequests(prev => new Set([...prev, requestId]));

    try {
      await deleteHourRequest(requestId);
      setDeleteModal({ visible: false, request: null });
      await loadData();
      
      showModal({
        title: 'Success',
        message: 'Hour request deleted successfully!',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to delete request:', error);
      showModal({
        title: 'Error',
        message: 'Failed to delete hour request',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
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
      .replace(/\[PHOTO_STORAGE:.*?\]/, '')
      .replace(/data:image\/[^;]+;base64,[^|]+/, '')
      .trim();
  };

  const viewPhoto = (imageName: string, imageData: string) => {
    setPhotoModal({
      visible: true,
      imageName,
      imageData
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ffd60a';
      case 'approved':
        return '#4CAF50';
      case 'rejected':
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getDisplayStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return 'Date unavailable';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };


  const isRequestPending = (request: HourRequest) => {
    return request.status === 'pending';
  };

  const getFilterCounts = () => {
    return {
      all: allRequests.length,
      pending: allRequests.filter(r => r.status === 'pending').length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      rejected: allRequests.filter(r => r.status === 'rejected').length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">Loading requests...</p>
        </div>
      </div>
    );
  }

  const counts = getFilterCounts();

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
            onClick={() => navigate('/admin')} 
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-blue-400 text-center flex-1">Hour Requests</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-blue-400 hover:text-blue-300 p-2 rounded-lg bg-blue-900 bg-opacity-50"
          >
            <svg className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="p-4">
        <div className="bg-slate-800 bg-opacity-60 rounded-lg p-1 flex gap-1 mb-4">
          {[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'approved', label: 'Approved', count: counts.approved },
            { key: 'rejected', label: 'Rejected', count: counts.rejected }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-slate-800 bg-opacity-60 rounded-lg p-3 mb-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by student, event, or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Search is debounced and will trigger loadData via useEffect
            }}
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none"
          />
        </div>

        {/* Last Updated Info */}
        {lastLoadTime && (
          <div className="text-center mb-4 text-slate-400 text-sm">
            <p>Last updated: {lastLoadTime.toLocaleTimeString()}</p>
            <p>Total requests: {allRequests.length} | Filtered: {filteredRequests.length}</p>
          </div>
        )}
      </div>

      {/* Requests List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="px-4 pb-8"
      >
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">No Hour Requests Found</h3>
            <p className="text-slate-400 mb-6">
              {allRequests.length === 0 
                ? "No hour requests have been submitted yet."
                : "No requests match your current filter."
              }
            </p>
            <button
              onClick={handleRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request, index) => {
              const photoData = extractPhotoData(request.description);
              const cleanDescriptionText = cleanDescription(request.description);
              const isProcessing = processingRequests.has(request.id);

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
                    <div>
                      <h3 className="text-xl font-bold text-blue-400">{request.student_name}</h3>
                      <p className="text-slate-300">#{request.student_s_number}</p>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-bold`} style={{ backgroundColor: getStatusColor(request.status) }}>
                      <span className="text-white">{getDisplayStatus(request.status)}</span>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-white">{request.event_name}</h4>
                    <span className="text-blue-400 font-bold">{request.hours_requested} hours</span>
                  </div>

                  {/* Description */}
                  {cleanDescriptionText && (
                    <div className="mb-4">
                      <p className="text-slate-300 leading-relaxed">{cleanDescriptionText}</p>
                    </div>
                  )}

                  {/* Enhanced Photo Section */}
                  {photoData && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-blue-400 font-semibold">Proof Photo Available</span>
                        <div className="flex-1"></div>
                        <span className="text-xs text-green-400 bg-green-900 px-2 py-1 rounded-full">Click to View</span>
                      </div>
                      
                      <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => viewPhoto(request.event_name, photoData)}
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
                              Click the photo to view full size and approve/reject the request
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => viewPhoto(request.event_name, photoData)}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View Full Size
                              </button>
                              
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = photoData;
                                  link.download = `${request.student_name}_${request.event_name}_proof.jpg`;
                                  link.click();
                                }}
                                className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <p className="text-slate-400 text-sm mb-4">
                    Submitted: {formatDate(request.submitted_at)}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {isRequestPending(request) && (
                      <>
                        <button
                          onClick={() => handleReviewRequest(request, 'approve')}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Approve
                        </button>
                        
                        <button
                          onClick={() => handleReviewRequest(request, 'reject')}
                          disabled={isProcessing}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </button>
                      </>
                    )}
                    
                    {/* Delete Button - Available for all requests */}
                    <button
                      onClick={() => handleDeleteRequest(request)}
                      disabled={isProcessing}
                      className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>

                  {/* Processing Indicator */}
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 mt-4 py-2 bg-yellow-900 bg-opacity-50 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                      <span className="text-yellow-400 text-sm">Processing...</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Review Modal */}
      {reviewModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              {reviewModal.action === 'approve' ? 'Approve' : 'Reject'} Request
            </h2>
            
            <div className="space-y-2 mb-4">
              <p className="text-slate-300">Student: {reviewModal.request?.student_name}</p>
              <p className="text-slate-300">Event: {reviewModal.request?.event_name}</p>
              <p className="text-slate-300">Hours: {reviewModal.request?.hours_requested}</p>
            </div>
            
            <textarea
              placeholder="Add notes (optional)..."
              value={reviewModal.notes}
              onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-lg p-3 mb-4 resize-none h-20"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal({ visible: false, request: null, action: null, notes: '' })}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              
              <button
                onClick={submitReview}
                className={`flex-1 py-2 px-4 rounded-lg text-white font-medium ${
                  reviewModal.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Photo Modal */}
      {photoModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Proof Photo - {photoModal.imageName}</h3>
              <button
                onClick={() => setPhotoModal({ visible: false, imageName: null, imageData: null })}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">Photo Details</h4>
                    <p className="text-slate-300 text-sm">Filename: {photoModal.imageName}</p>
                    <p className="text-slate-300 text-sm">Submitted by: {allRequests.find(r => r.event_name === photoModal.imageName)?.student_name}</p>
                    <p className="text-slate-300 text-sm">Event: {allRequests.find(r => r.event_name === photoModal.imageName)?.event_name}</p>
                  </div>
                  
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="text-blue-400 font-semibold mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = photoModal.imageData || '';
                          link.download = photoModal.imageName || 'proof-photo.jpg';
                          link.click();
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Photo
                      </button>
                      
                      <button
                        onClick={() => {
                          const request = allRequests.find(r => r.event_name === photoModal.imageName);
                          if (request) {
                            setPhotoModal({ visible: false, imageName: null, imageData: null });
                            handleReviewRequest(request, 'approve');
                          }
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve Request
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setPhotoModal({ visible: false, imageName: null, imageData: null })}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Close
              </button>
              
              <button
                onClick={() => {
                  const request = allRequests.find(r => r.event_name === photoModal.imageName);
                  if (request) {
                    setPhotoModal({ visible: false, imageName: null, imageData: null });
                    handleReviewRequest(request, 'reject');
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.visible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Delete Hour Request</h2>
                <p className="text-slate-400 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            {deleteModal.request && (
              <div className="bg-slate-700 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <p className="text-slate-300"><span className="font-medium">Student:</span> {deleteModal.request.student_name}</p>
                  <p className="text-slate-300"><span className="font-medium">Event:</span> {deleteModal.request.event_name}</p>
                  <p className="text-slate-300"><span className="font-medium">Hours:</span> {deleteModal.request.hours_requested}</p>
                  <p className="text-slate-300"><span className="font-medium">Status:</span> {deleteModal.request.status}</p>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ visible: false, request: null })}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              
              <button
                onClick={confirmDelete}
                disabled={!!(deleteModal.request && processingRequests.has(deleteModal.request.id))}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-500 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {deleteModal.request && processingRequests.has(deleteModal.request.id) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}