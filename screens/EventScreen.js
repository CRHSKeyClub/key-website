import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useModal } from '../contexts/ModalContext';
import SupabaseService from '../services/SupabaseService';

export default function EventScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { getEventById, signupForEvent, deleteEvent, refreshEvents } = useEvents();
  const { isAdmin, user, isAuthenticated } = useAuth();
  const { showModal } = useModal();
  const [event, setEvent] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sNumber, setSNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [currentRegistration, setCurrentRegistration] = useState(null);

  useEffect(() => {
    const eventData = getEventById(eventId);
    if (eventData) {
      setEvent(eventData);
    } else {
      showModal({
        title: 'Error',
        message: 'Event not found',
        onCancel: () => navigation.goBack(),
        onConfirm: () => navigation.goBack(),
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
    }
  }, [eventId, getEventById, navigation, showModal]);

  // Populate form with user data when logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.name || '');
      setEmail(user.email || ''); // If user has email stored
      setSNumber(user.sNumber || '');
      
      // Check if they're already registered
      if (event && event.attendees) {
        checkRegistrationStatus(user.email);
      }
    }
  }, [isAuthenticated, user, event]);

  // Check if user is already registered for this event
  const checkRegistrationStatus = (userEmail) => {
    if (!event || !event.attendees) return;
    
    let existingRegistration = null;
    
    // If user is authenticated, check by student's S-number first
    if (isAuthenticated && user && user.sNumber) {
      existingRegistration = event.attendees.find(attendee => 
        attendee.sNumber && attendee.sNumber.toLowerCase() === user.sNumber.toLowerCase()
      );
    }
    
    // If not found by sNumber, check by email
    if (!existingRegistration && userEmail) {
      existingRegistration = event.attendees.find(attendee => 
        attendee.email && attendee.email.toLowerCase() === userEmail.toLowerCase()
      );
    }
    
    if (existingRegistration) {
      setIsAlreadyRegistered(true);
      setCurrentRegistration(existingRegistration);
      setName(existingRegistration.name);
      setEmail(existingRegistration.email);
    } else {
      setIsAlreadyRegistered(false);
      setCurrentRegistration(null);
    }
  };

  // Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input change with validation
  const handleEmailChange = (text) => {
    setEmail(text);
    
    // Only check registration status if email is valid
    if (text.trim() && isValidEmail(text.trim())) {
      checkRegistrationStatus(text.trim());
    } else {
      setIsAlreadyRegistered(false);
      setCurrentRegistration(null);
    }
  };

  // Handle unregistration
  const handleUnregister = async () => {
    if (!currentRegistration) return;
    
    showModal({
      title: 'Unregister from Event',
      message: `Are you sure you want to unregister from "${event.title}"?`,
      onCancel: () => {},
      onConfirm: confirmUnregister,
      cancelText: 'Cancel',
      confirmText: 'Unregister',
      destructive: true,
      icon: 'person-remove-outline'
    });
  };

  const confirmUnregister = async () => {
    try {
      setLoading(true);
      
      // Call the unregister function with sNumber if available
      await SupabaseService.unregisterFromEvent(
        eventId, 
        currentRegistration.email, 
        currentRegistration.sNumber || (isAuthenticated && user ? user.sNumber : null)
      );
      
      // Refresh events to update the UI
      await refreshEvents();
      
      // Reset the form
      setIsAlreadyRegistered(false);
      setCurrentRegistration(null);
      setName('');
      setEmail('');
      
      showModal({
        title: 'Success',
        message: 'You have been unregistered from this event.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
      
    } catch (error) {
      console.error('Unregister error:', error);
      showModal({
        title: 'Error',
        message: 'Failed to unregister from event. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle email update for existing registration
  const handleUpdateEmail = async () => {
    if (!email.trim()) {
      showModal({
        title: 'Error',
        message: 'Please enter an email address',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
      return;
    }

    if (!isValidEmail(email.trim())) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid email address',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
      return;
    }

    try {
      setLoading(true);
      
      // First unregister with old email and sNumber if available
      await SupabaseService.unregisterFromEvent(
        eventId, 
        currentRegistration.email, 
        currentRegistration.sNumber || (isAuthenticated && user ? user.sNumber : null)
      );
      
      // Then register with new email
      await signupForEvent(eventId, {
        name: currentRegistration.name,
        email: email.trim(),
        sNumber: currentRegistration.sNumber
      });
      
      // Refresh events to update the UI
      await refreshEvents();
      
      // Update current registration
      setCurrentRegistration({
        ...currentRegistration,
        email: email.trim()
      });
      
      showModal({
        title: 'Success',
        message: 'Your email has been updated successfully!',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
      
    } catch (error) {
      console.error('Email update error:', error);
      showModal({
        title: 'Error',
        message: 'Failed to update email. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced delete handler using EventsContext
  const handleDeleteEvent = () => {
    console.log('Delete button clicked');
    showModal({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
      onCancel: () => {},
      onConfirm: confirmDelete,
      cancelText: 'Cancel',
      confirmText: 'Delete',
      destructive: true,
      icon: 'trash-outline'
    });
  };

  const confirmDelete = async () => {
    console.log('Delete confirmed');
    setDeleting(true);
    
    try {
      // Use EventsContext deleteEvent method which handles Google Sheets
      await deleteEvent(eventId);
      
      // Refresh events to ensure sync
      await refreshEvents();
      
      console.log('Delete succeeded, navigating back');
      
      // Show success message briefly then navigate
      showModal({
        title: 'Success',
        message: 'Event deleted successfully',
        onCancel: () => {
          navigation.goBack();
        },
        onConfirm: () => {
          navigation.goBack();
        },
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
      
      // Navigate back after showing success
      setTimeout(() => {
        try {
          navigation.navigate('CalendarMain');
        } catch (e1) {
          try {
            navigation.navigate('Calendar');
          } catch (e2) {
            try {
              navigation.goBack();
            } catch (e3) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
            }
          }
        }
      }, 1500);
      
    } catch (error) {
      console.error('Delete failed:', error);
      setDeleting(false);
      showModal({
        title: 'Error',
        message: 'Failed to delete event. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
    }
  };

  const handleSignup = async () => {
    // For logged-in users, use their account info
    const finalName = isAuthenticated && user ? user.name : name.trim();
    const finalEmail = isAuthenticated && user ? (user.email || email.trim()) : email.trim();
    const finalSNumber = isAuthenticated && user ? user.sNumber : sNumber.trim();

    if (!finalName || !finalEmail) {
      showModal({
        title: 'Error',
        message: 'Please fill in all required fields',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
      return;
    }

    if (!isValidEmail(finalEmail)) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid email address',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
      return;
    }

    // Check if capacity reached
    if (event.attendees && event.attendees.length >= event.capacity) {
      showModal({
        title: 'Error',
        message: 'This event has reached its capacity',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
      return;
    }

    // Check if already registered and update registration status
    let existingRegistration = null;
    
    // Check by sNumber first if available
    if (finalSNumber) {
      existingRegistration = event.attendees.find(attendee => 
        attendee.sNumber && attendee.sNumber.toLowerCase() === finalSNumber.toLowerCase()
      );
    }
    
    // If not found by sNumber, check by email
    if (!existingRegistration && finalEmail) {
      existingRegistration = event.attendees.find(attendee => 
        attendee.email && attendee.email.toLowerCase() === finalEmail.toLowerCase()
      );
    }
    
    if (existingRegistration) {
      // User is already registered, update the registration status
      setIsAlreadyRegistered(true);
      setCurrentRegistration(existingRegistration);
      setName(existingRegistration.name);
      setEmail(existingRegistration.email);
      return;
    }

    // Submit signup using EventsContext
    try {
      setLoading(true);
      await signupForEvent(eventId, { 
        name: finalName, 
        email: finalEmail,
        sNumber: finalSNumber 
      });
      
      // Refresh the event data to show updated attendee list
      await refreshEvents();
      
      showModal({
        title: 'Success',
        message: 'You have successfully signed up for this event!',
        onCancel: () => {
          navigation.goBack();
        },
        onConfirm: () => {
          navigation.goBack();
        },
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
      
      // Navigate back after success
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
      
    } catch (err) {
      console.error('Signup error:', err);
      showModal({
        title: 'Error',
        message: 'Failed to sign up for event. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderAttendee = ({ item }) => (
    <View style={styles.attendeeItem}>
      <Text style={styles.attendeeName}>{item.name}</Text>
      <Text style={styles.attendeeEmail}>{item.email}</Text>
      {item.sNumber && (
        <Text style={styles.attendeeSNumber}>S-Number: {item.sNumber}</Text>
      )}
    </View>
  );

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading event...</Text>
      </View>
    );
  }

  if (deleting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59a2f0" />
        <Text style={styles.loadingText}>Deleting event...</Text>
      </View>
    );
  }

  const eventDate = new Date(event.date);
  const startTime = new Date(`${event.date}T${event.startTime}`);
  const endTime = new Date(`${event.date}T${event.endTime}`);
  const isFullyBooked = event.attendees && event.attendees.length >= event.capacity;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView>
          <View style={styles.eventDetails}>
            {isAdmin && (
              <View style={styles.adminControls}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EventCreation', { 
                    eventId: event.id, 
                    isEditing: true 
                  })}
                >
                  <Ionicons name="create-outline" size={22} color="white" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={handleDeleteEvent}
                  disabled={deleting}
                >
                  <Ionicons name="trash-outline" size={22} color="white" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.eventTitle}>{event.title}</Text>
            
            <View style={styles.metadataContainer}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Date:</Text>
                <Text style={styles.metadataValue}>
                  {eventDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Time:</Text>
                <Text style={styles.metadataValue}>
                  {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Location:</Text>
                <Text style={styles.metadataValue}>{event.location}</Text>
              </View>
              
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Availability:</Text>
                <Text style={styles.metadataValue}>
                  {event.attendees ? event.attendees.length : 0} / {event.capacity} spots filled
                </Text>
              </View>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>

            {/* Attendees section for admins */}
            {isAdmin && (
              <View style={styles.attendeesContainer}>
                <View style={styles.attendeesHeaderRow}>
                  <Text style={styles.attendeesTitle}>
                    Attendees ({event.attendees ? event.attendees.length : 0})
                  </Text>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('AttendeeList', { eventId: event.id })}
                  >
                    <Text style={styles.viewAllButtonText}>View All</Text>
                    <Ionicons name="chevron-forward" size={16} color="#59a2f0" />
                  </TouchableOpacity>
                </View>
                
                {event.attendees && event.attendees.length > 0 ? (
                  <>
                    {/* Show max 3 attendees in this screen */}
                    <FlatList
                      data={event.attendees.slice(0, 3)}
                      renderItem={renderAttendee}
                      keyExtractor={(item, index) => index.toString()}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                    
                    {event.attendees.length > 3 && (
                      <Text style={styles.moreAttendeesText}>
                        +{event.attendees.length - 3} more attendees
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.noAttendeesText}>No one has signed up yet</Text>
                )}
              </View>
            )}
          </View>

          {!isAdmin && (
            isFullyBooked ? (
              <View style={styles.fullyBookedContainer}>
                <Text style={styles.fullyBookedText}>This event is fully booked</Text>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.buttonText}>Back to Calendar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.signupContainer}>
                <Text style={styles.signupTitle}>
                  {isAlreadyRegistered ? 'Event Registration Management' : 'Sign Up for This Event'}
                </Text>
                
                {isAuthenticated && user && (
                  <View style={styles.loggedInInfo}>
                    <Ionicons name="person-circle" size={20} color="#4CAF50" />
                    <Text style={styles.loggedInText}>
                      Logged in as: {user.name} ({user.sNumber})
                      {user.email && ` • ${user.email}`}
                    </Text>
                  </View>
                )}
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={[styles.input, isAuthenticated && styles.disabledInput]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    editable={!isAuthenticated}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      email.trim() && !isValidEmail(email.trim()) && styles.invalidInput
                    ]}
                    value={email}
                    onChangeText={handleEmailChange}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {email.trim() && !isValidEmail(email.trim()) && (
                    <Text style={styles.validationError}>Please enter a valid email address</Text>
                  )}
                </View>
                
                <View style={styles.buttonContainer}>
                  {isAlreadyRegistered ? (
                    // Show registration status and management options
                    <View style={styles.registeredContainer}>
                      <View style={styles.registeredStatus}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={styles.registeredText}>You're already registered!</Text>
                      </View>
                      <Text style={styles.registeredDetails}>
                        Registered as: {currentRegistration?.name}
                        {currentRegistration?.email && ` (${currentRegistration.email})`}
                      </Text>
                      
                      {/* Email Update Section */}
                      <View style={styles.emailUpdateSection}>
                        <Text style={styles.emailUpdateLabel}>Update Email Address:</Text>
                        <TextInput
                          style={[
                            styles.emailUpdateInput,
                            email.trim() && !isValidEmail(email.trim()) && styles.invalidInput
                          ]}
                          value={email}
                          onChangeText={handleEmailChange}
                          placeholder="Enter new email address"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        {email.trim() && !isValidEmail(email.trim()) && (
                          <Text style={styles.validationError}>Please enter a valid email address</Text>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.updateEmailButton, 
                            (loading || !isValidEmail(email.trim())) && styles.disabledButton
                          ]}
                          onPress={handleUpdateEmail}
                          disabled={loading || !isValidEmail(email.trim())}
                        >
                          <Text style={styles.updateEmailButtonText}>
                            {loading ? 'Updating...' : 'Update Email'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Unregister Button */}
                      <TouchableOpacity
                        style={[styles.unregisterButton, loading && styles.disabledButton]}
                        onPress={handleUnregister}
                        disabled={loading}
                      >
                        <Text style={styles.unregisterButtonText}>
                          {loading ? 'Unregistering...' : 'Unregister from Event'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    // Show normal signup form
                    <>
                      <TouchableOpacity
                        style={[
                          styles.signupButton, 
                          (loading || !isValidEmail(email.trim()) || !name.trim()) && styles.disabledButton
                        ]}
                        onPress={handleSignup}
                        disabled={loading || !isValidEmail(email.trim()) || !name.trim()}
                      >
                        <Text style={styles.buttonText}>
                          {loading ? 'Signing up...' : 'Sign Up'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#94cfec',
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#94cfec',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  eventDetails: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  adminControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#59a2f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 10,
  },
  editButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    marginLeft: 5,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  metadataContainer: {
    marginBottom: 15,
  },
  metadataItem: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: 100,
    color: '#333',
  },
  metadataValue: {
    flex: 1,
    color: '#333',
  },
  descriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  descriptionText: {
    color: '#333',
    lineHeight: 20,
  },
  attendeesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
    marginTop: 15,
  },
  attendeesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  attendeesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButtonText: {
    color: '#59a2f0',
    fontWeight: 'bold',
    marginRight: 3,
  },
  attendeeItem: {
    paddingVertical: 8,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  attendeeEmail: {
    fontSize: 14,
    color: '#666',
  },
  attendeeSNumber: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  moreAttendeesText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
  noAttendeesText: {
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 10,
  },
  fullyBookedContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    margin: 10,
    alignItems: 'center',
  },
  fullyBookedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 20,
  },
  signupContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    margin: 10,
  },
  signupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  signupButton: {
    backgroundColor: '#59a2f0',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  backButton: {
    backgroundColor: '#59a2f0',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  registeredContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  registeredStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  registeredText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  registeredDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  unregisterButton: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 10,
  },
  unregisterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loggedInInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  loggedInText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  emailUpdateSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emailUpdateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  emailUpdateInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  updateEmailButton: {
    backgroundColor: '#17a2b8',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  updateEmailButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  invalidInput: {
    borderColor: '#ff6b6b',
    borderWidth: 2,
  },
  validationError: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});