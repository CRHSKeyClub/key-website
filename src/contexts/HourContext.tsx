import { useContext, useState, useEffect, createContext, useCallback, ReactNode } from 'react';
import SupabaseService from '../services/SupabaseService';

interface HourRequest {
  id: string;
  student_s_number: string;
  student_name: string;
  event_name: string;
  event_date: string;
  hours_requested: number;
  description: string;
  type?: 'volunteering' | 'social';
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
  image_name?: string;
}

interface HourContextType {
  hourRequests: HourRequest[];
  loading: boolean;
  submitHourRequest: (requestData: any) => Promise<void>;
  updateHourRequestStatus: (requestId: string, status: string, adminNotes?: string, reviewedBy?: string, hoursRequested?: number | null) => Promise<boolean>;
  deleteHourRequest: (requestId: string) => Promise<boolean>;
  getStudentHours: (sNumber: string) => Promise<number>;
  refreshStudentHours: (sNumber: string) => Promise<number>;
  getPendingRequests: () => HourRequest[];
  getStudentRequests: (sNumber: string) => HourRequest[];
  getAllRequests: () => HourRequest[];
  refreshHourRequests: () => Promise<void>;
}

const HourContext = createContext<HourContextType | undefined>(undefined);

export function useHours() {
  const context = useContext(HourContext);
  if (!context) {
    throw new Error('useHours must be used within a HourProvider');
  }
  return context;
}

interface HourProviderProps {
  children: ReactNode;
}

export function HourProvider({ children }: HourProviderProps) {
  const [hourRequests, setHourRequests] = useState<HourRequest[]>([]);
  const [loading, setLoading] = useState(false); // Start as false, only load when needed
  
  // Get auth context to check if user is admin
  // Note: This is inside the provider, so we need to check auth differently
  // We'll make loading conditional based on a flag or check auth in useEffect
  
  const loadHourRequests = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading hour requests from Supabase...');
      const requests = await SupabaseService.getAllHourRequests();
      setHourRequests(requests);
      console.log(`Loaded ${requests.length} hour requests`);
    } catch (error: any) {
      console.error('Failed to load hour requests:', error);
      // If timeout, set empty array to prevent app crash
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.warn('⚠️ Setting empty hour requests due to timeout');
        setHourRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const submitHourRequest = useCallback(async (requestData: any) => {
    try {
      const newRequest = await SupabaseService.submitHourRequest(requestData);
      // Optimistically add to local state instead of reloading (saves egress)
      if (newRequest) {
        setHourRequests(prev => [newRequest, ...prev]);
      }
      // Only reload if explicitly needed (user can refresh if they want)
      // await loadHourRequests(); // Commented out to save egress
    } catch (error) {
      console.error('Failed to submit hour request:', error);
      throw error;
    }
  }, []); // Removed loadHourRequests dependency

  const updateHourRequestStatus = useCallback(async (
    requestId: string, 
    status: string, 
    adminNotes: string = '', 
    reviewedBy: string = 'Admin', 
    hoursRequested: number | null = null
  ) => {
    try {
      await SupabaseService.updateHourRequestStatus(requestId, status, adminNotes, reviewedBy, hoursRequested);
      // Optimistically remove from local state (pending → approved/rejected)
      // This saves egress - no need to reload all requests
      if (status === 'approved' || status === 'rejected') {
        setHourRequests(prev => prev.filter(r => r.id !== requestId));
      }
      // Only reload if explicitly needed
      // await loadHourRequests(); // Commented out to save egress
      return true;
    } catch (error) {
      console.error('Failed to update hour request status:', error);
      throw error;
    }
  }, []); // Removed loadHourRequests dependency

  const deleteHourRequest = useCallback(async (requestId: string) => {
    try {
      await SupabaseService.deleteHourRequest(requestId);
      // Optimistically remove from local state (saves egress)
      setHourRequests(prev => prev.filter(r => r.id !== requestId));
      // Only reload if explicitly needed
      // await loadHourRequests(); // Commented out to save egress
      return true;
    } catch (error) {
      console.error('Failed to delete hour request:', error);
      throw error;
    }
  }, []); // Removed loadHourRequests dependency

  const getStudentHours = useCallback(async (sNumber: string) => {
    try {
      console.log('🔍 Getting hours for student:', sNumber);
      const student = await SupabaseService.getStudent(sNumber);
      // Return total_hours (trigger keeps it in sync with volunteering + social)
      const hours = student ? parseFloat(student.total_hours || 0) : 0;
      console.log('📊 Student hours result:', { sNumber, student, hours });
      return hours;
    } catch (error) {
      console.error('❌ Failed to get student hours:', error);
      return 0;
    }
  }, []);

  const refreshStudentHours = useCallback(async (sNumber: string) => {
    try {
      const student = await SupabaseService.getStudent(sNumber);
      // Return total_hours (trigger keeps it in sync with volunteering + social)
      return student ? parseFloat(student.total_hours || 0) : 0;
    } catch (error) {
      console.error('Failed to refresh student hours:', error);
      return 0;
    }
  }, []);

  const getPendingRequests = useCallback(() => {
    return hourRequests.filter(request => request.status === 'pending');
  }, [hourRequests]);

  const getStudentRequests = useCallback((sNumber: string) => {
    return hourRequests
      .filter(request => request.student_s_number === sNumber.toLowerCase())
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [hourRequests]);

  const getAllRequests = useCallback(() => {
    return hourRequests.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }, [hourRequests]);

  // Don't auto-load hour requests on mount - only load when explicitly requested
  // Admins can call refreshHourRequests() when needed, regular users load on their hour requests page
  // This saves egress by not loading for every user on every page load
  // useEffect(() => {
  //   loadHourRequests().finally(() => {
  //     setLoading(false);
  //   });
  // }, [loadHourRequests]);

  const contextValue: HourContextType = {
    hourRequests,
    loading,
    submitHourRequest,
    updateHourRequestStatus,
    deleteHourRequest,
    getStudentHours,
    refreshStudentHours,
    getPendingRequests,
    getStudentRequests,
    getAllRequests,
    refreshHourRequests: loadHourRequests
  };

  return (
    <HourContext.Provider value={contextValue}>
      {children}
    </HourContext.Provider>
  );
}

