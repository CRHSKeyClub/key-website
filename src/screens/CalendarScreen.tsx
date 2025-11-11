import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventsContext';

export default function CalendarScreen() {
  const navigate = useNavigate();
  const { events, loading } = useEvents();
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const hasEvent = (day: number | null) => {
    if (!day) return false;
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).toISOString().split('T')[0];
    
    return events.some(event => event.date.split('T')[0] === dateStr);
  };

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    ).toISOString().split('T')[0];
    
    return events.filter(event => event.date.split('T')[0] === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-blue-200 py-4 px-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/home')} 
          className="text-gray-700 hover:text-gray-900 flex items-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Calendar</h1>
        <button 
          onClick={() => navigate('/home')}
          className="text-gray-700 hover:text-gray-900"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* Calendar Container */}
      <div className="p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6 px-2">
          <button
            onClick={previousMonth}
            className="p-3 text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-3xl font-bold text-yellow-400">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={nextMonth}
            className="p-3 text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center py-2 text-yellow-400 font-semibold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            
            return (
              <div
                key={index}
                className={`
                  min-h-[100px] rounded-2xl p-3 border-2 transition-all
                  ${day ? 'bg-blue-900 bg-opacity-40 cursor-pointer hover:bg-opacity-60' : 'bg-transparent border-transparent'}
                  ${today ? 'border-yellow-400 bg-slate-700' : 'border-blue-800'}
                  ${dayEvents.length > 0 && !today ? 'border-green-500' : ''}
                `}
                onClick={() => {
                  if (day && dayEvents.length > 0) {
                    // Navigate to first event of the day
                    navigate(`/event/${dayEvents[0].id}`);
                  }
                }}
              >
                {day && (
                  <>
                    <div className="text-white font-semibold mb-1">{day}</div>
                    {dayEvents.length > 0 && (
                      <div className="space-y-1">
                        {dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded bg-blue-600 bg-opacity-50 text-white truncate"
                            style={{ borderLeft: `3px solid ${event.color || '#4299e1'}` }}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Events List Below Calendar */}
        {events.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-white mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {events
                .filter(event => {
                  const [year, month, day] = event.date.split('T')[0].split('-');
                  const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return eventDate >= today;
                })
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="bg-slate-700 bg-opacity-50 backdrop-blur-sm rounded-xl p-4 border border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1">{event.title}</h4>
                        <p className="text-sm text-gray-400">
                          {(() => {
                            const [year, month, day] = event.date.split('T')[0].split('-');
                            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          })()} • {event.location}
                        </p>
                      </div>
                      <div className="text-blue-400 text-sm font-semibold">
                        {event.attendees?.length || 0} / {event.capacity}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
