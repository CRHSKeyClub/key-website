import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useHours } from '../contexts/HourContext';
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
}

export default function HomeScreen() {
  const { user, isAdmin } = useAuth();
  const { getStudentHours } = useHours();
  const [totalHours, setTotalHours] = useState(0);
  const [recentRequests, setRecentRequests] = useState<HourRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAdmin) {
      loadHours();
      loadRecentRequests();
    }
  }, [user, isAdmin]);

  const loadHours = async () => {
    if (user?.sNumber) {
      const hours = await getStudentHours(user.sNumber);
      setTotalHours(hours);
    }
  };

  const loadRecentRequests = async () => {
    if (user?.sNumber) {
      setLoadingRequests(true);
      try {
        const requests = await SupabaseService.getStudentHourRequests(user.sNumber);
        // Get the 3 most recent requests
        setRecentRequests(requests.slice(0, 3));
      } catch (error) {
        console.error('Failed to load recent requests:', error);
      } finally {
        setLoadingRequests(false);
      }
    }
  };

  // Calculate progress percentage (assuming 20 hours goal)
  const goalHours = 20;
  const progressPercentage = Math.min((totalHours / goalHours) * 100, 100);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="text-gray-300 text-lg">
            {isAdmin ? 'Manage your Key Club activities' : 'Track your service hours and stay connected'}
          </p>
        </motion.div>

        {!isAdmin && (
          <>
            {/* Student Profile Info */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-slate-700 bg-opacity-50 rounded-xl p-6 mb-8 backdrop-blur-sm border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-400">Your Profile</h2>
                <div className="flex items-center gap-4">
                  {user?.tshirtSize && (
                    <div className="bg-blue-600 bg-opacity-20 px-3 py-2 rounded-lg border border-blue-500">
                      <span className="text-blue-300 text-sm font-medium">T-Shirt Size</span>
                      <div className="text-white font-bold text-lg">{user.tshirtSize}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-300 text-sm">Student ID</p>
                  <p className="text-white font-semibold">{user?.sNumber}</p>
                </div>
                <div>
                  <p className="text-gray-300 text-sm">Name</p>
                  <p className="text-white font-semibold">{user?.name || 'Not set'}</p>
                </div>
              </div>
            </motion.div>

            {/* Service Hours Progress */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-slate-700 bg-opacity-50 rounded-xl p-6 mb-8 backdrop-blur-sm border border-slate-600"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-400">Service Hours Progress</h2>
                <span className="text-3xl font-bold text-white">{totalHours} hrs</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-4 mb-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-4 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                ></motion.div>
              </div>
              <p className="text-gray-300 text-center">
                {goalHours - totalHours} hours remaining to reach your goal
              </p>
            </motion.div>
          </>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {isAdmin ? (
            /* Admin Quick Actions */
            <>
              <motion.button
                onClick={() => navigate('/event-creation')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Events</div>
              </motion.button>

              <motion.button
                onClick={() => navigate('/announcements')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Announcements</div>
              </motion.button>

              <motion.button
                onClick={() => navigate('/admin-students')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Students</div>
              </motion.button>

              <motion.button
                onClick={() => navigate('/admin-hour-management')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Hour Requests</div>
              </motion.button>
            </>
          ) : (
            /* Student Quick Actions */
            <>
              <motion.button
                onClick={() => navigate('/hour-request')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Request Hours</div>
              </motion.button>

              <motion.button
                onClick={() => navigate('/calendar')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Calendar</div>
              </motion.button>

              <motion.button
                onClick={() => navigate('/officers')}
                className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 hover:bg-opacity-20 transition-all text-center border border-white border-opacity-20"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="mb-2">
                  <svg className="w-12 h-12 mx-auto text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                </div>
                <div className="font-semibold text-white">Officers</div>
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            {!isAdmin && recentRequests.length > 0 && (
              <button
                onClick={() => navigate('/student-hour-requests')}
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
              >
                View All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="bg-slate-700 bg-opacity-50 rounded-xl p-6 backdrop-blur-sm border border-slate-600">
            {isAdmin ? (
              <p className="text-gray-300 text-center">
                Manage events, announcements, and student activities from the navigation menu.
              </p>
            ) : loadingRequests ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Loading your requests...</p>
              </div>
            ) : recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request, index) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'pending': return 'bg-yellow-500';
                      case 'approved': return 'bg-green-500';
                      case 'rejected': return 'bg-red-500';
                      default: return 'bg-gray-500';
                    }
                  };

                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-slate-600 bg-opacity-50 rounded-lg hover:bg-opacity-70 transition-all cursor-pointer"
                      onClick={() => navigate('/student-hour-requests')}
                    >
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{request.event_name}</h3>
                        <p className="text-gray-400 text-sm">
                          {request.hours_requested} hours • {new Date(request.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(request.status)}`}>
                        {request.status.toUpperCase()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-300 mb-2">No recent hour requests</p>
                <button
                  onClick={() => navigate('/hour-request')}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Submit your first request →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}