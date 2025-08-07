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
const panelWidth = screenWidth > 900 ? 450 : screenWidth * 0.5;

export default function AuthScreen({ navigation }) {
  const { loginAsStudent, registerStudent } = useAuth();
  const [isActive, setIsActive] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // State omitted for brevity — keep your state as-is...
  const [signInSNumber, setSignInSNumber] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpSNumber, setSignUpSNumber] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);

  const toggleAuthMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: isActive ? 0 : 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setIsActive(!isActive);
  };

  // handleSignIn and handleSignUp unchanged — keep those as-is...

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
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, panelWidth],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.panelContent}>
                {!isActive ? (
                  <>
                    <Text style={styles.panelTitle}>Welcome{'\n'}Back!</Text>
                    <Text style={styles.panelSubtitle}>Already have an account?</Text>
                    <Text style={styles.panelDescription}>
                      Sign in to access your Key Club account
                    </Text>
                    <TouchableOpacity style={styles.panelButton} onPress={toggleAuthMode}>
                      <Text style={styles.panelButtonText}>Login</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.panelTitle}>Hello,{'\n'}Friend!</Text>
                    <Text style={styles.panelSubtitle}>New to Key Club?</Text>
                    <Text style={styles.panelDescription}>
                      Create an account and start your journey with us
                    </Text>
                    <TouchableOpacity style={styles.panelButton} onPress={toggleAuthMode}>
                      <Text style={styles.panelButtonText}>Register</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>

            {/* Forms Container */}
            <View style={styles.formsContainer}>
              {/* Your existing Animated.View sign-in and sign-up forms stay the same */}
              {/* ... keep your forms code here ... */}
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
    height: 500,
    backgroundColor: '#fff',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  bluePanel: {
    position: 'absolute',
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: '#1e40af',
    zIndex: 10,
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
});
