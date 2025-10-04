import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';

export default function EventDeletionScreen() {
  const navigate = useNavigate();
  const { events, loading, deleteEvent } = useEvents();
  const { isAdmin } = useAuth();
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
    }
  }, [isAdmin, navigate]);

  const handleDeleteSelected = async () => {
    if (selectedEvents.length === 0) {
      alert('Please select events to delete');
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedEvents.length} event(s)?`)) {
      try {
        for (const eventId of selectedEvents) {
          await deleteEvent(eventId);
        }
        setSelectedEvents([]);
        alert('Events deleted successfully');
      } catch (error) {
        console.error('Error deleting events:', error);
        alert('Error deleting events');
      }
    }
  };

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === events.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(events.map(event => event.id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading events...</div>
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
          <h1 className="text-3xl font-bold text-white">Delete Events</h1>
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
          {/* Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {selectedEvents.length === events.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-slate-300">
                {selectedEvents.length} of {events.length} selected
              </span>
            </div>
            
            {selectedEvents.length > 0 && (
              <motion.button
                onClick={handleDeleteSelected}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Delete Selected ({selectedEvents.length})
              </motion.button>
            )}
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Events Found</h3>
                <p className="text-slate-400">There are no events to delete.</p>
              </div>
            ) : (
              events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedEvents.includes(event.id)
                      ? 'bg-red-500 bg-opacity-20 border-red-500'
                      : 'bg-slate-700 bg-opacity-60 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.id)}
                      onChange={() => handleSelectEvent(event.id)}
                      className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
                      <p className="text-slate-300 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>📍 {event.location}</span>
                        <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                        <span>👥 {event.attendees?.length || 0} attendees</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
