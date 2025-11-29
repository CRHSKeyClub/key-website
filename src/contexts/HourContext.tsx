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
  const [loading, setLoading] = useState(true);
  
  const loadHourRequests = useCallback(async () => {
    try {
      console.log('Loading hour requests from Supabase...');
      const requests = await SupabaseService.getAllHourRequests();
      setHourRequests(requests);
      console.log(`Loaded ${requests.length} hour requests`);
    } catch (error) {
      console.error('Failed to load hour requests:', error);
    }
  }, []);

  const submitHourRequest = useCallback(async (requestData: any) => {
    try {
      await SupabaseService.submitHourRequest(requestData);
      await loadHourRequests();
    } catch (error) {
      console.error('Failed to submit hour request:', error);
      throw error;
    }
  }, [loadHourRequests]);

  const updateHourRequestStatus = useCallback(async (
    requestId: string, 
    status: string, 
    adminNotes: string = '', 
    reviewedBy: string = 'Admin', 
    hoursRequested: number | null = null
  ) => {
    try {
      await SupabaseService.updateHourRequestStatus(requestId, status, adminNotes, reviewedBy, hoursRequested);
      await loadHourRequests();
      return true;
    } catch (error) {
      console.error('Failed to update hour request status:', error);
      throw error;
    }
  }, [loadHourRequests]);

  const deleteHourRequest = useCallback(async (requestId: string) => {
    try {
      await SupabaseService.deleteHourRequest(requestId);
      await loadHourRequests();
      return true;
    } catch (error) {
      console.error('Failed to delete hour request:', error);
      throw error;
    }
  }, [loadHourRequests]);

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

  useEffect(() => {
    loadHourRequests().finally(() => {
      setLoading(false);
    });
  }, [loadHourRequests]);

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

