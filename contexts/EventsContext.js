// contexts/EventsContext.js - FIXED to properly handle attendees
import React, { useContext, useState, useEffect, createContext, useCallback } from 'react';
import SupabaseService from '../services/SupabaseService';

const EventsContext = createContext();

export function useEvents() {
  return useContext(EventsContext);
}

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadEvents = useCallback(async () => {
    try {
      console.log('🔄 Loading events from Supabase...');
      setLoading(true);
      
      // Use the FIXED getAllEvents method that loads attendees
      const eventsData = await SupabaseService.getAllEvents();
      
      console.log(`✅ Loaded ${eventsData.length} events with attendees`);
      
      // Log attendee counts for debugging
      eventsData.forEach(event => {
        console.log(`Event "${event.title}": ${event.attendees?.length || 0} attendees`);
        if (event.attendees && event.attendees.length > 0) {
          console.log('  Attendees:', event.attendees.map(a => a.name).join(', '));
        }
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error('❌ Failed to load events:', error);
      setEvents([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (newEvent) => {
    try {
      console.log('➕ Adding new event:', newEvent.title);
      await SupabaseService.createEvent(newEvent);
      
      // Reload all events to get the new event with proper structure
      await loadEvents();
      
      console.log('✅ Event added successfully');
    } catch (error) {
      console.error('❌ Failed to add event:', error);
      throw error;
    }
  }, [loadEvents]);

  const updateEvent = useCallback(async (updatedEvent) => {
    try {
      console.log('📝 Updating event:', updatedEvent.id);
      await SupabaseService.updateEvent(updatedEvent.id, updatedEvent);
      
      // Reload all events to get updated data with attendees
      await loadEvents();
      
      console.log('✅ Event updated successfully');
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }, [loadEvents]);

  const deleteEvent = useCallback(async (eventId) => {
    try {
      console.log('🗑️ Deleting event:', eventId);
      await SupabaseService.deleteEvent(eventId);
      
      // Reload events after deletion
      await loadEvents();
      
      console.log('✅ Event deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }, [loadEvents]);

  const signupForEvent = useCallback(async (eventId, attendee) => {
    try {
      console.log('✍️ Signing up for event:', eventId, attendee);
      
      // Check if event exists and has capacity
      const event = events.find(e => e.id === eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      
      if (event.attendees && event.attendees.length >= event.capacity) {
        throw new Error('Event is at full capacity');
      }
      
      // Check if already registered (by student_id UUID first, then email)
      if (
        (event.attendees && attendee.authId && event.attendees.some(a => a.studentId === attendee.authId)) ||
        (event.attendees && attendee.email && event.attendees.some(a => a.email === attendee.email))
      ) {
        throw new Error('You are already registered for this event');
      }
      
      // Submit signup to database
      await SupabaseService.signupForEvent(eventId, attendee);
      
      // IMPORTANT: Reload events to get updated attendee list
      // This ensures the UI shows the new attendee immediately
      console.log('🔄 Reloading events to show new attendee...');
      await loadEvents();
      
      console.log('✅ Successfully signed up for event and reloaded data');
    } catch (error) {
      console.error('❌ Failed to signup for event:', error);
      throw error;
    }
  }, [loadEvents, events]);

  const getEventById = useCallback((id) => {
    const event = events.find(event => event.id === id);
    if (event) {
      console.log(`📋 Found event "${event.title}" with ${event.attendees?.length || 0} attendees`);
      if (event.attendees && event.attendees.length > 0) {
        console.log('  Current attendees:', event.attendees.map(a => a.name).join(', '));
      }
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
      .sort((a, b) => new Date(a.date) - new Date(b.date));
      
    console.log(`📅 Found ${upcoming.length} upcoming events`);
    return upcoming;
  }, [events]);

  const getPastEvents = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const past = events
      .filter(event => new Date(event.date) < today)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
      
    console.log(`📅 Found ${past.length} past events`);
    return past;
  }, [events]);

  // Force refresh function for manual refreshes
  const refreshEvents = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    await loadEvents();
  }, [loadEvents]);

  // Load events on mount
  useEffect(() => {
    console.log('🚀 EventsProvider initializing...');
    loadEvents();
  }, [loadEvents]);

  // Debug log when events change
  useEffect(() => {
    console.log('📊 Events state updated:', {
      totalEvents: events.length,
      eventsWithAttendees: events.filter(e => e.attendees && e.attendees.length > 0).length,
      totalAttendees: events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0)
    });
    
    // Log each event's attendee count for debugging
    events.forEach(event => {
      if (event.attendees && event.attendees.length > 0) {
        console.log(`  "${event.title}": ${event.attendees.length} attendees`);
      }
    });
  }, [events]);

  const contextValue = {
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