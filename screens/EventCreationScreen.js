import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Easing,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import ModernDatePicker from '../components/ModernDatePicker';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth } = Dimensions.get('window');

export default function EventCreationScreen({ route, navigation }) {
  const { addEvent, getEventById, updateEvent } = useEvents();
  const { isAdmin } = useAuth();
  const { showModal } = useModal();
  
  // Check if we're editing an existing event
  const { eventId, isEditing } = route.params || {};
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [color, setColor] = useState('#4287f5');
  const [attendees, setAttendees] = useState([]);
  
  // For date and time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-30)).current;
  const headerSlideAnim = useRef(new Animated.Value(-100)).current;
  const formItemAnimations = useRef([]).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const submitAnimationAnim = useRef(new Animated.Value(0)).current;
  const loadingSpinAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const colorSelectorAnim = useRef(new Animated.Value(1)).current;

  // Initialize form animations
  useEffect(() => {
    // Initialize form item animations
    for (let i = 0; i < 10; i++) {
      formItemAnimations[i] = new Animated.Value(0);
    }

    // Start entrance animation
    const animateEntrance = () => {
      Animated.sequence([
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.stagger(100, formItemAnimations.map((anim, index) =>
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
              delay: index * 50,
              easing: Easing.out(Easing.back(1.1)),
              useNativeDriver: false,
            })
          )),
        ]),
      ]).start();
    };

    animateEntrance();
  }, []);

  // Loading spinner animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(loadingSpinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    } else {
      loadingSpinAnim.setValue(0);
    }
  }, [loading]);

  // Load event data if editing with animation
  useEffect(() => {
    if (isEditing && eventId) {
      const existingEvent = getEventById(eventId);
      if (existingEvent) {
        // Animate form filling
        LayoutAnimation.configureNext({
          duration: 400,
          create: {
            type: LayoutAnimation.Types.spring,
            property: LayoutAnimation.Properties.opacity,
            springDamping: 0.8,
          },
          update: {
            type: LayoutAnimation.Types.spring,
            springDamping: 0.8,
          },
        });

        setTitle(existingEvent.title);
        setDescription(existingEvent.description);
        setLocation(existingEvent.location);
        setCapacity(existingEvent.capacity.toString());
        
        const eventDate = new Date(existingEvent.date);
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
    }
  }, [isEditing, eventId, getEventById]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Enhanced submit with dramatic animation
  const handleCreateEvent = async () => {
    // Validate input with shake animation
    if (!title.trim() || !description.trim() || !location.trim()) {
      // Shake animation for error
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.05,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1.05,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();

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

    // Start submit animation
    setLoading(true);
    
    Animated.parallel([
      Animated.timing(submitAnimationAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

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
        
        // Success animation then return to calendar
        await animateSuccess();
        navigation.navigate('CalendarMain');
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
        
        // Success animation then return to calendar
        await animateSuccess();
        navigation.navigate('CalendarMain');
      }
    } catch (err) {
      console.error('Event creation/update error:', err);
      
      // Error animation
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: false,
        }),
      ]).start();
      
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
      Animated.parallel([
        Animated.timing(submitAnimationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  // Success animation sequence
  const animateSuccess = () => {
    return new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: false,
        }),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 200,
          delay: 300,
          useNativeDriver: false,
        }),
      ]).start(() => resolve());
    });
  };

  // Color selection animation
  const handleColorSelection = (selectedColor) => {
    Animated.sequence([
      Animated.timing(colorSelectorAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(colorSelectorAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }),
    ]).start();
    
    setColor(selectedColor);
  };

  // Enhanced picker modals with animations
  const openPickerModal = (pickerType) => {
    const setState = {
      date: setShowDatePicker,
      startTime: setShowStartTimePicker,
      endTime: setShowEndTimePicker,
    }[pickerType];
    
    setState(true);
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
  
  // Modern date picker component
  const renderDatePicker = () => {
    return (
      <ModernDatePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        selectedDate={date}
        onDateSelect={(selectedDate) => setDate(selectedDate)}
        title="Select Event Date"
      />
    );
  };
  
  // Enhanced time picker components
  const renderTimePicker = (type, time, setTime, visible, setVisible) => {
    if (!visible) return null;
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    
    return (
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setVisible(false)}
        data-testid="modal"
      >
          <Animated.View style={styles.pickerContainer}>
            {/* Enhanced Header */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity 
                onPress={() => setVisible(false)}
                style={styles.pickerHeaderButton}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.pickerTitleContainer}>
                <Text style={styles.pickerTitle}>
                  {type === 'start' ? 'Start Time' : 'End Time'}
                </Text>
                <Text style={styles.pickerSubtitle}>
                  {type === 'start' ? '⏰ When does it begin?' : '⏰ When does it end?'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setVisible(false)}
                style={[styles.pickerHeaderButton, styles.pickerDoneButton]}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            {/* Time Display */}
            <View style={styles.selectedTimeDisplay}>
              <Text style={styles.selectedTimeText}>
                {formatTime(time)}
              </Text>
            </View>
            
            {/* Enhanced Time Picker Row */}
            <View style={styles.timePickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    style={styles.picker}
                    selectedValue={time.getHours()}
                    onValueChange={(itemValue) => {
                      const newTime = new Date(time);
                      newTime.setHours(itemValue);
                      setTime(newTime);
                    }}
                  >
                    {hours.map(hour => (
                      <Picker.Item 
                        key={hour} 
                        label={hour < 10 ? `0${hour}` : `${hour}`}
                        value={hour}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.timeSeparatorContainer}>
                <Text style={styles.timeSeparator}>:</Text>
              </View>
              
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    style={styles.picker}
                    selectedValue={time.getMinutes()}
                    onValueChange={(itemValue) => {
                      const newTime = new Date(time);
                      newTime.setMinutes(itemValue);
                      setTime(newTime);
                    }}
                  >
                    {minutes.map(minute => (
                      <Picker.Item 
                        key={minute} 
                        label={minute < 10 ? `0${minute}` : `${minute}`}
                        value={minute}
                        style={styles.pickerItem}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            
            {/* Quick Time Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => {
                  const now = new Date();
                  setTime(now);
                  setVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionText}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => {
                  const nextHour = new Date();
                  nextHour.setHours(nextHour.getHours() + 1);
                  nextHour.setMinutes(0);
                  setTime(nextHour);
                  setVisible(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionText}>Next Hour</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={Platform.OS === 'web' ? { flex: 1 } : undefined}
          contentContainerStyle={Platform.OS === 'web' ? { flexGrow: 1 } : undefined}
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header */}
          <Animated.View 
            style={[
              styles.header,
              { transform: [{ translateY: headerSlideAnim }] }
            ]}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isEditing ? '✏️ Edit Event' : '✨ Create New Event'}
            </Text>
          </Animated.View>

          {/* Enhanced Form Container */}
          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Title Field */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[0],
                  transform: [{
                    translateX: formItemAnimations[0]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <Text style={styles.label}>Event Title ✨</Text>
              <TextInput
                style={[styles.input, styles.titleInput]}
                value={title}
                onChangeText={setTitle}
                placeholder="What's the name of your awesome event?"
                placeholderTextColor="#999"
              />
            </Animated.View>
            
            {/* Description Field */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[1],
                  transform: [{
                    translateX: formItemAnimations[1]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <Text style={styles.label}>Description 📝</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell people what makes this event special..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </Animated.View>
            
            {/* Location Field */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[2],
                  transform: [{
                    translateX: formItemAnimations[2]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <Text style={styles.label}>Location 📍</Text>
              <TextInput
                style={[styles.input, styles.locationInput]}
                value={location}
                onChangeText={setLocation}
                placeholder="Where is this event taking place?"
                placeholderTextColor="#999"
              />
            </Animated.View>
            
            {/* Capacity Field */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[3],
                  transform: [{
                    translateX: formItemAnimations[3]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <Text style={styles.label}>Capacity 👥</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="How many people can join?"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </Animated.View>
            
            {/* Date Field */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[4],
                  transform: [{
                    translateX: formItemAnimations[4]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <Text style={styles.label}>Date 📅</Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => openPickerModal('date')}
                activeOpacity={0.8}
              >
                <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
                <Ionicons name="calendar" size={20} color="#59a2f0" />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Time Fields */}
            <Animated.View 
              style={[
                styles.timeContainer,
                {
                  opacity: formItemAnimations[5],
                  transform: [{
                    translateX: formItemAnimations[5]?.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }) || 0
                  }]
                }
              ]}
            >
              <View style={styles.timeInputGroup}>
                <Text style={styles.label}>Start Time ⏰</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => openPickerModal('startTime')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateTimeText}>{formatTime(startTime)}</Text>
                  <Ionicons name="time" size={20} color="#59a2f0" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timeInputGroup}>
                <Text style={styles.label}>End Time ⏰</Text>
                <TouchableOpacity 
                  style={styles.dateTimeButton}
                  onPress={() => openPickerModal('endTime')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
                  <Ionicons name="time" size={20} color="#59a2f0" />
                </TouchableOpacity>
              </View>
            </Animated.View>
            
            {/* Enhanced Color Selector */}
            <Animated.View 
              style={[
                styles.formGroup,
                {
                  opacity: formItemAnimations[6],
                  transform: [
                    { translateX: formItemAnimations[6]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }) || 0 },
                    { scale: colorSelectorAnim }
                  ]
                }
              ]}
            >
              <Text style={styles.label}>Event Color 🎨</Text>
              <View style={styles.colorSelector}>
                {colorOptions.map((colorOption, index) => (
                  <TouchableOpacity
                    key={colorOption.color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption.color },
                      color === colorOption.color && styles.selectedColorOption
                    ]}
                    onPress={() => handleColorSelection(colorOption.color)}
                    activeOpacity={0.8}
                  >
                    {color === colorOption.color && (
                      <Ionicons name="checkmark" size={20} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.colorName}>
                {colorOptions.find(c => c.color === color)?.name || 'Custom Color'}
              </Text>
            </Animated.View>
            
            {/* Enhanced Submit Button */}
            <Animated.View 
              style={[
                styles.buttonContainer,
                {
                  opacity: formItemAnimations[7],
                  transform: [
                    { scale: buttonScaleAnim },
                    { translateX: formItemAnimations[7]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }) || 0 }
                  ]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.createButton,
                  loading && styles.loadingButton,
                  { backgroundColor: color }
                ]}
                onPress={handleCreateEvent}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.buttonContent}>
                  {loading ? (
                    <>
                      <Animated.View
                        style={[
                          styles.loadingSpinner,
                          {
                            transform: [{
                              rotate: loadingSpinAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg'],
                              })
                            }]
                          }
                        ]}
                      >
                        <Ionicons name="refresh" size={20} color="white" />
                      </Animated.View>
                      <Text style={styles.buttonText}>
                        {isEditing ? 'Updating Magic...' : 'Creating Magic...'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons 
                        name={isEditing ? "checkmark-circle" : "add-circle"} 
                        size={20} 
                        color="white" 
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>
                        {isEditing ? 'Update Event ✨' : 'Create Event 🎉'}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Success Animation Overlay */}
          <Animated.View
            style={[
              styles.successOverlay,
              {
                opacity: successAnim,
                transform: [{ scale: successAnim }],
                pointerEvents: successAnim._value > 0 ? 'auto' : 'none',
              }
            ]}
          >
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.successText}>
                {isEditing ? 'Updated!' : 'Created!'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date and Time Picker Modals */}
      {renderDatePicker()}
      {renderTimePicker('start', startTime, setStartTime, showStartTimePicker, setShowStartTimePicker)}
      {renderTimePicker('end', endTime, setEndTime, showEndTimePicker, setShowEndTimePicker)}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#59a2f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#333',
  },
  titleInput: {
    borderColor: '#59a2f0',
    backgroundColor: '#f0f8ff',
  },
  locationInput: {
    borderColor: '#59a2f0',
    backgroundColor: '#f0f8ff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputGroup: {
    width: '48%',
  },
  colorSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingVertical: 10,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#333',
    transform: [{ scale: 1.1 }],
  },
  colorName: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 10,
  },
  createButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingButton: {
    backgroundColor: '#cccccc',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingSpinner: {
    marginRight: 10,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    margin: 15,
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
  },
  successText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
  },

  modalOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? '100vw' : '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    width: '90%',
    maxWidth: 450,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafbfc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pickerHeaderButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  pickerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: 0.5,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    fontWeight: '500',
  },
  pickerDoneButton: {
    backgroundColor: '#59a2f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pickerDone: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerCancel: {
    color: '#e53e3e',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedDateDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8fafc',
  },
  selectedDateText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20,
    marginTop: 10,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    width: '100%',
    height: 180,
  },
  pickerItem: {
    height: 45,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 15,
  },
  quickActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#ebf8ff',
    borderWidth: 2,
    borderColor: '#bee3f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 14,
    color: '#3182ce',
    fontWeight: '600',
  },
  selectedTimeDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8fafc',
  },
  selectedTimeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: 1,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    marginBottom: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  timeSeparatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2d3748',
    marginHorizontal: 10,
  },
});