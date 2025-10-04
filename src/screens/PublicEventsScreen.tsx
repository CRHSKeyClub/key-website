import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../contexts/EventsContext';

export default function PublicEventsScreen() {
  const { events, loading, refreshEvents } = useEvents();
  const navigate = useNavigate();

  useEffect(() => {
    refreshEvents();
  }, []);

  const upcomingEvents = events.filter(event => new Date(event.date) >= new Date());
  const recentEvents = events.filter(event => new Date(event.date) < new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => navigate('/')} 
            className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <h1 className="text-3xl font-bold text-blue-400">Public Events</h1>
          </div>
          <p className="text-gray-300">See who's volunteering at Key Club events</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Info Box */}
        <div className="bg-slate-700 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-600">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-blue-400 font-semibold mb-1">About This View</h3>
              <p className="text-gray-300 text-sm">
                This page shows upcoming and recent Key Club events with volunteer lists. Anyone can view this information without logging in. To join events or volunteer, please log in to your Key Club account.
              </p>
            </div>
          </div>
        </div>

        {/* Events Section */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        ) : upcomingEvents.length === 0 && recentEvents.length === 0 ? (
          /* No Events Found */
          <div className="bg-slate-700 bg-opacity-50 backdrop-blur-sm rounded-xl p-12 text-center border border-slate-600">
            <div className="mb-4">
              <div className="flex items-center gap-3 text-blue-400 mb-4 justify-center">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <h2 className="text-2xl font-bold">No Events Available</h2>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Events Found</h3>
            <p className="text-gray-400">There are no upcoming or recent events to display at this time.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Upcoming Events</h2>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="bg-slate-700 bg-opacity-50 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                          <p className="text-gray-300 mb-4">{event.description}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                              </svg>
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              <span>{event.attendees?.length || 0} / {event.capacity} volunteers</span>
                            </div>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          (event.attendees?.length || 0) >= event.capacity 
                            ? 'bg-red-500 bg-opacity-20 text-red-400'
                            : 'bg-green-500 bg-opacity-20 text-green-400'
                        }`}>
                          {(event.attendees?.length || 0) >= event.capacity ? 'Full' : 'Open'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Events */}
            {recentEvents.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Recent Events</h2>
                <div className="space-y-4">
                  {recentEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="bg-slate-700 bg-opacity-30 backdrop-blur-sm rounded-xl p-6 border border-slate-600">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-300 mb-2">{event.title}</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              <span>{event.attendees?.length || 0} volunteers attended</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-500 bg-opacity-20 text-gray-400">
                          Completed
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 text-white mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
          <h3 className="text-2xl font-bold text-white mb-2">Want to Join?</h3>
          <p className="text-blue-100 mb-6">
            Log in to your Key Club account to register for events, track your volunteer hours, and connect with the community.
          </p>
          <button
            onClick={() => navigate('/student-login')}
            className="bg-white hover:bg-gray-100 text-blue-700 font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Log In</span>
          </button>
        </div>
      </div>
    </div>
  );
}
