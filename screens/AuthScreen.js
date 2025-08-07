import React, { useState, useRef } from 'react';
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
  const [isActive, setIsActive] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const leftPanelAnim = useRef(new Animated.Value(0)).current;
  const rightPanelAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(0)).current;
  const loginOpacity = useRef(new Animated.Value(1)).current;
  const registerOpacity = useRef(new Animated.Value(0)).current;
  
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
  
  // Toggle animation
  const toggleAuthMode = () => {
    const toValue = isActive ? 0 : 1;
    
    Animated.parallel([
      // Slide the blue background
      Animated.timing(slideAnim, {
        toValue,
        duration: 1800,
        useNativeDriver: false,
      }),
      // Move left panel
      Animated.timing(leftPanelAnim, {
        toValue,
        duration: 600,
        delay: isActive ? 1200 : 0,
        useNativeDriver: true,
      }),
      // Move right panel
      Animated.timing(rightPanelAnim, {
        toValue,
        duration: 600,
        delay: isActive ? 0 : 1200,
        useNativeDriver: true,
      }),
      // Slide forms
      Animated.timing(formSlideAnim, {
        toValue,
        duration: 1200,
        delay: 600,
        useNativeDriver: true,
      }),
      // Fade forms
      Animated.sequence([
        Animated.timing(isActive ? registerOpacity : loginOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(isActive ? loginOpacity : registerOpacity, {
          toValue: 1,
          duration: 300,
          delay: 900,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    
    setIsActive(!isActive);
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
          <View style={styles.mainContainer}>
            {/* Blue Sliding Background */}
            <Animated.View 
              style={[
                styles.slidingBackground,
                {
                  left: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-250%', '50%'],
                  }),
                }
              ]}
            />
            
            {/* Forms Container */}
            <Animated.View 
              style={[
                styles.formsWrapper,
                {
                  transform: [{
                    translateX: formSlideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -screenWidth * 0.5],
                    })
                  }]
                }
              ]}
            >
              {/* Login Form */}
              <Animated.View 
                style={[
                  styles.formBox,
                  styles.loginForm,
                  { opacity: loginOpacity }
                ]}
              >
                <Image 
                  source={require('../assets/images/keyclublogo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                
                <Text style={styles.title}>Login</Text>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="S-Number"
                    placeholderTextColor="#888"
                    value={signInSNumber}
                    onChangeText={setSignInSNumber}
                    autoCapitalize="none"
                    editable={!signInLoading}
                  />
                  <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={signInPassword}
                    onChangeText={setSignInPassword}
                    secureTextEntry
                    editable={!signInLoading}
                  />
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <TouchableOpacity 
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitBtn, signInLoading && styles.disabledBtn]}
                  onPress={handleSignIn}
                  disabled={signInLoading}
                >
                  {signInLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Login</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
              
              {/* Register Form */}
              <Animated.View 
                style={[
                  styles.formBox,
                  styles.registerForm,
                  { opacity: registerOpacity }
                ]}
              >
                <Image 
                  source={require('../assets/images/keyclublogo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                
                <Text style={styles.title}>Registration</Text>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="S-Number"
                    placeholderTextColor="#888"
                    value={signUpSNumber}
                    onChangeText={setSignUpSNumber}
                    autoCapitalize="none"
                    editable={!signUpLoading}
                  />
                  <Ionicons name="card" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#888"
                    value={signUpName}
                    onChangeText={setSignUpName}
                    editable={!signUpLoading}
                  />
                  <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry
                    editable={!signUpLoading}
                  />
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#888"
                    value={signUpConfirmPassword}
                    onChangeText={setSignUpConfirmPassword}
                    secureTextEntry
                    editable={!signUpLoading}
                  />
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                </View>
                
                <TouchableOpacity
                  style={[styles.submitBtn, signUpLoading && styles.disabledBtn]}
                  onPress={handleSignUp}
                  disabled={signUpLoading}
                >
                  {signUpLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Register</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
            
            {/* Toggle Panels */}
            <View style={styles.toggleBox}>
              {/* Left Panel */}
              <Animated.View 
                style={[
                  styles.togglePanel,
                  styles.toggleLeft,
                  {
                    transform: [{
                      translateX: leftPanelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenWidth * 0.5],
                      })
                    }]
                  }
                ]}
              >
                <Text style={styles.toggleTitle}>Hello, Welcome!</Text>
                <Text style={styles.toggleText}>Don't have an account?</Text>
                <TouchableOpacity 
                  style={styles.toggleBtn}
                  onPress={toggleAuthMode}
                >
                  <Text style={styles.toggleBtnText}>Register</Text>
                </TouchableOpacity>
              </Animated.View>
              
              {/* Right Panel */}
              <Animated.View 
                style={[
                  styles.togglePanel,
                  styles.toggleRight,
                  {
                    transform: [{
                      translateX: rightPanelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [screenWidth * 0.5, 0],
                      })
                    }]
                  }
                ]}
              >
                <Text style={styles.toggleTitle}>Welcome Back!</Text>
                <Text style={styles.toggleText}>Already have an account?</Text>
                <TouchableOpacity 
                  style={styles.toggleBtn}
                  onPress={toggleAuthMode}
                >
                  <Text style={styles.toggleBtnText}>Login</Text>
                </TouchableOpacity>
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
    backgroundColor: '#e8ecf4',
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
  mainContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 850,
    height: 550,
    backgroundColor: '#fff',
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  slidingBackground: {
    position: 'absolute',
    width: '300%',
    height: '100%',
    backgroundColor: '#1e40af',
    borderRadius: 150,
    zIndex: 2,
  },
  formsWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
  },
  formBox: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    zIndex: 1,
  },
  loginForm: {
    right: 0,
  },
  registerForm: {
    right: '50%',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  inputBox: {
    position: 'relative',
    width: '100%',
    marginVertical: 15,
  },
  input: {
    width: '100%',
    paddingVertical: 13,
    paddingLeft: 20,
    paddingRight: 50,
    backgroundColor: '#eee',
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  inputIcon: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -10,
  },
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: -10,
    marginBottom: 15,
  },
  forgotLinkText: {
    fontSize: 14.5,
    color: '#333',
  },
  submitBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#1e40af',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 10,
  },
  submitBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  toggleBox: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  togglePanel: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    padding: 20,
  },
  toggleLeft: {
    left: 0,
  },
  toggleRight: {
    right: 0,
  },
  toggleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  toggleText: {
    fontSize: 14.5,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  toggleBtn: {
    width: 160,
    height: 46,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnText: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: '600',
  },
});