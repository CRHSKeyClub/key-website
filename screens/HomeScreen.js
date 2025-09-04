import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated, Dimensions, Modal, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useHours } from '../contexts/HourContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, RadialGradient } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GLOW_ANIMATION_DURATION = 1200;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && { minHeight: '100vh' }),
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: screenHeight,
    padding: 20,
    paddingTop: 100,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#cbd5e0',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
  },
  hoursCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  hoursInfo: {
    marginLeft: 12,
    flex: 1,
  },
  hoursCardLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 4,
  },
  hoursCardValue: {
    fontWeight: 'bold',
    color: '#4299e1',
    fontSize: 24,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  progressRing: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4299e1',
    textAlign: 'center',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#cbd5e0',
    textAlign: 'center',
    marginTop: 2,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4299e1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  requestButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  debugButton: {
    backgroundColor: '#e53e3e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adminCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  adminTitle: {
    fontWeight: 'bold',
    color: '#4299e1',
    marginBottom: 15,
    fontSize: 18,
  },
  adminButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4299e1',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 0.48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  adminButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  
  // Hamburger Menu Styles
  hamburgerButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuModal: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? '100vw' : '100%',
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99999,
    elevation: 99999,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 300,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 10000,
    overflow: 'hidden',
  },
  menuHeader: {
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: Platform.OS === 'web' ? 10 : 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#1a365d',
    width: '100%',
  },
  menuUserInfo: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 8 : 20,
  },
  menuUserAvatar: {
    width: Platform.OS === 'web' ? 40 : 60,
    height: Platform.OS === 'web' ? 40 : 60,
    borderRadius: Platform.OS === 'web' ? 20 : 30,
    backgroundColor: '#4299e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'web' ? 4 : 10,
  },
  menuUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  menuUserRole: {
    fontSize: 14,
    color: '#cbd5e0',
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  menuItemIcon: {
    width: Platform.OS === 'web' ? 28 : 40,
    height: Platform.OS === 'web' ? 28 : 40,
    borderRadius: Platform.OS === 'web' ? 14 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    flex: 1,
  },
  menuItemArrow: {
    color: '#a0aec0',
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e53e3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e53e3e',
  },
  glowCircle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    zIndex: 1,
  },
});

// Helper for Animated SVG Circle
import { Animated as RNAnimated } from 'react-native';
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

export default function HomeScreen() {
  const { user, isAdmin, logout } = useAuth();
  const { getStudentHours } = useHours();
  const navigation = useNavigation();
  const [currentHours, setCurrentHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [previousHours, setPreviousHours] = useState(0);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const menuSlideAnim = useRef(new Animated.Value(-300)).current;
  const menuFadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Initialize menu animation
  useEffect(() => {
    menuSlideAnim.setValue(-300);
  }, []);

  // Load current hours when component mounts
  useEffect(() => {
    const loadCurrentHours = async () => {
      if (user?.sNumber && !isAdmin) {
        const hours = await getStudentHours(user.sNumber);
        setCurrentHours(hours);
        const progressPercentage = Math.min(hours / 25, 1);
        progressAnim.setValue(progressPercentage);
      }
      setLoading(false);
    };
    loadCurrentHours();
  }, [user, getStudentHours, isAdmin, progressAnim]);

  // Animate progress and glow when hours increase
  useFocusEffect(
    React.useCallback(() => {
      const refreshHours = async () => {
        if (user?.sNumber && !isAdmin) {
          const hours = await getStudentHours(user.sNumber);
          if (hours > previousHours && previousHours > 0) {
            setPreviousHours(currentHours);
            setCurrentHours(hours);
            // Animate progress and glow
            const oldProgress = Math.min(currentHours / 25, 1);
            const newProgress = Math.min(hours / 25, 1);
            progressAnim.setValue(oldProgress);
            Animated.parallel([
              Animated.timing(progressAnim, {
                toValue: newProgress,
                duration: GLOW_ANIMATION_DURATION,
                useNativeDriver: false,
              }),
              Animated.sequence([
                Animated.timing(glowAnim, {
                  toValue: 1,
                  duration: GLOW_ANIMATION_DURATION / 2,
                  useNativeDriver: false,
                }),
                Animated.timing(glowAnim, {
                  toValue: 0,
                  duration: GLOW_ANIMATION_DURATION / 2,
                  useNativeDriver: false,
                })
              ])
            ]).start();
          } else {
            setPreviousHours(currentHours);
            setCurrentHours(hours);
            progressAnim.setValue(Math.min(hours / 25, 1));
          }
        }
      };
      refreshHours();
    }, [user, getStudentHours, isAdmin, progressAnim, currentHours, previousHours])
  );

  // Simple entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();

  }, []);

  const toggleMenu = () => {
    const toValue = menuVisible ? 0 : 1;
    setMenuVisible(!menuVisible);
    
    const slideToValue = menuVisible ? -300 : 0;
    
    Animated.parallel([
      Animated.timing(menuSlideAnim, {
        toValue: slideToValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(menuFadeAnim, {
        toValue: toValue,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const sidebarScreenMap = {
    home: 'Home',
    events: 'Calendar',
    reviewHours: 'AdminHourManagement',
    studentManagement: 'AdminStudentManagement',
    hourRequest: 'HourRequest',
    announcements: 'Announcements',
    officers: 'Officers',
    logout: 'Logout',
  };

  const navigateTo = (screen) => {
    setTimeout(() => {
      if (screen === 'home') {
        navigation.navigate('Home');
      } else if (screen === 'calendar') {
        navigation.navigate('Calendar');
      } else if (screen === 'hours') {
        if (isAdmin) {
          navigation.navigate('Calendar', { screen: 'AdminHourManagement' });
        } else {
          navigation.navigate('Calendar', { screen: 'HourRequest' });
        }
      } else if (screen === 'announcements') {
        navigation.navigate('Announcements');
      } else if (screen === 'officers') {
        navigation.navigate('Officers');
      } else if (screen === 'studentManagement') {
        navigation.navigate('AdminStudentManagement');
      } else if (screen === 'meetingAttendance') {
        if (isAdmin) {
          navigation.navigate('AdminMeetingManagement');
        } else {
          navigation.navigate('StudentMeetingAttendance');
        }
      } else if (screen === 'socialMedia') {
        navigation.navigate('SocialMedia');
      } else if (screen === 'newsletter' || screen === 'Newsletter') {
        navigation.navigate('Newsletter');
      } else if (screen === 'AdminMeetingManagement') {
        navigation.navigate('AdminMeetingManagement');
      } else if (screen === 'StudentMeetingAttendance') {
        navigation.navigate('StudentMeetingAttendance');
      } else if (screen === 'Logout' || screen === 'logout') {
        logout();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }, 150);
  };

  const menuItems = [
    {
      id: 'home',
      title: 'Home',
      icon: 'home',
      gradient: ['#4299e1', '#3182ce'],
      action: () => navigateTo('Home')
    },
    {
      id: 'calendar',
      title: 'Events',
      icon: 'calendar',
      gradient: ['#38b2ac', '#319795'],
      action: () => navigateTo('Calendar')
    },
    {
      id: 'hours',
      title: isAdmin ? 'Review Hours' : 'Request Hours',
      icon: isAdmin ? 'time' : 'add-circle',
      gradient: ['#ed8936', '#dd6b20'],
      action: () => navigateTo(isAdmin ? 'hours' : 'hours')
    },
    {
      id: 'announcements',
      title: 'Announcements',
      icon: 'megaphone',
      gradient: ['#9f7aea', '#805ad5'],
      action: () => navigateTo('Announcements')
    },
    {
      id: 'officers',
      title: 'Officers',
      icon: 'people',
      gradient: ['#48bb78', '#38a169'],
      action: () => navigateTo('Officers')
    },
    {
      id: 'meetingAttendance',
      title: isAdmin ? 'Meeting Management' : 'Meeting Attendance',
      icon: isAdmin ? 'settings' : 'checkmark-circle',
      gradient: ['#f59e0b', '#d97706'],
      action: () => navigateTo(isAdmin ? 'AdminMeetingManagement' : 'StudentMeetingAttendance')
    },
    {
      id: 'newsletter',
      title: 'Newsletter',
      icon: 'document-text',
      gradient: ['#2b6cb0', '#2c5282'],
      action: () => navigateTo('newsletter')
    },
    {
      id: 'socialMedia',
      title: 'Social Media',
      icon: 'logo-instagram',
      gradient: ['#E1306C', '#F56040'],
      action: () => navigateTo('socialMedia')
    },
    ...(isAdmin ? [{
      id: 'studentManagement',
      title: 'Student Management',
      icon: 'people',
      gradient: ['#4299e1', '#3182ce'],
      action: () => navigateTo('studentManagement')
    }] : []),
  ];

  return (
    <View style={[styles.container, Platform.OS === 'web' && { flex: 1, minHeight: '100vh' }]}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Hamburger Button */}
        <LinearGradient
          colors={['#4299e1', '#3182ce']}
          style={styles.hamburgerButton}
        >
                  <TouchableOpacity onPress={toggleMenu} activeOpacity={0.8}>
          <Ionicons name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>



        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }}
        >
        <Text style={styles.welcome}>
          Welcome, {user?.name || user?.sNumber || 'Member'}
        </Text>
        
        <Image 
          source={require('../assets/images/keyclublogo-modified.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Key Club</Text>
        <Text style={styles.subtitle}>
          {isAdmin ? 'Manage events and oversee club activities' : 'Track events, hours, and stay connected'}
        </Text>
        
        {!isAdmin ? (
          <View style={styles.hoursCard}>
            <View style={styles.hoursHeader}>
              <Ionicons name="trophy" size={24} color="#4299e1" />
              <View style={styles.hoursInfo}>
                <Text style={styles.hoursCardLabel}>Your Progress</Text>
                <Text style={styles.hoursCardValue}>
                  {loading ? '...' : `${currentHours.toFixed(1)} / 25 hours`}
                </Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressRing}>
                {/* Animated Glow Effect */}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.glowCircle, {
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.7]
                    })
                  }]}
                >
                  <Svg width="100" height="100">
                    <Defs>
                      <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#4299e1" stopOpacity="0.7" />
                        <Stop offset="100%" stopColor="#4299e1" stopOpacity="0" />
                      </RadialGradient>
                    </Defs>
                    <Circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="url(#glow)"
                    />
                  </Svg>
                </Animated.View>
                <Svg width="100" height="100">
                  <Defs>
                    <SvgLinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <Stop offset="0%" stopColor="#4299e1" />
                      <Stop offset="100%" stopColor="#3182ce" />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Background circle */}
                  <Circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="rgba(66, 153, 225, 0.2)"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <AnimatedCircle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#grad)"
                    strokeWidth="10"
                    strokeDasharray={`${Math.PI * 90} ${Math.PI * 90}`}
                    strokeDashoffset={progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Math.PI * 90, 0]
                    })}
                    strokeLinecap="round"
                    fill="transparent"
                    opacity={progressAnim.interpolate({
                      inputRange: [0, 0.8, 1],
                      outputRange: [0.7, 0.9, 1]
                    })}
                  />
                </Svg>
                <View style={styles.progressTextContainer}>
                  <Animated.Text 
                    style={[
                      styles.progressText,
                      {
                        transform: [{
                          scale: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1]
                          })
                        }]
                      }
                    ]}
                  >
                    {loading ? '...' : `${Math.round((currentHours / 25) * 100)}%`}
                  </Animated.Text>
                  <Text style={styles.progressSubtext}>
                    {loading ? '...' : `${currentHours.toFixed(1)} / 25 hours`}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => navigateTo('hours')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
              <Text style={styles.requestButtonText}>Request Hours</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.adminCard}>
            <Text style={styles.adminTitle}>Admin Dashboard</Text>
            
            <TouchableOpacity
              style={styles.requestButton}
              onPress={() => navigateTo('calendar')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar" size={20} color="#ffffff" />
              <Text style={styles.requestButtonText}>Create Event</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.requestButton, { marginTop: 12 }]}
              onPress={() => navigateTo('hours')}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={20} color="#ffffff" />
              <Text style={styles.requestButtonText}>Review Hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.requestButton, { marginTop: 12 }]}
              onPress={() => navigateTo('meetingAttendance')}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={20} color="#ffffff" />
              <Text style={styles.requestButtonText}>Meeting Management</Text>
            </TouchableOpacity>
          </View>
        )}
        </Animated.View>
      </ScrollView>
      </SafeAreaView>



      {/* Hamburger Menu Overlay */}
      <Animated.View
        style={[
          styles.menuModal,
          {
            opacity: menuFadeAnim,
            display: menuVisible ? 'flex' : 'none'
          }
        ]}
        pointerEvents={menuVisible ? 'auto' : 'none'}
        data-testid="modal"
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={toggleMenu}
          activeOpacity={1}
        />
        
        <Animated.View
          style={[
            styles.menuContainer,
            {
              transform: [{ translateX: menuSlideAnim }]
            }
          ]}
          pointerEvents="box-none"
        >
            <View style={styles.menuHeader}>
              <View style={styles.menuUserInfo}>
                <LinearGradient
                  colors={['#4299e1', '#3182ce']}
                  style={styles.menuUserAvatar}
                >
                  <Ionicons name="person" size={30} color="#ffffff" />
                </LinearGradient>
                <Text style={styles.menuUserName}>
                  {user?.name || user?.sNumber || 'Member'}
                </Text>
                <Text style={styles.menuUserRole}>
                  {isAdmin ? 'Administrator' : 'Student'}
                </Text>
              </View>
            </View>
            
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => {
                    console.log('Sidebar tab pressed:', item.id);
                    toggleMenu();
                    setTimeout(() => navigateTo(item.id), 150);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Navigate to ${item.title}`}
                >
                  <LinearGradient
                    colors={item.gradient}
                    style={styles.menuItemIcon}
                  >
                    <Ionicons name={item.icon} size={20} color="#ffffff" />
                  </LinearGradient>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} style={styles.menuItemArrow} />
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.menuFooter}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => navigateTo('Logout')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <View style={styles.logoutIcon}>
                  <Ionicons name="log-out" size={20} color="#ffffff" />
                </View>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    );
}