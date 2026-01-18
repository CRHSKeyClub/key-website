import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useHours } from '../contexts/HourContext';
import SupabaseService from '../services/SupabaseService';

interface HourRequestsStats {
  total_pending: number;
  pending_volunteering: number;
  pending_social: number;
  total_hours_pending: number;
  volunteering_hours_pending: number;
  social_hours_pending: number;
  oldest_pending_date: string | null;
  newest_pending_date: string | null;
  avg_days_pending: number | null;
}

export default function AdminHourRequestsStatsScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { hourRequests, loading: contextLoading, refreshHourRequests } = useHours();
  
  const [stats, setStats] = useState<HourRequestsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    loadStats();
  }, [isAdmin, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get pending requests from context or fetch fresh
      const pendingRequests = hourRequests.filter(r => r.status === 'pending');
      
      if (pendingRequests.length === 0 && !contextLoading) {
        // If context has no pending requests, refresh it
        await refreshHourRequests();
        const refreshed = await SupabaseService.getAllHourRequests();
        calculateStats(refreshed);
      } else {
        calculateStats(pendingRequests);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requests: any[]) => {
    const pending = requests.filter(r => r.status === 'pending');
    
    const volunteering = pending.filter(r => r.type === 'volunteering');
    const social = pending.filter(r => r.type === 'social');
    
    const totalHours = pending.reduce((sum, r) => sum + (parseFloat(r.hours_requested) || 0), 0);
    const volunteeringHours = volunteering.reduce((sum, r) => sum + (parseFloat(r.hours_requested) || 0), 0);
    const socialHours = social.reduce((sum, r) => sum + (parseFloat(r.hours_requested) || 0), 0);
    
    const submittedDates = pending
      .map(r => r.submitted_at ? new Date(r.submitted_at) : null)
      .filter(d => d !== null) as Date[];
    
    const oldestDate = submittedDates.length > 0 
      ? new Date(Math.min(...submittedDates.map(d => d.getTime())))
      : null;
    
    const newestDate = submittedDates.length > 0
      ? new Date(Math.max(...submittedDates.map(d => d.getTime())))
      : null;
    
    const now = new Date();
    const avgDays = submittedDates.length > 0
      ? submittedDates.reduce((sum, d) => sum + (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24), 0) / submittedDates.length
      : null;
    
    setStats({
      total_pending: pending.length,
      pending_volunteering: volunteering.length,
      pending_social: social.length,
      total_hours_pending: totalHours,
      volunteering_hours_pending: volunteeringHours,
      social_hours_pending: socialHours,
      oldest_pending_date: oldestDate?.toISOString() || null,
      newest_pending_date: newestDate?.toISOString() || null,
      avg_days_pending: avgDays
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshHourRequests();
    await loadStats();
    setRefreshing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDays = (days: number | null) => {
    if (days === null) return 'N/A';
    return days < 1 
      ? `${Math.round(days * 24)} hours`
      : days < 7
      ? `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''}`
      : `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">Loading statistics...</p>
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
            onClick={() => navigate('/admin-hour-management')} 
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Hour Management
          </button>
          <h1 className="text-3xl font-bold text-blue-400 text-center flex-1">Pending Hour Requests Stats</h1>
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

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="p-6"
      >
        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Total Pending */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Total Pending</h3>
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-blue-400">{stats.total_pending}</p>
              <p className="text-sm text-slate-400 mt-2">Requests awaiting review</p>
            </motion.div>

            {/* Pending Volunteering */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Volunteering</h3>
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-green-400">{stats.pending_volunteering}</p>
              <p className="text-sm text-slate-400 mt-2">Volunteering requests</p>
            </motion.div>

            {/* Pending Social */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Social</h3>
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-purple-400">{stats.pending_social}</p>
              <p className="text-sm text-slate-400 mt-2">Social requests</p>
            </motion.div>

            {/* Total Hours Pending */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Total Hours</h3>
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-orange-400">{stats.total_hours_pending.toFixed(1)}</p>
              <p className="text-sm text-slate-400 mt-2">Hours pending approval</p>
            </motion.div>

            {/* Volunteering Hours Pending */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Volunteering Hours</h3>
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-green-400">{stats.volunteering_hours_pending.toFixed(1)}</p>
              <p className="text-sm text-slate-400 mt-2">Volunteering hours pending</p>
            </motion.div>

            {/* Social Hours Pending */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Social Hours</h3>
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-purple-400">{stats.social_hours_pending.toFixed(1)}</p>
              <p className="text-sm text-slate-400 mt-2">Social hours pending</p>
            </motion.div>

            {/* Average Days Pending */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Avg. Days Pending</h3>
                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-4xl font-bold text-cyan-400">{formatDays(stats.avg_days_pending)}</p>
              <p className="text-sm text-slate-400 mt-2">Average time pending review</p>
            </motion.div>

            {/* Oldest Pending Date */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Oldest Pending</h3>
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-400">{formatDate(stats.oldest_pending_date)}</p>
              <p className="text-sm text-slate-400 mt-2">Oldest request submission date</p>
            </motion.div>

            {/* Newest Pending Date */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9 }}
              className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-300">Newest Pending</h3>
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-blue-400">{formatDate(stats.newest_pending_date)}</p>
              <p className="text-sm text-slate-400 mt-2">Most recent request submission</p>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-slate-400">No statistics available</p>
            <button
              onClick={handleRefresh}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Refresh
            </button>
          </div>
        )}

        {/* Last Updated Info */}
        {lastRefresh && (
          <div className="text-center mt-6 text-slate-400 text-sm">
            <p>Last updated: {lastRefresh.toLocaleTimeString()}</p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => navigate('/admin-hour-management')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            View All Pending Requests
          </button>
        </div>
      </motion.div>
    </div>
  );
}
