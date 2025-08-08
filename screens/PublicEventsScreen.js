import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import SupabaseService from '../services/SupabaseService';

const { width: screenWidth } = Dimensions.get('window');

export default function PublicEventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEvents();
    animateEntrance();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('📅 Loading public events...');
      
      // Get all events that are public (not requiring login)
      const allEvents = await SupabaseService.getAllEvents();
      
      // Filter for upcoming and recent events
      const now = new Date();
      const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        // Show events from 30 days ago to 90 days in the future
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
        return eventDate >= thirtyDaysAgo && eventDate <= ninetyDaysFromNow;
      });
      
      // Sort by date (upcoming first)
      const sortedEvents = filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setEvents(sortedEvents);
      console.log(`✅ Loaded ${sortedEvents.length} public events`);
    } catch (error) {
      console.error('❌ Failed to load events:', error);
      Alert.alert('Error', 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadEvents();
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const openAttendeesModal = async (event) => {
    try {
      setSelectedEvent(event);
      setShowAttendeesModal(true);
      
      // Animate modal in
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Load attendees for this event
      console.log('👥 Loading attendees for event:', event.id);
      const eventAttendees = await SupabaseService.getEventAttendees(event.id);
      setAttendees(eventAttendees);
      console.log(`✅ Loaded ${eventAttendees.length} attendees`);
    } catch (error) {
      console.error('❌ Failed to load attendees:', error);
      Alert.alert('Error', 'Failed to load attendee list.');
    }
  };

  const closeAttendeesModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowAttendeesModal(false);
      setSelectedEvent(null);
      setAttendees([]);
    });
  };

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'TBD';
    return timeString;
  };

  const getEventStatus = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    if (eventDay < today) {
      return { status: 'completed', text: 'Completed', color: '#10b981' };
    } else if (eventDay.getTime() === today.getTime()) {
      return { status: 'today', text: 'Today', color: '#f59e0b' };
    } else {
      return { status: 'upcoming', text: 'Upcoming', color: '#4299e1' };
    }
  };

  const renderEventCard = (event, index) => {
    const eventStatus = getEventStatus(event);
    
    return (
      <Animated.View
        key={event.id}
        style={[
          styles.eventCard,
          {
            opacity: fadeAnim,
            transform: [
              { 
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 50 + (index * 20)]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f7fafc']}
          style={styles.cardGradient}
        >
          <View style={styles.eventHeader}>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
              <Text style={styles.eventTime}>{formatTime(event.time)}</Text>
              <Text style={styles.eventLocation}>{event.location || 'Location TBD'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${eventStatus.color}20` }]}>
              <Text style={[styles.statusText, { color: eventStatus.color }]}>
                {eventStatus.text}
              </Text>
            </View>
          </View>
          
          <Text style={styles.eventDescription}>
            {event.description || 'No description available.'}
          </Text>
          
            <View style={styles.eventStats}>
            <View style={styles.statItem}>
              <Ionicons name="people" size={16} color="#4299e1" />
              <Text style={styles.statText}>
                {(event.attendees && event.attendees.length) || 0} volunteers
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#4299e1" />
              <Text style={styles.statText}>
                {event.duration || 'TBD'} hours
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.viewAttendeesButton}
            onPress={() => openAttendeesModal(event)}
            activeOpacity={0.8}
          >
            <Ionicons name="people-circle" size={20} color="#4299e1" />
            <Text style={styles.viewAttendeesText}>View Volunteers</Text>
            <Ionicons name="chevron-forward" size={16} color="#4299e1" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderAttendeeItem = ({ item }) => (
    <View style={styles.attendeeItem}>
      <View style={styles.attendeeInfo}>
        <Text style={styles.attendeeName}>
          {item.name || 'Unknown Student'}
        </Text>
        <Text style={styles.attendeeNumber}>
          {item.sNumber || 'No S-Number'}
        </Text>
      </View>
      <View style={styles.attendeeStatus}>
        <Ionicons 
          name="checkmark-circle" 
          size={16} 
          color="#10b981" 
        />
        <Text style={[styles.attendeeStatusText, { 
          color: '#10b981' 
        }]}>
          Confirmed
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#4299e1" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerIconTitleContainer}>
              <Ionicons name="calendar" size={28} color="#4299e1" style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Public Events</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              See who's volunteering at Key Club events
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4299e1']}
            tintColor="#4299e1"
          />
        }
      >
        <View style={styles.contentContainer}>
          
          {/* Info Section */}
          <Animated.View
            style={[
              styles.infoSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#4299e1" />
              <Text style={styles.infoTitle}>About This View</Text>
            </View>
            <Text style={styles.infoText}>
              This page shows upcoming and recent Key Club events with volunteer lists. 
              Anyone can view this information without logging in. To join events or 
              volunteer, please log in to your Key Club account.
            </Text>
          </Animated.View>

          {/* Events Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={24} color="#4299e1" />
              <Text style={styles.sectionTitle}>
                {events.length > 0 ? 'Key Club Events' : 'No Events Available'}
              </Text>
            </View>
            
            {events.length > 0 ? (
              events.map((event, index) => renderEventCard(event, index))
            ) : (
              <Animated.View
                style={[
                  styles.emptyState,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                <Ionicons name="calendar-outline" size={64} color="#cbd5e0" />
                <Text style={styles.emptyStateTitle}>No Events Found</Text>
                <Text style={styles.emptyStateText}>
                  There are no upcoming or recent events to display at this time.
                </Text>
              </Animated.View>
            )}
          </View>

          {/* Call to Action */}
          <Animated.View
            style={[
              styles.ctaSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#4299e1', '#3182ce']}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="log-in" size={40} color="#ffffff" />
              <Text style={styles.ctaTitle}>Want to Join?</Text>
              <Text style={styles.ctaText}>
                Log in to your Key Club account to register for events, 
                track your volunteer hours, and connect with the community.
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate('AuthScreen')}
                activeOpacity={0.8}
              >
                <Ionicons name="log-in" size={20} color="#4299e1" />
                <Text style={styles.loginButtonText}>Log In</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Attendees Modal */}
      {showAttendeesModal && (
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalAnim
            }
          ]}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeAttendeesModal}
            activeOpacity={1}
          />
                        <Animated.View
                style={[
                  styles.modalContent,
                  {
                    transform: [
                      {
                        scale: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1]
                        })
                      },
                      {
                        translateY: modalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })
                      }
                    ]
                  }
                ]}
              >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEvent?.title} - Volunteers
              </Text>
              <TouchableOpacity onPress={closeAttendeesModal}>
                <Ionicons name="close" size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              {attendees.length} volunteer{attendees.length !== 1 ? 's' : ''} registered
            </Text>
            
            <ScrollView style={styles.attendeesList} showsVerticalScrollIndicator={false}>
              {attendees.length > 0 ? (
                attendees.map((attendee, index) => (
                  <View key={attendee.id || index} style={styles.attendeeItem}>
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.attendeeName}>
                        {attendee.name || 'Unknown Student'}
                      </Text>
                      <Text style={styles.attendeeNumber}>
                        {attendee.sNumber || 'No S-Number'}
                      </Text>
                    </View>
                    <View style={styles.attendeeStatus}>
                      <Ionicons 
                        name="checkmark-circle" 
                        size={16} 
                        color="#10b981" 
                      />
                      <Text style={[styles.attendeeStatusText, { 
                        color: '#10b981' 
                      }]}>
                        Confirmed
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyAttendees}>
                  <Ionicons name="people-outline" size={48} color="#cbd5e0" />
                  <Text style={styles.emptyAttendeesText}>No volunteers registered yet</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
  },
  header: {
    backgroundColor: 'rgba(66, 153, 225, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: '#4299e1',
    paddingVertical: 25,
    paddingHorizontal: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerIconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    marginRight: 8,
  },
  backButton: {
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 153, 225, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.3)',
    shadowColor: '#4299e1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    minWidth: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4299e1',
    textShadowColor: 'rgba(66, 153, 225, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 30,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.2)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4299e1',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4299e1',
    marginLeft: 12,
    textShadowColor: 'rgba(66, 153, 225, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  eventCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    padding: 20,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    color: '#4a5568',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 14,
    color: '#4a5568',
    marginLeft: 6,
  },
  viewAttendeesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(66, 153, 225, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.2)',
  },
  viewAttendeesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299e1',
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#cbd5e0',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#a0aec0',
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaSection: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  ctaGradient: {
    padding: 30,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4299e1',
    marginLeft: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    maxHeight: '80%',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    flex: 1,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#f7fafc',
  },
  attendeesList: {
    maxHeight: 400,
    padding: 20,
  },
  attendeeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 2,
  },
  attendeeNumber: {
    fontSize: 14,
    color: '#4a5568',
  },
  attendeeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeStatusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyAttendees: {
    alignItems: 'center',
    padding: 40,
  },
  emptyAttendeesText: {
    fontSize: 16,
    color: '#a0aec0',
    marginTop: 16,
    textAlign: 'center',
  },
}); 