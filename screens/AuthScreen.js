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
                      outputRange: [-screenWidth * 1.5, screenWidth * 0.5],
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
    padding: 16,
    minHeight: screenHeight,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  authContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 700, // Reduced from 850
    height: 450, // Reduced from 550
    backgroundColor: '#fff',
    borderRadius: 25, // Reduced from 30
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 25, // Reduced from 30
    elevation: 8,
    overflow: 'hidden',
  },
  circularBackground: {
    position: 'absolute',
    width: screenWidth * 3, // 300% width like the HTML
    height: '100%',
    backgroundColor: '#1e40af', // Key Club blue
    borderRadius: screenWidth * 1.5, // 150px radius
    zIndex: 2,
  },
  formContainer: {
    position: 'absolute',
    right: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 1,
    padding: 30, // Reduced from 40
    justifyContent: 'center',
  },
  formPanel: {
    width: '100%',
    alignItems: 'center',
  },
  keyClubLogoContainer: {
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15, // Reduced from 18
  },
  keyClubLogo: {
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
  },
  formTitle: {
    fontSize: 28, // Reduced from 36
    fontWeight: 'bold',
    color: '#1e40af', // Key Club blue
    marginBottom: 6, // Reduced from 8
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 13, // Reduced from 14.5
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 25, // Reduced from 30
  },
  formGroup: {
    marginBottom: 20, // Reduced from 30
    width: '100%',
  },
  label: {
    fontSize: 14, // Reduced from 15
    color: '#1e40af', // Key Club blue
    marginBottom: 8, // Reduced from 10
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10, // Reduced from 12
    paddingHorizontal: 16, // Reduced from 20
    paddingVertical: 12, // Reduced from 15
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    position: 'absolute',
    right: 16, // Reduced from 20
    fontSize: 18, // Reduced from 20
  },
  input: {
    flex: 1,
    fontSize: 15, // Reduced from 16
    color: '#1e293b',
    fontWeight: '500',
    paddingRight: 45, // Reduced from 50
  },
  forgotLink: {
    marginTop: -12, // Reduced from -15
    marginBottom: 12, // Reduced from 15
    alignSelf: 'flex-end',
  },
  forgotLinkText: {
    fontSize: 13, // Reduced from 14.5
    color: '#1e40af', // Key Club blue
    fontWeight: '500',
  },
  button: {
    width: '100%',
    height: 42, // Reduced from 48
    backgroundColor: '#1e40af', // Key Club blue
    borderRadius: 10, // Reduced from 12
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
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8, // Reduced from 10
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  toggleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  togglePanel: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // Reduced from 40
  },
  toggleLeft: {
    left: 0,
  },
  toggleRight: {
    right: 0,
  },
  toggleTitle: {
    fontSize: 28, // Reduced from 36
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15, // Reduced from 20
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toggleText: {
    fontSize: 13, // Reduced from 14.5
    color: '#fff',
    marginBottom: 15, // Reduced from 20
    textAlign: 'center',
    opacity: 0.9,
  },
  toggleButton: {
    width: 140, // Reduced from 160
    height: 40, // Reduced from 46
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fbbf24', // Key Club gold
    borderRadius: 10, // Reduced from 12
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonText: {
    color: '#fbbf24', // Key Club gold
    fontSize: 15, // Reduced from 16
    fontWeight: '600',
  },
});