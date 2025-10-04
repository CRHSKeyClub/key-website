import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useHours } from '../contexts/HourContext';

export default function HomeScreen() {
  const { user, isAdmin } = useAuth();
  const { getStudentHours } = useHours();
  const [totalHours, setTotalHours] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAdmin) {
      loadHours();
    }
  }, [user, isAdmin]);

  const loadHours = async () => {
    if (user?.sNumber) {
      const hours = await getStudentHours(user.sNumber);
      setTotalHours(hours);
    }
  };

  // Calculate progress percentage (assuming 25 hours goal)
  const goalHours = 25;
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
          /* Service Hours Progress */
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
          <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="bg-slate-700 bg-opacity-50 rounded-xl p-6 backdrop-blur-sm border border-slate-600">
            <p className="text-gray-300 text-center">
              {isAdmin 
                ? 'Manage events, announcements, and student activities from the navigation menu.'
                : 'Your recent hour requests and event participation will appear here.'
              }
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}