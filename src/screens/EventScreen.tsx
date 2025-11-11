import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';

export default function EventScreen() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { getEventById, signUpForEvent, loading } = useEvents();
  const { user, isAdmin } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    if (eventId) {
      const eventData = getEventById(eventId);
      setEvent(eventData);
    }
  }, [eventId, getEventById]);

  const handleSignUp = async () => {
    if (!event || !user) return;
    
    setIsSigningUp(true);
    try {
      await signUpForEvent(event.id, user.id);
      alert('Successfully signed up for the event!');
      // Refresh event data
      const updatedEvent = getEventById(eventId!);
      setEvent(updatedEvent);
    } catch (error) {
      console.error('Error signing up for event:', error);
      alert('Error signing up for event');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleEdit = () => {
    navigate(`/create-event?edit=${eventId}`);
  };

  const isUserSignedUp = event?.attendees?.includes(user?.id);

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading event...</div>
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
          <h1 className="text-3xl font-bold text-white">Event Details</h1>
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
          {/* Event Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
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
              
              {isAdmin && (
                <motion.button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Edit Event
                </motion.button>
              )}
            </div>
          </div>

          {/* Event Description */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-3">Description</h3>
            <p className="text-slate-300 leading-relaxed">{event.description}</p>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">Event Information</h4>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{(() => {
                    const [year, month, day] = event.date.split('T')[0].split('-');
                    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
                  })()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{event.startTime?.substring(0, 5)} - {event.endTime?.substring(0, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span>{event.location}</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span>{event.capacity} people</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-white mb-2">Attendance</h4>
              <div className="space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span>Registered:</span>
                  <span>{event.attendees?.length || 0} people</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Spots:</span>
                  <span>{event.capacity - (event.attendees?.length || 0)} spots</span>
                </div>
                <div className="w-full bg-slate-600 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((event.attendees?.length || 0) / event.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Up Section */}
          {!isAdmin && (
            <div className="text-center">
              {isUserSignedUp ? (
                <div className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">You're Signed Up!</h3>
                  <p className="text-slate-300">You're registered for this event. We'll see you there!</p>
                </div>
              ) : (
                <motion.button
                  onClick={handleSignUp}
                  disabled={isSigningUp || (event.attendees?.length || 0) >= event.capacity}
                  className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSigningUp ? 'Signing Up...' : 'Sign Up for Event'}
                </motion.button>
              )}
              
              {(event.attendees?.length || 0) >= event.capacity && !isUserSignedUp && (
                <p className="text-red-400 mt-2">This event is full</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
