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
  
  // Animation values for circular sliding effect
  const circularSlideAnim = useRef(new Animated.Value(0)).current;
  const leftPanelSlideAnim = useRef(new Animated.Value(0)).current;
  const rightPanelSlideAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
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
  
  // Animated toggle with circular sliding effect
  const toggleAuthMode = () => {
    console.log('Toggle button clicked! Current state:', isSignUpActive);
    
    // Start the complex animation sequence
    Animated.sequence([
      // Step 1: Fade out current form
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      // Step 2: Start circular slide and panel movements
      Animated.parallel([
        // Circular background slides
        Animated.timing(circularSlideAnim, {
          toValue: isSignUpActive ? 0 : 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        // Left panel slides out (with delay)
        Animated.sequence([
          Animated.delay(isSignUpActive ? 0 : 1200),
          Animated.timing(leftPanelSlideAnim, {
            toValue: isSignUpActive ? 0 : 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Right panel slides in (with delay)
        Animated.sequence([
          Animated.delay(isSignUpActive ? 1200 : 0),
          Animated.timing(rightPanelSlideAnim, {
            toValue: isSignUpActive ? 0 : 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        // Form slides
        Animated.timing(formSlideAnim, {
          toValue: isSignUpActive ? 0 : 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Step 3: Fade in new form
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
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
            <View style={styles.authContainer}>
              {/* Circular Sliding Background */}
              <Animated.View 
                style={[
                  styles.circularBackground,
                  {
                    left: circularSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-screenWidth * 0.9, screenWidth * 0.1],
                    }),
                  }
                ]}
              />
              
              {/* Form Container */}
              <Animated.View 
                style={[
                  styles.formContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: formSlideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -screenWidth * 0.5],
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
                        <Ionicons name="person" size={20} color="#1e40af" style={styles.inputIcon} />
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
                        <Ionicons name="lock-closed" size={20} color="#1e40af" style={styles.inputIcon} />
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
                        <Ionicons name="card" size={20} color="#1e40af" style={styles.inputIcon} />
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
                        <Ionicons name="person" size={20} color="#1e40af" style={styles.inputIcon} />
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
                        <Ionicons name="lock-closed" size={20} color="#1e40af" style={styles.inputIcon} />
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
                        <Ionicons name="lock-closed" size={20} color="#1e40af" style={styles.inputIcon} />
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
              
              {/* Toggle Panels */}
              <View style={styles.toggleContainer}>
                {/* Left Panel */}
                <Animated.View 
                  style={[
                    styles.togglePanel,
                    styles.toggleLeft,
                    {
                      transform: [
                        {
                          translateX: leftPanelSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -screenWidth * 0.5],
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <Text style={styles.toggleTitle}>Hello, Welcome!</Text>
                  <Text style={styles.toggleText}>Don't have an account?</Text>
                  <TouchableOpacity 
                    style={styles.toggleButton}
                    onPress={toggleAuthMode}
                  >
                    <Text style={styles.toggleButtonText}>Register</Text>
                  </TouchableOpacity>
                </Animated.View>
                
                {/* Right Panel */}
                <Animated.View 
                  style={[
                    styles.togglePanel,
                    styles.toggleRight,
                    {
                      transform: [
                        {
                          translateX: rightPanelSlideAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [screenWidth * 0.5, 0],
                          })
                        }
                      ]
                    }
                  ]}
                >
                  <Text style={styles.toggleTitle}>Welcome Back!</Text>
                  <Text style={styles.toggleText}>Already have an account?</Text>
                  <TouchableOpacity 
                    style={styles.toggleButton}
                    onPress={toggleAuthMode}
                  >
                    <Text style={styles.toggleButtonText}>Login</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
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
    backgroundColor: '#f8fafc', // Light blue-gray background
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
    padding: 20,
    minHeight: screenHeight,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    width: '100%',
    maxWidth: 700,
  },
  authContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 700,
    height: 500,
    backgroundColor: '#fff',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 8,
    overflow: 'hidden',
    alignSelf: 'center',
    marginHorizontal: 20,
  },
  circularBackground: {
    position: 'absolute',
    width: screenWidth * 1.8,
    height: '100%',
    backgroundColor: '#1e40af',
    borderRadius: screenWidth * 0.9,
    zIndex: 2,
    overflow: 'hidden',
  },
  formContainer: {
    position: 'absolute',
    right: 0,
    width: '55%',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 1,
    padding: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  formPanel: {
    width: '100%',
    alignItems: 'center',
    maxHeight: '100%',
    overflow: 'hidden',
  },
  keyClubLogoContainer: {
    width: 50, // Reduced from 60
    height: 50, // Reduced from 60
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Reduced from 15
  },
  keyClubLogo: {
    width: 50, // Reduced from 60
    height: 50, // Reduced from 60
  },
  formTitle: {
    fontSize: 24, // Reduced from 28
    fontWeight: 'bold',
    color: '#1e40af', // Key Club blue
    marginBottom: 4, // Reduced from 6
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 12, // Reduced from 13
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20, // Reduced from 25
  },
  formGroup: {
    marginBottom: 15, // Reduced from 20
    width: '100%',
  },
  label: {
    fontSize: 13, // Reduced from 14
    color: '#1e40af', // Key Club blue
    marginBottom: 6, // Reduced from 8
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8, // Reduced from 10
    paddingHorizontal: 12, // Reduced from 16
    paddingVertical: 10, // Reduced from 12
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    position: 'absolute',
    right: 12, // Reduced from 16
    fontSize: 16, // Reduced from 18
  },
  input: {
    flex: 1,
    fontSize: 14, // Reduced from 15
    color: '#1e293b',
    fontWeight: '500',
    paddingRight: 35, // Reduced from 45
  },
  forgotLink: {
    marginTop: -8, // Reduced from -12
    marginBottom: 10, // Reduced from 12
    alignSelf: 'flex-end',
  },
  forgotLinkText: {
    fontSize: 12, // Reduced from 13
    color: '#1e40af', // Key Club blue
    fontWeight: '500',
  },
  button: {
    width: '100%',
    height: 38, // Reduced from 42
    backgroundColor: '#1e40af', // Key Club blue
    borderRadius: 8, // Reduced from 10
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14, // Reduced from 15
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 6, // Reduced from 8
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  toggleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 2,
    overflow: 'hidden',
  },
  togglePanel: {
    position: 'absolute',
    width: '45%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  toggleLeft: {
    left: 0,
  },
  toggleRight: {
    right: 0,
  },
  toggleTitle: {
    fontSize: 24, // Reduced from 28
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12, // Reduced from 15
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toggleText: {
    fontSize: 12, // Reduced from 13
    color: '#fff',
    marginBottom: 12, // Reduced from 15
    textAlign: 'center',
    opacity: 0.9,
  },
  toggleButton: {
    width: 120, // Reduced from 140
    height: 36, // Reduced from 40
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fbbf24', // Key Club gold
    borderRadius: 8, // Reduced from 10
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    color: '#fbbf24', // Key Club gold
    fontSize: 14, // Reduced from 15
    fontWeight: '600',
  },
});