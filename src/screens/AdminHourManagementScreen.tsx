import { useState, useEffect, useRef, useCallback } from 'react';
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
  description?: string; // Optional - loaded on demand to prevent timeouts
  type?: 'volunteering' | 'social';
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at?: string | null;
  image_name?: string;
}

export default function AdminHourManagementScreen() {
  const navigate = useNavigate();
  const { deleteHourRequest, hourRequests: contextHourRequests, loading: contextLoading, refreshHourRequests } = useHours();
  const { showModal } = useModal();
  
  const [allRequests, setAllRequests] = useState<HourRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HourRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // This page only shows pending requests - no filter needed
  // const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLoadTime, setLastLoadTime] = useState<Date | null>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  // Track which requests have loaded their image data (description) - using object instead of Map for React reactivity
  const [loadedImageData, setLoadedImageData] = useState<Record<string, string>>({});
  // Track which requests are currently loading images
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  
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

  const [editingHours, setEditingHours] = useState<{
    requestId: string | null;
    value: string;
  }>({
    requestId: null,
    value: ''
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to filter and set requests
  // This page only shows pending requests from hour_requests table
  const filterAndSetRequests = useCallback((requests: HourRequest[]) => {
    // Only show pending requests (filter out any non-pending that might be in context)
    const pendingOnly = requests.filter(r => r.status === 'pending');
    
    let filtered = pendingOnly;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.student_name?.toLowerCase().includes(query) ||
        r.student_s_number?.toLowerCase().includes(query) ||
        r.event_name?.toLowerCase().includes(query) ||
        (r.descriptions || r.description)?.toLowerCase().includes(query)
      );
    }
    
    setAllRequests(pendingOnly);
    setFilteredRequests(filtered);
  }, [searchQuery]);

  // Use context data on initial load if available (avoids redundant query)
  useEffect(() => {
    if (!contextLoading && contextHourRequests.length > 0 && allRequests.length === 0) {
      console.log('✅ Using cached hour requests from context:', contextHourRequests.length);
      filterAndSetRequests(contextHourRequests);
      setLoading(false);
    } else if (!contextLoading && contextHourRequests.length === 0 && allRequests.length === 0) {
      // Only load if context doesn't have data
      loadData();
    }
  }, [contextLoading, contextHourRequests.length, allRequests.length, filterAndSetRequests]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // This page only shows pending requests - filter removed
  // useEffect removed since we don't have filter changes anymore

  const loadData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      console.log('🔄 Loading hour requests from database...');
      
      // If no search query and context has data, use cached data (no refresh to save egress)
      if (!forceRefresh && !searchQuery.trim() && contextHourRequests.length > 0) {
        console.log('📦 Using cached context data (skipping refresh to save egress)...');
        filterAndSetRequests(contextHourRequests);
        setLastLoadTime(new Date());
        setLoading(false);
        // DON'T refresh in background - saves egress!
        // User can click refresh button if they want fresh data
        return;
      }
      
      let requests: HourRequest[];
      
      // This page ONLY shows pending requests from hour_requests table
      // If there's a search query, search only in pending requests
      if (searchQuery.trim()) {
        console.log('🔍 Searching pending hour requests with query:', searchQuery);
        // Only search pending requests in hour_requests table
        // Reduced limit to 50 to minimize egress (was 100)
        requests = await SupabaseService.searchHourRequests(searchQuery.trim(), 'pending', 50);
      } else {
        // Always use getAllHourRequests which only queries hour_requests table for pending
        requests = await SupabaseService.getAllHourRequests();
      }
      
      setAllRequests(requests);
      setFilteredRequests(requests); // Search results are already filtered
      setLastLoadTime(new Date());
      
      // Debug: log image_name for all requests
      const requestsWithImages = requests.filter(r => r.image_name);
      console.log(`✅ Data loading completed: ${requests.length} requests, ${requestsWithImages.length} with images`);
      if (requestsWithImages.length > 0) {
        console.log('📸 Requests with images:', requestsWithImages.map(r => ({ id: r.id, student: r.student_name, image_name: r.image_name })));
      }
    } catch (error: any) {
      console.error('❌ Error loading requests:', error);
      
      // If error but we have context data, use that as fallback
      if (contextHourRequests.length > 0) {
        console.warn('⚠️ Using cached context data due to error');
        filterAndSetRequests(contextHourRequests);
      } else {
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
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true); // Force refresh
    setRefreshing(false);
  };

  // Filter removed - this page only shows pending requests
  // const handleFilterChange = (newFilter: string) => {
  //   setFilter(newFilter);
  // };

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
    
    if (!reviewModal.notes.trim()) {
      showModal({
        title: 'Error',
        message: 'Admin notes are required. Please provide notes for this action.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

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
        // Force a fresh reload from the database so the list auto-refreshes
        await loadData(true);
        
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

  const handleToggleType = async (request: HourRequest) => {
    const requestId = request.id;
    
    if (processingRequests.has(requestId)) return;
    setProcessingRequests(prev => new Set([...prev, requestId]));

    const newType = request.type === 'volunteering' ? 'social' : 'volunteering';

    try {
      await SupabaseService.updateHourRequestType(requestId, newType);
      
      // Update the local state
      setAllRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, type: newType } : r
      ));
      setFilteredRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, type: newType } : r
      ));
      
      showModal({
        title: 'Success',
        message: `Request type changed to ${newType}!`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to update request type:', error);
      showModal({
        title: 'Error',
        message: 'Failed to update request type',
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

  const handleStartEditHours = (request: HourRequest) => {
    setEditingHours({
      requestId: request.id,
      value: request.hours_requested.toString()
    });
  };

  const handleCancelEditHours = () => {
    setEditingHours({
      requestId: null,
      value: ''
    });
  };

  const handleSaveHours = async (request: HourRequest) => {
    const requestId = request.id;
    const newHours = parseFloat(editingHours.value);

    // Validate hours
    if (isNaN(newHours) || newHours <= 0) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid number of hours greater than 0',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    if (processingRequests.has(requestId)) return;
    setProcessingRequests(prev => new Set([...prev, requestId]));

    try {
      await SupabaseService.updateHourRequestHours(requestId, newHours);
      
      // Update the local state
      setAllRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, hours_requested: newHours } : r
      ));
      setFilteredRequests(prev => prev.map(r => 
        r.id === requestId ? { ...r, hours_requested: newHours } : r
      ));
      
      // Clear editing state
      setEditingHours({
        requestId: null,
        value: ''
      });
      
      showModal({
        title: 'Success',
        message: `Hours updated to ${newHours}!`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
    } catch (error) {
      console.error('Failed to update hours:', error);
      showModal({
        title: 'Error',
        message: 'Failed to update hours',
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

  // Load image data on-demand for a specific request
  const loadImageForRequest = async (requestId: string) => {
    if (loadedImageData[requestId] || loadingImages.has(requestId)) {
      // Already loaded or currently loading
      console.log(`⏭️ Skipping load for ${requestId} - already loaded or loading`);
      return;
    }

    try {
      setLoadingImages(prev => new Set(prev).add(requestId));
      console.log(`🔄 Loading image for request ${requestId}...`);
      
      // Find the request to get its status
      const request = allRequests.find(r => r.id === requestId);
      const status = request?.status || 'pending';
      
      // Fetch full request details including description
      const fullRequest = await SupabaseService.getHourRequestDetails(requestId, status);
      
      console.log(`📦 Full request object for ${requestId}:`, {
        hasDescription: 'description' in (fullRequest || {}),
        hasDescriptions: 'descriptions' in (fullRequest || {}),
        descriptionType: typeof (fullRequest?.description || fullRequest?.descriptions),
        descriptionValue: (fullRequest?.description || fullRequest?.descriptions) ? (fullRequest.description || fullRequest.descriptions).substring(0, 100) : (fullRequest?.description || fullRequest?.descriptions),
        allKeys: fullRequest ? Object.keys(fullRequest) : []
      });
      
      // Access description field - check 'description' first (actual DB column), then fallbacks
      const description = fullRequest?.description || fullRequest?.descriptions || fullRequest?.Description || fullRequest?.desc || null;
      
      if (description && typeof description === 'string' && description.length > 0) {
        console.log(`✅ Loaded description for request ${requestId}, length: ${description.length}`);
        console.log(`📝 Description preview: ${description.substring(0, 300)}...`);
        
        // Store the description for this request - create new object to trigger re-render
        setLoadedImageData(prev => ({
          ...prev,
          [requestId]: description
        }));
        
        // Try extracting photo data to verify it works
        const extracted = extractPhotoData(description);
        console.log(`📸 Extracted photo data: ${extracted ? 'SUCCESS' : 'FAILED'}`);
        if (extracted) {
          console.log(`📸 Photo data preview: ${extracted.substring(0, 50)}...`);
          console.log(`📸 Photo data length: ${extracted.length}`);
        } else {
          console.log(`⚠️ Photo extraction failed. Checking description patterns...`);
          // Log what patterns exist in description
          const hasPhotoData = description.includes('[PHOTO_DATA:');
          const hasPhotoColon = description.includes('Photo:');
          const hasDataImage = description.includes('data:image/');
          const hasBase64 = /[A-Za-z0-9+/]{100,}/.test(description);
          console.log(`   - Has [PHOTO_DATA:]: ${hasPhotoData}`);
          console.log(`   - Has Photo:: ${hasPhotoColon}`);
          console.log(`   - Has data:image/: ${hasDataImage}`);
          console.log(`   - Has base64-like string: ${hasBase64}`);
        }
      } else {
        console.log(`⚠️ No description found for request ${requestId}`);
        console.log(`   - fullRequest?.description:`, fullRequest?.description);
        console.log(`   - fullRequest?.descriptions:`, fullRequest?.descriptions);
        console.log(`   - fullRequest?.Description:`, fullRequest?.Description);
        console.log(`   - fullRequest?.desc:`, fullRequest?.desc);
      }
    } catch (error) {
      console.error(`❌ Error loading image for request ${requestId}:`, error);
      showModal({
        title: 'Error',
        message: 'Failed to load proof photo. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#EF4444'
      });
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const extractPhotoData = (description: string) => {
    if (!description) return null;
    
    // Try multiple patterns to extract photo data (handles both app and website formats)
    const patterns = [
      // Pattern 1: [PHOTO_DATA:...] format (website format)
      /\[PHOTO_DATA:(.*?)\]/s, // 's' flag for multiline
      // Pattern 2: Photo: ... format (may have pipe separator or newline)
      /Photo:\s*([^\n|]+)/s,
      // Pattern 3: Full data URI (data:image/...;base64,...) - capture everything including newlines
      /data:image\/[^;]+;base64,([A-Za-z0-9+/=\s\n]+)/s,
      // Pattern 4: Base64 string without data URI prefix (app format) - must be long enough
      /([A-Za-z0-9+/=\s]{200,})/ // Large base64 string (at least 200 chars, allow spaces/newlines)
    ];
    
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        let photoData = (match[1] || match[0]).trim();
        
        // Remove newlines and extra whitespace from base64
        photoData = photoData.replace(/\s+/g, '');
        
        // If it already has data:image/ prefix, return as-is
        if (photoData.startsWith('data:image/')) {
          // Also clean this one
          return photoData.replace(/\s+/g, '');
        }
        
        // If it's just base64 data (from app), add data URI prefix
        // Check if it looks like base64 (long string of base64 chars)
        if (photoData.length > 100 && /^[A-Za-z0-9+/=]+$/.test(photoData)) {
          // Try to detect image type from first few chars or default to jpeg
          if (photoData.substring(0, 20).includes('iVBORw0KGgo')) {
            // PNG signature (looks for PNG magic bytes in base64)
            return `data:image/png;base64,${photoData}`;
          } else if (photoData.substring(0, 20).includes('/9j/')) {
            // JPEG signature (looks for JPEG magic bytes in base64)
            return `data:image/jpeg;base64,${photoData}`;
          } else {
            // Default to JPEG for app images
            return `data:image/jpeg;base64,${photoData}`;
          }
        }
        
        // If we got here but data looks valid, try adding prefix anyway
        if (photoData.length > 100) {
          return `data:image/jpeg;base64,${photoData}`;
        }
      }
    }
    
    // Last resort: check if description contains large base64-like string anywhere
    // Remove common text patterns and check if remainder is base64
    const textRemoved = description
      .replace(/\[PHOTO_DATA:.*?\]/gs, '')
      .replace(/Photo:.*?/g, '')
      .replace(/data:image\/[^;]+;base64,/, '')
      .replace(/[^A-Za-z0-9+/=\s]/g, '')
      .replace(/\s+/g, '')
      .trim();
    
    // If what's left is a large base64-like string, use it
    if (textRemoved.length > 100 && /^[A-Za-z0-9+/=]+$/.test(textRemoved)) {
      return `data:image/jpeg;base64,${textRemoved}`;
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
    // This page only shows pending requests
    return {
      all: allRequests.length,
      pending: allRequests.length, // All requests shown are pending
      approved: 0,
      rejected: 0
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin-hour-requests-stats')}
              className="text-blue-400 hover:text-blue-300 px-4 py-2 rounded-lg bg-blue-900 bg-opacity-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Stats
            </button>
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
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="p-4">
        {/* This page only shows pending requests - filter removed since we only query pending table */}
        <div className="bg-slate-800 bg-opacity-60 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-slate-300 font-medium">Showing Pending Requests Only</span>
            </div>
            <span className="text-blue-400 font-bold text-lg">Pending: {counts.pending}</span>
          </div>
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
              // Get loaded description (from object or from request itself) - check 'description' first (actual DB column)
              const loadedDescription = loadedImageData[request.id] || request.description || request.descriptions || null;
              
              // Extract photo data from description - recalculate every render to catch updates
              // Always check description for images, not just image_name column
              const photoData = loadedDescription ? extractPhotoData(loadedDescription) : null;
              
              const cleanDescriptionText = loadedDescription ? cleanDescription(loadedDescription) : '';
              const isProcessing = processingRequests.has(request.id);
              const isLoadingImage = loadingImages.has(request.id);
              
              // Images are stored in the description column as base64, NOT in image_name (which is just filename)
              // image_name tells us there MIGHT be an image in description, but we need to check description
              const hasLoadedDescription = !!loadedImageData[request.id];
              const hasDescription = !!(request.description || request.descriptions) || hasLoadedDescription;
              
              // Show button/section if:
              // 1. image_name exists (indicates there might be image data in descriptions/description)
              // 2. OR we have description loaded
              // 3. OR we found photoData in description
              const hasImageAvailable = request.image_name || hasDescription || photoData;
              
              // Can load if:
              // - image_name exists (means there's likely image data in description)
              // - AND we don't have description loaded yet
              // - AND we haven't extracted photoData yet
              const canLoadImage = request.image_name && !hasDescription && !photoData;
              
              // Debug logging - log for all requests to see what's happening
              console.log(`📸 Request ${request.id} (${request.student_name}):`, {
                image_name: request.image_name,
                hasRequestDescription: !!(request.description || request.descriptions),
                requestDescriptionLength: (request.description || request.descriptions)?.length || 0,
                hasLoadedDescription,
                loadedDescriptionLength: loadedImageData[request.id]?.length || 0,
                photoData: photoData ? `EXTRACTED (length: ${photoData.length}, preview: ${photoData.substring(0, 50)}...)` : 'NOT FOUND',
                canLoadImage,
                hasImageAvailable,
                hasDescription,
                loadedDescriptionSample: loadedDescription ? loadedDescription.substring(0, 150) : 'none'
              });

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
                    
                    {/* Hours Display/Edit */}
                    <div className="flex items-center gap-2">
                      {editingHours.requestId === request.id ? (
                        // Edit mode
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={editingHours.value}
                            onChange={(e) => setEditingHours(prev => ({ ...prev, value: e.target.value }))}
                            className="w-20 bg-slate-700 text-white text-center rounded px-2 py-1 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveHours(request);
                              } else if (e.key === 'Escape') {
                                handleCancelEditHours();
                              }
                            }}
                          />
                          <span className="text-blue-400 text-sm">hours</span>
                          <button
                            onClick={() => handleSaveHours(request)}
                            disabled={isProcessing}
                            className="text-green-400 hover:text-green-300 disabled:text-gray-500"
                            title="Save"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEditHours}
                            disabled={isProcessing}
                            className="text-red-400 hover:text-red-300 disabled:text-gray-500"
                            title="Cancel"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 font-bold">{request.hours_requested} hours</span>
                          {isRequestPending(request) && (
                            <button
                              onClick={() => handleStartEditHours(request)}
                              disabled={isProcessing}
                              className="text-slate-400 hover:text-blue-400 disabled:text-gray-600 transition-colors"
                              title="Edit hours"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type Display and Toggle */}
                  <div className="flex items-center gap-3 mb-4 bg-slate-800 bg-opacity-50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-slate-300 font-medium">Type:</span>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      request.type === 'volunteering' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-orange-600 text-white'
                    }`}>
                      {request.type === 'volunteering' ? 'Volunteering' : 'Social'}
                    </div>

                    {isRequestPending(request) && (
                      <button
                        onClick={() => handleToggleType(request)}
                        disabled={isProcessing}
                        className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        title={`Change to ${request.type === 'volunteering' ? 'Social' : 'Volunteering'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Switch to {request.type === 'volunteering' ? 'Social' : 'Volunteering'}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  {cleanDescriptionText && (
                    <div className="mb-4">
                      <p className="text-slate-300 leading-relaxed">{cleanDescriptionText}</p>
                    </div>
                  )}

                  {/* Photo Section - Button to load or display if loaded */}
                  {hasImageAvailable && (
                    <div className="mb-4">
                      {canLoadImage ? (
                        // Show button to load image when description doesn't exist yet
                        <button
                          onClick={() => loadImageForRequest(request.id)}
                          disabled={isLoadingImage || isProcessing}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                        >
                          {isLoadingImage ? (
                            <>
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Loading Proof Photo...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>Load Proof Photo</span>
                            </>
                          )}
                        </button>
                      ) : photoData ? (
                        // Show image if we extracted photo data from description
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-blue-400 font-semibold">Proof Photo Available</span>
                          </div>
                          <div className="relative group">
                            <img
                              onClick={() => viewPhoto(request.event_name, photoData)}
                              src={photoData} 
                              alt="Proof photo thumbnail"
                              className="w-full h-auto max-h-64 object-contain rounded-lg cursor-pointer border border-slate-600 hover:border-blue-400 transition-colors"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Click to view full size
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => viewPhoto(request.event_name, photoData)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Full Size
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = photoData;
                                link.download = request.image_name || `${request.event_name}_proof.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download Photo
                            </button>
                          </div>
                        </>
                      ) : (
                        // Show nothing if description was loaded but no photo found
                        <div className="text-center py-4 text-slate-400 text-sm">
                          No photo found in description
                        </div>
                      )}
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
              placeholder="Add notes (required)..."
              value={reviewModal.notes}
              onChange={(e) => setReviewModal(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-lg p-3 mb-4 resize-none h-20"
              required
            />
            {!reviewModal.notes.trim() && (
              <p className="text-red-400 text-sm mb-2">Admin notes are required</p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal({ visible: false, request: null, action: null, notes: '' })}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              
              <button
                onClick={submitReview}
                disabled={!reviewModal.notes.trim()}
                className={`flex-1 py-2 px-4 rounded-lg text-white font-medium ${
                  reviewModal.action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-gray-600 disabled:cursor-not-allowed`}
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