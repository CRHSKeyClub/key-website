import { useContext, useState, useEffect, createContext, useCallback, ReactNode } from 'react';
import SupabaseService from '../services/SupabaseService';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  color: string;
  attendees?: Attendee[];
  createdBy: string;
  createdAt: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  sNumber?: string | null;
  studentId?: string;
  registeredAt: string;
}

interface EventsContextType {
  events: Event[];
  loading: boolean;
  addEvent: (newEvent: any) => Promise<void>;
  updateEvent: (updatedEvent: any) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  signupForEvent: (eventId: string, attendee: any) => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  getUpcomingEvents: () => Event[];
  getPastEvents: () => Event[];
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}

interface EventsProviderProps {
  children: ReactNode;
}

export function EventsProvider({ children }: EventsProviderProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadEvents = useCallback(async () => {
    try {
      console.log('🔄 Loading events from Supabase...');
      setLoading(true);
      
      const eventsData = await SupabaseService.getAllEvents();
      
      console.log(`✅ Loaded ${eventsData.length} events with attendees`);
      
      eventsData.forEach(event => {
        console.log(`Event "${event.title}": ${event.attendees?.length || 0} attendees`);
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error('❌ Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (newEvent: any) => {
    try {
      console.log('➕ Adding new event:', newEvent.title);
      await SupabaseService.createEvent(newEvent);
      
      await loadEvents();
      
      console.log('✅ Event added successfully');
    } catch (error) {
      console.error('❌ Failed to add event:', error);
      throw error;
    }
  }, [loadEvents]);

  const updateEvent = useCallback(async (updatedEvent: any) => {
    try {
      console.log('📝 Updating event:', updatedEvent.id);
      await SupabaseService.updateEvent(updatedEvent.id, updatedEvent);
      
      await loadEvents();
      
      console.log('✅ Event updated successfully');
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }, [loadEvents]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      console.log('🗑️ Deleting event:', eventId);
      await SupabaseService.deleteEvent(eventId);
      
      await loadEvents();
      
      console.log('✅ Event deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }, [loadEvents]);

  const signupForEvent = useCallback(async (eventId: string, attendee: any) => {
    try {
      console.log('✍️ Signing up for event:', eventId, attendee);
      
      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      if (event.attendees && event.attendees.length >= event.capacity) {
        throw new Error('Event is at full capacity');
      }
      
      if (
        (event.attendees && attendee.authId && event.attendees.some(a => a.studentId === attendee.authId)) ||
        (event.attendees && attendee.email && event.attendees.some(a => a.email === attendee.email))
      ) {
        throw new Error('You are already registered for this event');
      }
      
      await SupabaseService.signupForEvent(eventId, attendee);
      
      console.log('🔄 Reloading events to show new attendee...');
      await loadEvents();
      
      console.log('✅ Successfully signed up for event and reloaded data');
    } catch (error) {
      console.error('❌ Failed to signup for event:', error);
      throw error;
    }
  }, [loadEvents, events]);

  const getEventById = useCallback((id: string) => {
    const event = events.find(event => event.id === id);
    if (event) {
      console.log(`📋 Found event "${event.title}" with ${event.attendees?.length || 0} attendees`);
    } else {
      console.warn(`⚠️ Event with ID ${id} not found`);
    }
    return event;
  }, [events]);

  const getUpcomingEvents = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = events
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    console.log(`📅 Found ${upcoming.length} upcoming events`);
    return upcoming;
  }, [events]);

  const getPastEvents = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const past = events
      .filter(event => new Date(event.date) < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    console.log(`📅 Found ${past.length} past events`);
    return past;
  }, [events]);

  const refreshEvents = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    await loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    console.log('🚀 EventsProvider initializing...');
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    console.log('📊 Events state updated:', {
      totalEvents: events.length,
      eventsWithAttendees: events.filter(e => e.attendees && e.attendees.length > 0).length,
      totalAttendees: events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0)
    });
  }, [events]);

  const contextValue: EventsContextType = {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    signupForEvent,
    getEventById,
    getUpcomingEvents,
    getPastEvents,
    refreshEvents
  };

  return (
    <EventsContext.Provider value={contextValue}>
      {children}
    </EventsContext.Provider>
  );
}

