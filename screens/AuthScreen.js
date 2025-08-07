import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import SupabaseService from '../services/SupabaseService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AuthScreen({ navigation }) {
  const { loginAsStudent, registerStudent } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // State
  const [signInSNumber, setSignInSNumber] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpSNumber, setSignUpSNumber] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);

  const toggleAuthMode = () => {
    console.log('Toggling auth mode:', { current: isActive, new: !isActive });
    const newValue = !isActive ? 1 : 0;
    console.log('Animation target value:', newValue);
    setIsActive(!isActive);
    
    Animated.timing(slideAnim, {
      toValue: newValue,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      console.log('Animation completed');
    });
  };

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
            {/* Sliding Blue Panel */}
            <Animated.View
              style={[
                styles.bluePanel,
                {
                  left: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 450], // Move by half the max container width (900/2)
                  }),
                },
              ]}
            >
              <View style={styles.panelContent}>
                {!isActive ? (
                  <>
                    <Text style={styles.panelTitle}>Hello,{'\n'}Friend!</Text>
                    <Text style={styles.panelSubtitle}>New to Key Club?</Text>
                    <Text style={styles.panelDescription}>
                      Create an account and start your journey with us
                    </Text>
                    <TouchableOpacity 
                      style={styles.panelButton} 
                      onPress={() => {
                        console.log('Sign Up button pressed');
                        toggleAuthMode();
                      }}
                    >
                      <Text style={styles.panelButtonText}>Sign Up</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.panelTitle}>Welcome{'\n'}Back!</Text>
                    <Text style={styles.panelSubtitle}>Already have an account?</Text>
                    <Text style={styles.panelDescription}>
                      Sign in to access your Key Club account
                    </Text>
                    <TouchableOpacity 
                      style={styles.panelButton} 
                      onPress={() => {
                        console.log('Sign In button pressed');
                        toggleAuthMode();
                      }}
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
              <Animated.View 
                style={[
                  styles.formBox,
                  styles.rightForm,
                  { 
                    opacity: slideAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 0.5, 0],
                    }),
                    zIndex: !isActive ? 5 : 1,
                  }
                ]}
              >
                <Image 
                  source={require('../assets/images/keyclublogo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                 
                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.subtitle}>Use your S-Number to access your account</Text>
                 
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
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
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
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
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
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>
                 
                <View style={styles.mobileToggle}>
                  <Text style={styles.mobileToggleText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={toggleAuthMode}>
                    <Text style={styles.mobileToggleLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
             
              {/* Sign Up Form */}
              <Animated.View 
                style={[
                  styles.formBox,
                  styles.leftForm,
                  { 
                    opacity: slideAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.5, 1],
                    }),
                    zIndex: isActive ? 5 : 1,
                  }
                ]}
              >
                <Image 
                  source={require('../assets/images/keyclublogo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                 
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join Key Club today</Text>
                 
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
                  <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
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
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                </View>
                 
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="Password (min. 6 characters)"
                    placeholderTextColor="#888"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry
                    editable={!signUpLoading}
                  />
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
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
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                </View>
                 
                <TouchableOpacity
                  style={[styles.submitBtn, signUpLoading && styles.disabledBtn]}
                  onPress={handleSignUp}
                  disabled={signUpLoading}
                >
                  {signUpLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>
                 
                <View style={styles.mobileToggle}>
                  <Text style={styles.mobileToggleText}>Already have an account? </Text>
                  <TouchableOpacity onPress={toggleAuthMode}>
                    <Text style={styles.mobileToggleLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
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
    maxWidth: 900,
    height: 600,
    backgroundColor: '#fff',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'visible',
    alignSelf: 'center',
  },
  bluePanel: {
    position: 'absolute',
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#1e40af',
    zIndex: 10,
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
  },
  panelContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  panelTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 38,
  },
  panelSubtitle: {
    fontSize: 16,
    color: '#fbbf24',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  panelDescription: {
    fontSize: 14,
    color: '#fff',
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
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  formBox: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 25,
  },
  leftForm: {
    left: 0,
  },
  rightForm: {
    right: 0,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputBox: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 15,
    paddingRight: 45,
    fontSize: 14,
    color: '#1e293b',
  },
  inputIcon: {
    position: 'absolute',
    right: 15,
    top: 12,
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
  submitBtn: {
    width: '100%',
    backgroundColor: '#1e40af',
    borderRadius: 10,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  mobileToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  mobileToggleText: {
    fontSize: 14,
    color: '#64748b',
  },
  mobileToggleLink: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
  },
});