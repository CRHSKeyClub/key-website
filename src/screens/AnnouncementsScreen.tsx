import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import SupabaseService from '../services/SupabaseService';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string;
}

export default function AnnouncementsScreen() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await SupabaseService.getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      await SupabaseService.deleteAnnouncement(id);
      setAnnouncements(announcements.filter(ann => ann.id !== id));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-blue-400 text-lg">Loading announcements...</p>
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
            onClick={() => navigate('/home')} 
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-white text-center flex-1">Announcements</h1>
          <div className="w-6"></div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="p-6">
        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-700 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600"
              >
                <div className="flex items-start justify-between">
                  {/* Left side - Icon and content */}
                  <div className="flex items-start gap-4 flex-1">
                    <motion.div 
                      className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
                      whileHover={{ 
                        scale: 1.1,
                        rotate: 5,
                        backgroundColor: "#3b82f6",
                        transition: { duration: 0.2 }
                      }}
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(59, 130, 246, 0.4)",
                          "0 0 0 8px rgba(59, 130, 246, 0)",
                          "0 0 0 0 rgba(59, 130, 246, 0)"
                        ]
                      }}
                      transition={{
                        boxShadow: {
                          duration: 3,
                          repeat: Infinity,
                          repeatDelay: 2
                        }
                      }}
                    >
                      <motion.svg 
                        className="w-6 h-6 text-white" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                        animate={{
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                      </motion.svg>
                    </motion.div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-400 mb-2">{announcement.title}</h3>
                      <p className="text-slate-300 leading-relaxed">{announcement.message}</p>
                    </div>
                  </div>

                  {/* Right side - Date and delete button */}
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className="text-slate-400 text-sm">{formatDate(announcement.created_at)}</span>
                    
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Announcements Yet</h3>
            <p className="text-slate-400 mb-6">
              Check back later for important updates and news!
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {isAdmin && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          onClick={() => navigate('/create-announcement')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}