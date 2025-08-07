import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import SupabaseService from '../services/SupabaseService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AuthScreen({ navigation }) {
  const { loginAsStudent, registerStudent } = useAuth();
  const [isSignUpActive, setIsSignUpActive] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;
  
  // Sign In State
  const [signInSNumber, setSignInSNumber] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  
  // Sign Up State
  const [signUpSNumber, setSignUpSNumber] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  
  // Animated toggle between sign in and sign up
  const toggleAuthMode = () => {
    console.log('Toggle button clicked! Current state:', isSignUpActive);
    
    // Start the animation sequence
    Animated.sequence([
      // Fade out current form
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      // Slide to new form
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: isSignUpActive ? 0 : 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toggleAnim, {
          toValue: isSignUpActive ? 0 : 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]),
      // Fade in new form
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsSignUpActive(!isSignUpActive);
    console.log('New state will be:', !isSignUpActive);
  };
  
  // Handle Sign In
  const handleSignIn = async () => {
    if (!signInSNumber || !signInPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (!signInSNumber.toLowerCase().startsWith('s')) {
      Alert.alert('Error', 'Please enter a valid S-Number starting with "s"');
      return;
    }
    
    setSignInLoading(true);
    
    try {
      const success = await loginAsStudent(signInSNumber.toLowerCase(), signInPassword);
      
      if (success) {
        // Navigation handled by AuthContext
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setSignInLoading(false);
    }
  };
  
  // Handle Sign Up
  const handleSignUp = async () => {
    if (!signUpSNumber || !signUpName || !signUpPassword || !signUpConfirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (!signUpSNumber.toLowerCase().startsWith('s')) {
      Alert.alert('Error', 'Please enter a valid S-Number starting with "s"');
      return;
    }
    
    if (signUpPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    if (signUpPassword !== signUpConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    setSignUpLoading(true);
    
    try {
      const student = await SupabaseService.getStudent(signUpSNumber);
      
      if (!student) {
        Alert.alert('Not Found', 'Your S-Number was not found in our system. Please contact your Key Club sponsor.');
        setSignUpLoading(false);
        return;
      }
      
      const authUser = await SupabaseService.getAuthUser(signUpSNumber);
      
      if (authUser) {
        Alert.alert('Account Exists', 'An account already exists. Please sign in.');
        setSignUpLoading(false);
        toggleAuthMode();
        return;
      }
      
      const success = await registerStudent(signUpSNumber.toLowerCase(), signUpPassword, signUpName);
      
      if (success) {
        Alert.alert('Success', 'Account created successfully! Please sign in.');
        toggleAuthMode();
        setSignUpSNumber('');
        setSignUpName('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setSignUpLoading(false);
    }
  };
  
  // Dynamic content based on current state
  const getOverlayContent = () => {
    if (isSignUpActive) {
      // User is on Sign Up, show Sign In option
      return {
        title: "Already a Member?",
        text: "Welcome back! Sign in to access your account and continue tracking your progress",
        buttonText: "SIGN IN"
      };
    } else {
      // User is on Sign In, show Sign Up option
      return {
        title: "New to Key Club?",
        text: "Create an account to track your volunteer hours and participate in events",
        buttonText: "SIGN UP"
      };
    }
  };
  
  const overlayContent = getOverlayContent();
  
  // Calculate toggle button position
  const toggleButtonTranslateX = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth - 40], // Adjust based on your toggle container width
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Student Login</Text>
              <Text style={styles.headerSubtitle}>Access your Key Club account</Text>
            </View>
            
            <View style={styles.authContainer}>
              {/* Animated Toggle Buttons */}
              <View style={styles.toggleContainer}>
                <Animated.View 
                  style={[
                    styles.toggleSlider,
                    {
                      transform: [{ translateX: toggleButtonTranslateX }],
                    }
                  ]}
                />
                <TouchableOpacity
                  style={[styles.toggleButton, !isSignUpActive && styles.toggleButtonActive]}
                  onPress={() => isSignUpActive && toggleAuthMode()}
                >
                  <Text style={[styles.toggleButtonText, !isSignUpActive && styles.toggleButtonTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, isSignUpActive && styles.toggleButtonActive]}
                  onPress={() => !isSignUpActive && toggleAuthMode()}
                >
                  <Text style={[styles.toggleButtonText, isSignUpActive && styles.toggleButtonTextActive]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Animated Form Container */}
              <Animated.View 
                style={[
                  styles.formContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -screenWidth],
                        })
                      }
                    ]
                  }
                ]}
              >
                {/* Sign In Form */}
                {!isSignUpActive && (
                  <View style={styles.formPanel}>
                    <View style={styles.keyClubLogoContainer}>
                      <Image 
                        source={require('../assets/images/keyclublogo.png')} 
                        style={styles.keyClubLogo}
                        resizeMode="contain"
                      />
                    </View>
                    
                    <Text style={styles.formTitle}>Sign In</Text>
                    <Text style={styles.formSubtitle}>Use your S-Number to access your account</Text>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>S-Number</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="s150712"
                          value={signInSNumber}
                          onChangeText={setSignInSNumber}
                          autoCapitalize="none"
                          editable={!signInLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your password"
                          value={signInPassword}
                          onChangeText={setSignInPassword}
                          secureTextEntry
                          editable={!signInLoading}
                        />
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('ForgotPassword')}
                      style={styles.forgotLink}
                    >
                      <Text style={styles.forgotLinkText}>Forgot Your Password?</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.button, signInLoading && styles.disabledButton]}
                      onPress={handleSignIn}
                      disabled={signInLoading}
                    >
                      {signInLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Sign Up Form */}
                {isSignUpActive && (
                  <View style={styles.formPanel}>
                    <View style={styles.keyClubLogoContainer}>
                      <Image 
                        source={require('../assets/images/keyclublogo.png')} 
                        style={styles.keyClubLogo}
                        resizeMode="contain"
                      />
                    </View>
                    
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtitle}>Register with your personal details to join Key Club</Text>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>S-Number</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="card" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="s150712"
                          value={signUpSNumber}
                          onChangeText={setSignUpSNumber}
                          autoCapitalize="none"
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Full Name</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Your full name"
                          value={signUpName}
                          onChangeText={setSignUpName}
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Create a password"
                          value={signUpPassword}
                          onChangeText={setSignUpPassword}
                          secureTextEntry
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={20} color="#4299e1" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm your password"
                          value={signUpConfirmPassword}
                          onChangeText={setSignUpConfirmPassword}
                          secureTextEntry
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.button, signUpLoading && styles.disabledButton]}
                      onPress={handleSignUp}
                      disabled={signUpLoading}
                    >
                      {signUpLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Create Account</Text>
                          <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d', // Deep navy blue background
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    minHeight: screenHeight,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4299e1', // Professional blue
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(66, 153, 225, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e2e8f0', // Light gray
    textAlign: 'center',
    opacity: 0.9,
  },
  authContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Subtle transparency
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(66, 153, 225, 0.2)',
    overflow: 'hidden', // Important for slide animations
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    position: 'relative',
  },
  toggleSlider: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    height: '100%',
    backgroundColor: '#4299e1',
    borderRadius: 8,
    zIndex: 1,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 2,
  },
  toggleButtonActive: {
    // Background is now handled by the slider
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0', // Light gray
  },
  toggleButtonTextActive: {
    color: '#ffffff',
  },
  formContainer: {
    width: '100%',
    position: 'relative',
  },
  formPanel: {
    width: '100%',
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  keyClubLogoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  keyClubLogo: {
    width: 80,
    height: 80,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4299e1', // Professional blue
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 15,
    color: '#e2e8f0', // Light gray
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 15,
    color: '#e2e8f0', // Light gray
    marginBottom: 10,
    fontWeight: '600',
    textAlign: 'left',
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4299e1', // Professional blue
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 50,
    width: '100%',
  },
  inputIcon: {
    marginRight: 10,
    color: '#4299e1', // Professional blue
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748', // Dark gray
    backgroundColor: 'transparent',
    marginLeft: 12,
    paddingVertical: 8,
    minHeight: 20,
  },
  forgotLink: {
    marginVertical: 10,
    alignSelf: 'flex-end',
  },
  forgotLinkText: {
    color: '#4299e1', // Professional blue
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4299e1', // Professional blue
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 14,
    marginTop: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: '#718096', // Medium gray
  },
});