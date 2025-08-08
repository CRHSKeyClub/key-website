import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Modal,
  Animated,
  Easing,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEvents } from '../contexts/EventsContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CalendarScreen({ navigation, route }) {
  const { events, deleteEvent, refreshEvents } = useEvents();
  const { isAdmin, logout } = useAuth();
  const { showModal } = useModal();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const fabScaleAnim = useRef(new Animated.Value(0)).current;
  const calendarScaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerSlideAnim = useRef(new Animated.Value(-100)).current;
  const eventItemAnimations = useRef({}).current;
  const monthTransitionAnim = useRef(new Animated.Value(1)).current;
  const deletingEventId = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const menuSlideAnim = useRef(new Animated.Value(-screenWidth * 0.8)).current;
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  
  // State for context menu
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    eventId: null
  });
  


  // Loading state for refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Entrance animations
  useEffect(() => {
    const animateEntrance = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(headerSlideAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 700,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: false,
          }),
          Animated.timing(calendarScaleAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.1)),
            useNativeDriver: false,
          }),
        ]),
        Animated.spring(fabScaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }),
      ]).start();
    };

    animateEntrance();
    startPulseAnimation();
  }, []);

  // Pulse animation for current day
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  // Listen for focus events to refresh the calendar
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      handleRefresh();
    });
    
    return unsubscribe;
  }, [navigation, refreshEvents]);

  // Enhanced refresh with animations
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Animate refresh
    Animated.sequence([
      Animated.timing(calendarScaleAnim, {
        toValue: 0.98,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(calendarScaleAnim, {
        toValue: 1.02,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(calendarScaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    try {
      await refreshEvents();
      setRefreshKey(prevKey => prevKey + 1);
      
      // Animate events appearing
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
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Refresh events when component mounts
  useEffect(() => {
    handleRefresh();
  }, []);

  // Generate calendar days with animations
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const calendarArr = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarArr.push(null);
    }

    // Add cells for each day of the month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarArr.push(new Date(year, month, i));
    }

    setCalendarDays(calendarArr);

    // Animate calendar update
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
  }, [currentDate, refreshKey, events]);

  // Enhanced month navigation with smooth transitions
  const prevMonth = () => {
    Animated.sequence([
      Animated.timing(monthTransitionAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(monthTransitionAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: false,
      }),
    ]).start();

    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    Animated.sequence([
      Animated.timing(monthTransitionAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(monthTransitionAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: false,
      }),
    ]).start();

    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    if (!day) return [];

    return events.filter(event => {
      if (!event.date) return false;
      const [year, month, dateNum] = event.date.split('-').map(Number);
      const eventDate = new Date(year, month - 1, dateNum);
      return eventDate.getDate() === day.getDate() &&
             eventDate.getMonth() === day.getMonth() &&
             eventDate.getFullYear() === day.getFullYear();
    });
  };

  // Enhanced event press with haptic feedback
  const handleEventPress = (eventId) => {
    // Create press animation
    const animationId = `event_${eventId}`;
    if (!eventItemAnimations[animationId]) {
      eventItemAnimations[animationId] = new Animated.Value(1);
    }

    Animated.sequence([
      Animated.timing(eventItemAnimations[animationId], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(eventItemAnimations[animationId], {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: false,
      }),
    ]).start();

    setTimeout(() => {
      navigation.navigate('Event', { eventId });
    }, 100);
  };

  // Enhanced long press with context menu animation
  const handleEventLongPress = (eventId, event) => {
    if (isAdmin) {
      const animationId = `event_${eventId}`;
      if (!eventItemAnimations[animationId]) {
        eventItemAnimations[animationId] = new Animated.Value(1);
      }

      // Vibration-like animation
      Animated.sequence([
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 1.05,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 0.98,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 1.02,
          duration: 50,
          useNativeDriver: false,
        }),
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]).start();

      setContextMenu({
        visible: true,
        eventId
      });
    }
  };

  // Handle context menu options with animations
  const handleMenuOption = (option) => {
    const eventId = contextMenu.eventId;
    
    setContextMenu({ visible: false, eventId: null });
    
    switch (option) {
      case 'view':
        navigation.navigate('Event', { eventId });
        break;
      case 'edit':
        navigation.navigate('EventCreation', { eventId, isEditing: true });
        break;
      case 'attendees':
        navigation.navigate('AttendeeList', { eventId });
        break;
      case 'delete':
        const eventToDelete = events.find(e => e.id === eventId);
        showModal({
          title: 'Confirm Deletion',
          message: `Delete ${eventToDelete ? eventToDelete.title : 'this event'}?`,
          onCancel: () => {},
          onConfirm: () => handleDeleteConfirm(eventId),
          cancelText: 'Cancel',
          confirmText: 'Delete',
          icon: 'alert-circle',
          iconColor: '#ff4d4d'
        });
        break;
    }
  };

  // Enhanced delete with dramatic animation
  const handleDeleteConfirm = async (eventId) => {
    deletingEventId.current = eventId;
    
    // Create dramatic delete animation
    const animationId = `event_${eventId}`;
    if (!eventItemAnimations[animationId]) {
      eventItemAnimations[animationId] = new Animated.Value(1);
    }

    // Animate deletion
    Animated.sequence([
      Animated.parallel([
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 1.1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(eventItemAnimations[animationId], {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.back(1.5)),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    try {
      // Delay actual deletion to show animation
      setTimeout(async () => {
        await deleteEvent(eventId);
        setRefreshKey(prev => prev + 1);
        
        // Success animation
        showModal({
          title: 'Success',
          message: 'Event deleted successfully',
          onCancel: () => {},
          onConfirm: () => {},
          cancelText: '',
          confirmText: 'OK',
          icon: 'checkmark-circle',
          iconColor: '#4CAF50'
        });

        // Clean up animation ref
        delete eventItemAnimations[animationId];
        deletingEventId.current = null;
      }, 300);
      
    } catch (error) {
      console.error('Error deleting event:', error);
      deletingEventId.current = null;
      
      // Reset animation
      Animated.timing(eventItemAnimations[animationId], {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      
      showModal({
        title: 'Error',
        message: 'Failed to delete event. Please try again.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    }
  };

  // Enhanced FAB press animation
  const handleFabPress = (action) => {
    Animated.sequence([
      Animated.timing(fabScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(fabScaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();

    setTimeout(() => {
      if (action === 'create') {
        navigation.navigate('EventCreation');
      } else if (action === 'manage') {
        navigation.navigate('EventDeletion');
      }
    }, 150);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const renderDay = ({ item: day, index }) => {
    const dayEvents = day ? getEventsForDay(day) : [];
    const isToday = day && 
      day.getDate() === new Date().getDate() &&
      day.getMonth() === new Date().getMonth() &&
      day.getFullYear() === new Date().getFullYear();
    
    return (
      <Animated.View 
        style={[
          styles.calendarDay,
          !day && styles.emptyDay,
          isToday && styles.todayDay,
          { 
            transform: [{ scale: monthTransitionAnim }],
            opacity: fadeAnim 
          }
        ]}
      >
        {day && (
          <>
            <Animated.View style={[
              styles.dayNumberContainer,
              isToday && { transform: [{ scale: pulseAnim }] }
            ]}>
              <Text style={[
                styles.dayNumber,
                isToday && styles.todayDayNumber
              ]}>
                {day.getDate()}
              </Text>
            </Animated.View>
            {dayEvents.map((event, eventIndex) => {
              const animationId = `event_${event.id}`;
              if (!eventItemAnimations[animationId]) {
                eventItemAnimations[animationId] = new Animated.Value(1);
              }

              const isDeleting = deletingEventId.current === event.id;

              return (
                <Animated.View
                  key={event.id}
                  style={{
                    transform: [{ scale: eventItemAnimations[animationId] }],
                    opacity: isDeleting ? 0 : 1,
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.eventItem, 
                      { 
                        backgroundColor: event.color || '#4287f5',
                        marginTop: eventIndex * 2,
                      }
                    ]}
                    onPress={() => handleEventPress(event.id)}
                    onLongPress={() => handleEventLongPress(event.id, event)}
                    delayLongPress={500}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {new Date(`2000-01-01T${event.startTime}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </>
        )}
      </Animated.View>
    );
  };

  // Add floating sparkles component after the existing functions
  const FloatingSparkles = () => {
    const sparkles = [...Array(12)].map((_, i) => {
      const sparkleAnim = useRef(new Animated.Value(0)).current;
      
      useEffect(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleAnim, {
              toValue: 1,
              duration: 5000 + Math.random() * 3000,
              useNativeDriver: false,
            }),
            Animated.timing(sparkleAnim, {
              toValue: 0,
              duration: 5000 + Math.random() * 3000,
              useNativeDriver: false,
            })
          ])
        ).start();
      }, []);

      return (
        <Animated.View
          key={i}
          style={[
            styles.floatingSparkle,
            {
              left: Math.random() * screenWidth,
              top: Math.random() * screenHeight,
              opacity: sparkleAnim,
              transform: [
                { translateY: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -25 - Math.random() * 30]
                }) },
                { scale: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1.1]
                }) }
              ]
            }
          ]}
        />
      );
    });

    return <>{sparkles}</>;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Sparkles Background */}
      <FloatingSparkles />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: headerSlideAnim }] }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={prevMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFCC00" />
          </TouchableOpacity>
          
          <Animated.Text 
            style={[
              styles.monthText,
              { opacity: monthTransitionAnim }
            ]}
          >
            {currentDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </Animated.Text>
          
          <TouchableOpacity 
            style={styles.monthButton}
            onPress={nextMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#FFCC00" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Calendar Grid */}
      <Animated.View 
        style={[
          styles.calendarContainer,
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: calendarScaleAnim }
            ]
          }
        ]}
      >
        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <View key={index} style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar days */}
        <FlatList
          data={calendarDays}
          renderItem={renderDay}
          keyExtractor={(item, index) => `day-${index}`}
          numColumns={7}
          scrollEnabled={false}
          key={refreshKey}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.calendarGrid}
        />
      </Animated.View>

      {/* FAB */}
      {isAdmin && (
        <Animated.View 
          style={[
            styles.fabContainer,
            { 
              transform: [
                { scale: fabScaleAnim },
                { scale: pulseAnim }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={() => handleFabPress('create')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Enhanced Context Menu Modal */}
      <Modal
        transparent={true}
        visible={contextMenu.visible}
        animationType="fade"
        onRequestClose={() => setContextMenu({ visible: false, eventId: null })}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setContextMenu({ visible: false, eventId: null })}
          data-testid="modal"
        >
          <Animated.View 
            style={[
              styles.contextMenuContainer,
              {
                transform: [{ scale: contextMenu.visible ? 1 : 0.8 }],
                opacity: contextMenu.visible ? 1 : 0,
              }
            ]}
          >
            {[
              { key: 'view', icon: 'eye-outline', text: 'View Event', color: '#333' },
              { key: 'edit', icon: 'create-outline', text: 'Edit Event', color: '#333' },
              { key: 'attendees', icon: 'people-outline', text: 'View Attendees', color: '#333' },
              { key: 'delete', icon: 'trash-outline', text: 'Delete Event', color: '#e53e3e' },
            ].map((item, index) => (
              <TouchableOpacity 
                key={item.key}
                style={[
                  styles.contextMenuItem,
                  item.key === 'delete' && styles.deleteMenuItem
                ]}
                onPress={() => handleMenuOption(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon} size={20} color={item.color} />
                <Text style={[
                  styles.contextMenuText,
                  item.key === 'delete' && styles.deleteMenuText
                ]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Loading Overlay */}
      {isRefreshing && (
        <Animated.View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingSpinner,
                {
                  transform: [{
                    rotate: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]}
            >
              <Ionicons name="refresh" size={24} color="#4299e1" />
            </Animated.View>
            <Text style={styles.loadingText}>Refreshing...</Text>
          </View>
        </Animated.View>
      )}


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1c5a',
  },
  header: {
    backgroundColor: 'rgba(0, 32, 128, 0.35)',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCC00',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 204, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.35)'
  },
  monthText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFCC00',
    textShadowColor: 'rgba(255, 204, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFCC00',
    opacity: 0.95,
  },
  calendarGrid: {
    flexGrow: 1,
    paddingBottom: 12,
  },
  dayContainer: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0', // Light gray text
  },
  todayText: {
    color: '#4299e1', // Professional blue
    fontWeight: 'bold',
  },
  otherMonthText: {
    color: '#718096', // Medium gray
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4299e1', // Professional blue
    shadowColor: '#4299e1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4299e1', // Professional blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  floatingSparkle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4299e1', // Professional blue
    shadowColor: '#4299e1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  calendarDay: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.28)',
    padding: 10,
    margin: 4,
    width: '14.28%',
    backgroundColor: 'rgba(0, 51, 204, 0.18)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  emptyDay: {
    backgroundColor: 'rgba(0, 51, 204, 0.08)',
  },
  todayDay: {
    backgroundColor: 'rgba(255, 204, 0, 0.22)',
    borderColor: '#FFCC00',
    borderWidth: 2,
  },
  dayNumberContainer: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dayNumber: {
    fontWeight: '700',
    color: '#e6e6e6',
    fontSize: 18,
  },
  todayDayNumber: {
    color: '#0b1c5a',
    fontSize: 20,
    fontWeight: '800',
  },
  eventItem: {
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
    backgroundColor: '#0033CC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  eventTitle: {
    color: '#FFCC00',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventTime: {
    color: '#ffffff',
    fontSize: 10,
    marginTop: 2,
  },
  fabShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  modalOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? '100vw' : '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  contextMenuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '85%',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deleteMenuItem: {
    borderBottomWidth: 0,
  },
  contextMenuText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#2d3748', // Dark gray
    fontWeight: '500',
  },
  deleteMenuText: {
    color: '#e53e3e', // Red
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingSpinner: {
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#4299e1', // Professional blue
    fontWeight: '500',
  },
});