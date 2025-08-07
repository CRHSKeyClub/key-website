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
  
  // Simplified animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
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
  
  // Simplified toggle animation
  const toggleAuthMode = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsSignUpActive(!isSignUpActive);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: isSignUpActive ? 0 : 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    });
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Animated.View 
              style={[
                styles.authContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              {/* Sliding Background Panel */}
              <Animated.View 
                style={[
                  styles.slidingPanel,
                  {
                    transform: [{
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '65%'],
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.panelContent}>
                  {!isSignUpActive ? (
                    <>
                      <Text style={styles.panelTitle}>Hello, Friend!</Text>
                      <Text style={styles.panelSubtitle}>
                        New to Key Club?
                      </Text>
                      <Text style={styles.panelDescription}>
                        Create an account and start your journey with us
                      </Text>
                      <TouchableOpacity 
                        style={styles.panelButton}
                        onPress={toggleAuthMode}
                      >
                        <Text style={styles.panelButtonText}>Sign Up</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.panelTitle}>Welcome Back!</Text>
                      <Text style={styles.panelSubtitle}>
                        Already have an account?
                      </Text>
                      <Text style={styles.panelDescription}>
                        Sign in to access your Key Club account
                      </Text>
                      <TouchableOpacity 
                        style={styles.panelButton}
                        onPress={toggleAuthMode}
                      >
                        <Text style={styles.panelButtonText}>Sign In</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Animated.View>
              
              {/* Forms Container */}
              <View style={styles.formsContainer}>
                {/* Sign In Form */}
                <View style={[styles.formWrapper, !isSignUpActive ? styles.activeForm : styles.hiddenForm]}>
                  <View style={styles.form}>
                    <Image 
                      source={require('../assets/images/keyclublogo.png')} 
                      style={styles.logo}
                      resizeMode="contain"
                    />
                    
                    <Text style={styles.formTitle}>Sign In</Text>
                    <Text style={styles.formSubtitle}>Use your S-Number to access your account</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>S-Number</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="s150712"
                          placeholderTextColor="#94a3b8"
                          value={signInSNumber}
                          onChangeText={setSignInSNumber}
                          autoCapitalize="none"
                          editable={!signInLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your password"
                          placeholderTextColor="#94a3b8"
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
                      <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.submitButton, signInLoading && styles.disabledButton]}
                      onPress={handleSignIn}
                      disabled={signInLoading}
                    >
                      {signInLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Sign Up Form */}
                <View style={[styles.formWrapper, styles.signUpFormWrapper, isSignUpActive ? styles.activeForm : styles.hiddenForm]}>
                  <View style={styles.form}>
                    <Image 
                      source={require('../assets/images/keyclublogo.png')} 
                      style={styles.logo}
                      resizeMode="contain"
                    />
                    
                    <Text style={styles.formTitle}>Create Account</Text>
                    <Text style={styles.formSubtitle}>Join Key Club today</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>S-Number</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="card-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="s150712"
                          placeholderTextColor="#94a3b8"
                          value={signUpSNumber}
                          onChangeText={setSignUpSNumber}
                          autoCapitalize="none"
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Full Name</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="person-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Your full name"
                          placeholderTextColor="#94a3b8"
                          value={signUpName}
                          onChangeText={setSignUpName}
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Min. 6 characters"
                          placeholderTextColor="#94a3b8"
                          value={signUpPassword}
                          onChangeText={setSignUpPassword}
                          secureTextEntry
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm password"
                          placeholderTextColor="#94a3b8"
                          value={signUpConfirmPassword}
                          onChangeText={setSignUpConfirmPassword}
                          secureTextEntry
                          editable={!signUpLoading}
                        />
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.submitButton, signUpLoading && styles.disabledButton]}
                      onPress={handleSignUp}
                      disabled={signUpLoading}
                    >
                      {signUpLoading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>Create Account</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
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
    minHeight: screenHeight - 100,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  authContainer: {
    width: '100%',
    maxWidth: 768,
    height: 480,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  slidingPanel: {
    position: 'absolute',
    width: '35%',
    height: '100%',
    backgroundColor: '#1e40af',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  panelContent: {
    padding: 30,
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  panelSubtitle: {
    fontSize: 16,
    color: '#fbbf24',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  panelDescription: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 20,
  },
  panelButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fbbf24',
    backgroundColor: 'transparent',
  },
  panelButtonText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '600',
  },
  formsContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  formWrapper: {
    position: 'absolute',
    width: '65%',
    height: '100%',
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  signUpFormWrapper: {
    left: 'auto',
    right: 0,
  },
  activeForm: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  hiddenForm: {
    opacity: 0,
    pointerEvents: 'none',
  },
  form: {
    width: '100%',
    maxWidth: 350,
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 20,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 45,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotLinkText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
});