import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';

export default function AttendeeListScreen() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { getEventById, loading } = useEvents();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    if (eventId) {
      const eventData = getEventById(eventId);
      setEvent(eventData);
    }
  }, [eventId, getEventById]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
    }
  }, [isAdmin, navigate]);

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      {/* Header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/home')}
            className="p-2 text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-white">Event Attendees</h1>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        className="max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
          {/* Event Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{event.title}</h2>
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                </svg>
                <span>{(() => {
                  const [year, month, day] = event.date.split('T')[0].split('-');
                  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                })()}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
                <span>{event.attendees?.length || 0} / {event.capacity} attendees</span>
              </div>
            </div>
          </div>

          {/* Attendees List */}
          <div className="space-y-3">
            {!event.attendees || event.attendees.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <svg className="w-16 h-16 mx-auto text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">No Attendees Yet</h3>
                <p className="text-slate-400">No one has signed up for this event yet.</p>
              </div>
            ) : (
              event.attendees.map((attendeeId: string, index: number) => (
                <motion.div
                  key={attendeeId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-700 bg-opacity-60 rounded-lg p-4 border border-slate-600"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">Student {attendeeId}</h3>
                      <p className="text-slate-400">S-Number: {attendeeId}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm text-slate-400">Attendee #{index + 1}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Summary */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mt-6 bg-slate-700 bg-opacity-60 rounded-lg p-4 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-400">{event.attendees.length}</div>
                  <div className="text-sm text-slate-400">Registered</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{event.capacity - event.attendees.length}</div>
                  <div className="text-sm text-slate-400">Available</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-400">{event.capacity}</div>
                  <div className="text-sm text-slate-400">Capacity</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round((event.attendees.length / event.capacity) * 100)}%
                  </div>
                  <div className="text-sm text-slate-400">Full</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
