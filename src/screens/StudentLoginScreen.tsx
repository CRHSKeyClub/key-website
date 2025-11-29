import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export default function StudentLoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [sNumber, setSNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const showPassword = false;
  const { loginAsStudent, registerStudent } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sNumber.trim() || !password.trim()) {
      alert('Please enter both S-Number and password.');
      return;
    }

    if (!sNumber.startsWith('s')) {
      alert('Please enter a valid S-Number starting with "s" (e.g., s150712).');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Starting login process for:', sNumber);
      const success = await loginAsStudent(sNumber.toLowerCase(), password);
      if (!success) {
        console.error('❌ Login failed');
        alert('Login failed. Please check your credentials or create an account.');
      }
    } catch (error: any) {
      console.error('❌ Student login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sNumber.trim() || !name.trim() || !password.trim() || !confirmPassword.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!sNumber.startsWith('s')) {
      alert('Please enter a valid S-Number starting with "s"');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Starting registration process for:', sNumber);
      const success = await registerStudent(sNumber.toLowerCase(), password, name);
      if (success) {
        console.log('✅ Registration successful, switching to login mode');
        alert('Account created successfully! You can now log in.');
        // Switch to login mode after successful registration
        setIsSignUp(false);
        setSNumber('');
        setName('');
        setPassword('');
        setConfirmPassword('');
      } else {
        console.error('❌ Registration failed');
        alert('Registration failed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      alert(`Registration failed: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Floating Background Elements */}
      <motion.div
        className="absolute top-20 left-10 w-4 h-4 bg-blue-400 rounded-full opacity-20"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute top-40 right-20 w-6 h-6 bg-green-400 rounded-full opacity-20"
        animate={{
          y: [0, 30, 0],
          x: [0, -15, 0],
          scale: [1, 0.8, 1]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      <motion.div
        className="absolute bottom-40 left-20 w-3 h-3 bg-yellow-400 rounded-full opacity-20"
        animate={{
          y: [0, -25, 0],
          x: [0, 20, 0],
          scale: [1, 1.5, 1]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      <motion.div
        className="absolute top-60 left-1/3 w-5 h-5 bg-purple-400 rounded-full opacity-20"
        animate={{
          y: [0, 40, 0],
          x: [0, -10, 0],
          scale: [1, 0.7, 1]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      />
      
      <div className="relative w-full max-w-4xl h-[600px] bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white border-opacity-20">
        {/* Sign In Form - Right Side (default) / Left Side (when signing up) */}
        <div 
          className={`absolute top-0 w-1/2 h-full bg-white bg-opacity-20 backdrop-blur-sm p-12 flex flex-col justify-center transition-all duration-700 ease-in-out ${
            isSignUp ? 'left-0' : 'left-1/2'
          }`}
        >
          <div className="max-w-md mx-auto w-full">
            {/* Logo */}
            <motion.div 
              className="flex justify-center mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                duration: 0.8, 
                type: "spring", 
                stiffness: 200 
              }}
            >
              <motion.img 
                src="/assets/images/keyclublogo.png" 
                alt="Key Club Logo"
                className="w-16 h-16"
                whileHover={{ 
                  scale: 1.1,
                  rotate: 5,
                  transition: { duration: 0.3 }
                }}
              />
            </motion.div>

            {isSignUp ? (
              // Sign Up Form
              <>
                <motion.h2 
                  className="text-3xl font-bold text-blue-400 text-center mb-2"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  Create Account
                </motion.h2>
                <motion.p 
                  className="text-center text-gray-300 mb-4"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  Join Key Club today
                </motion.p>
                <motion.div 
                  className="bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg p-3 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <p className="text-blue-200 text-sm text-center">
                    <strong>New to Key Club?</strong> Create your account here to get started!
                  </p>
                </motion.div>
                
                <motion.form 
                  onSubmit={handleSignUp} 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    <motion.input
                      type="text"
                      placeholder="S-Number"
                      value={sNumber}
                      onChange={(e) => setSNumber(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                      whileFocus={{ 
                        scale: 1.02,
                        borderColor: "#3b82f6",
                        transition: { duration: 0.2 }
                      }}
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z" />
                    </svg>
                  </motion.div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <p className="text-center text-sm text-gray-300">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-blue-400 font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.form>
              </>
            ) : (
              // Sign In Form
              <>
                <h2 className="text-3xl font-bold text-blue-400 text-center mb-2">Sign In</h2>
                <p className="text-center text-gray-300 mb-4">Use your S-Number to access your account</p>
                <div className="bg-green-600 bg-opacity-20 border border-green-500 rounded-lg p-3 mb-6">
                  <p className="text-green-200 text-sm text-center">
                    <strong>Already have an account?</strong> Sign in with your S-Number and password.
                  </p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="s150712"
                      value={sNumber}
                      onChange={(e) => setSNumber(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-white border-opacity-30 rounded-xl focus:outline-none focus:border-blue-400 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-blue-400 hover:underline font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-400 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  <p className="text-center text-sm text-gray-300">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-blue-400 font-semibold hover:underline"
                    >
                      Sign Up
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Overlay Panel - Slides between left and right */}
        <div 
          className={`absolute top-0 w-1/2 h-full bg-gradient-to-br from-blue-400 to-blue-600 text-white p-12 flex flex-col justify-center items-center transition-all duration-700 ease-in-out ${
            isSignUp ? 'left-1/2' : 'left-0'
          }`}
        >
          <div className="text-center">
            {isSignUp ? (
              // Welcome Back Panel (shown when in sign up mode)
              <>
                <h2 className="text-4xl font-bold mb-4">Welcome<br />Back!</h2>
                <p className="text-blue-100 mb-8">Already have an account?<br />Sign in to access your Key Club account</p>
                <button
                  onClick={() => setIsSignUp(false)}
                  className="px-12 py-3 border-2 border-white text-white rounded-full font-bold hover:bg-white hover:text-blue-600 transition-all"
                >
                  Sign In
                </button>
              </>
            ) : (
              // Hello Friend Panel (shown when in sign in mode)
              <>
                <h2 className="text-4xl font-bold mb-4">Hello,<br />Friend!</h2>
                <p className="text-blue-100 mb-8">New to Key Club?<br />Create an account and start your journey with us</p>
                <button
                  onClick={() => setIsSignUp(true)}
                  className="px-12 py-3 border-2 border-white text-white rounded-full font-bold hover:bg-white hover:text-blue-600 transition-all"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        {/* Back to Home Button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-white hover:text-blue-400 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
