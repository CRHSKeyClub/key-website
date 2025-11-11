import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

export default function EventCreationScreen() {
  const navigate = useNavigate();
  const { addEvent, getEventById, updateEvent } = useEvents();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  
  // Check if we're editing an existing event (from route params)
  const [isEditing, setIsEditing] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [color, setColor] = useState('#4287f5');
  const [attendees, setAttendees] = useState<string[]>([]);
  
  // For date and time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we're editing an existing event
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
      setIsEditing(true);
      setEventId(editId);
      loadEventData(editId);
    }
  }, []);

  const loadEventData = async (id: string) => {
    try {
      const existingEvent = getEventById(id);
      if (existingEvent) {
        setTitle(existingEvent.title);
        setDescription(existingEvent.description);
        setLocation(existingEvent.location);
        setCapacity(existingEvent.capacity.toString());
        
        // Parse date in local time to avoid timezone issues
        const [year, month, day] = existingEvent.date.split('T')[0].split('-');
        const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        setDate(eventDate);
        
        if (existingEvent.startTime) {
          const startTimeArr = existingEvent.startTime.split(':');
          const startDateTime = new Date();
          startDateTime.setHours(parseInt(startTimeArr[0]), parseInt(startTimeArr[1]));
          setStartTime(startDateTime);
        }
        
        if (existingEvent.endTime) {
          const endTimeArr = existingEvent.endTime.split(':');
          const endDateTime = new Date();
          endDateTime.setHours(parseInt(endTimeArr[0]), parseInt(endTimeArr[1]));
          setEndTime(endDateTime);
        }
        
        setColor(existingEvent.color || '#4287f5');
        setAttendees(existingEvent.attendees || []);
      }
    } catch (error) {
      console.error('Error loading event:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCreateEvent = async () => {
    // Validate input
    if (!title.trim() || !description.trim() || !location.trim()) {
      showModal({
        title: 'Error',
        message: 'Please fill in all required fields',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && eventId) {
        // Update existing event
        const updatedEvent = {
          id: eventId,
          title,
          description,
          location,
          capacity: parseInt(capacity) || 20,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          startTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}:00`,
          endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`,
          color,
          attendees: attendees,
          lastUpdated: new Date().toISOString()
        };
        
        await updateEvent(updatedEvent);
        
        showModal({
          title: 'Success',
          message: 'Event updated successfully!',
          onCancel: () => {},
          onConfirm: () => navigate('/calendar'),
          cancelText: '',
          confirmText: 'OK',
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
      } else {
        // Create new event
        const newEvent = {
          id: Date.now().toString(),
          title,
          description,
          location,
          capacity: parseInt(capacity) || 20,
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
          startTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}:00`,
          endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`,
          color,
          attendees: [],
          createdBy: 'Admin',
          createdAt: new Date().toISOString()
        };

        await addEvent(newEvent);
        
        showModal({
          title: 'Success',
          message: 'Event created successfully!',
          onCancel: () => {},
          onConfirm: () => navigate('/calendar'),
          cancelText: '',
          confirmText: 'OK',
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });
      }
    } catch (err) {
      console.error('Event creation/update error:', err);
      
      showModal({
        title: 'Error',
        message: isEditing ? 'Failed to update event. Please try again.' : 'Failed to create event. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleColorSelection = (selectedColor: string) => {
    setColor(selectedColor);
  };

  // Color options
  const colorOptions = [
    { color: '#4287f5', name: 'Ocean Blue' },
    { color: '#f54242', name: 'Coral Red' },
    { color: '#42f56f', name: 'Mint Green' },
    { color: '#f5a742', name: 'Sunset Orange' },
    { color: '#a442f5', name: 'Royal Purple' },
    { color: '#f542a4', name: 'Pink Flamingo' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
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
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-slate-800">
            {isEditing ? 'Edit Event' : 'Create Event'}
          </h1>
        </div>
      </motion.div>

      {/* Form Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-8">
          {/* Title Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
              </svg>
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the name of your awesome event?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
            />
          </div>
          
          {/* Description Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
              </svg>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell people what makes this event special..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white resize-none"
            />
          </div>
          
          {/* Location Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where is this event taking place?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
            />
          </div>
          
          {/* Capacity Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
              </svg>
              Capacity
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="How many people can join?"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
            />
          </div>
          
          {/* Date Field */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              Date
            </label>
            <input
              type="date"
              value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
              onChange={(e) => {
                // Parse date string locally to avoid timezone issues
                const [year, month, day] = e.target.value.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                setDate(localDate);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
            />
          </div>
          
          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
                Start Time
              </label>
              <input
                type="time"
                value={`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newTime = new Date(startTime);
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setStartTime(newTime);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
                End Time
              </label>
              <input
                type="time"
                value={`${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newTime = new Date(endTime);
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setEndTime(newTime);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
              />
            </div>
          </div>
          
          {/* Color Selector */}
          <div className="mb-8">
            <label className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-3">
              <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd"/>
              </svg>
              Event Color
            </label>
            <div className="grid grid-cols-6 gap-3">
              {colorOptions.map((colorOption) => (
                <div key={colorOption.color} className="flex flex-col items-center">
                  <button
                    onClick={() => handleColorSelection(colorOption.color)}
                    className={`w-12 h-12 rounded-xl shadow-lg transition-all transform hover:scale-110 ${
                      color === colorOption.color ? 'ring-4 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                  >
                    {color === colorOption.color && (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  <span className="text-xs text-gray-600 mt-1 text-center">
                    {colorOptions.find(c => c.color === color)?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Submit Button */}
          <motion.button
            onClick={handleCreateEvent}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 px-6 rounded-xl font-bold text-white text-lg shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {isEditing ? 'Update Event' : 'Create Event'}
                <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                </svg>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}