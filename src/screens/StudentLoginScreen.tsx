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
  const [showPassword, setShowPassword] = useState(false);
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
      await loginAsStudent(sNumber.toLowerCase(), password);
    } catch (error) {
      console.error('Student login error:', error);
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
      const success = await registerStudent(sNumber.toLowerCase(), password, name);
      if (success) {
        // Switch to login mode after successful registration
        setIsSignUp(false);
        setSNumber('');
        setName('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="relative w-full max-w-4xl h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Sign In Form - Right Side (default) / Left Side (when signing up) */}
        <div 
          className={`absolute top-0 w-1/2 h-full bg-gradient-to-br from-yellow-50 to-yellow-100 p-12 flex flex-col justify-center transition-all duration-700 ease-in-out ${
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
                  className="text-3xl font-bold text-primary text-center mb-2"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  Create Account
                </motion.h2>
                <motion.p 
                  className="text-center text-gray-600 mb-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  Join Key Club today
                </motion.p>
                
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
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                      whileFocus={{ 
                        scale: 1.02,
                        borderColor: "#3b82f6",
                        transition: { duration: 0.2 }
                      }}
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-yellow-600 font-semibold hover:underline"
                    >
                      Sign In
                    </button>
                  </p>
                </motion.form>
              </>
            ) : (
              // Sign In Form
              <>
                <h2 className="text-3xl font-bold text-primary text-center mb-2">Sign In</h2>
                <p className="text-center text-gray-600 mb-6">Use your S-Number to access your account</p>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="s150712"
                      value={sNumber}
                      onChange={(e) => setSNumber(e.target.value)}
                      disabled={loading}
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
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
                      className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary bg-white"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-primary hover:underline font-semibold"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>

                  <p className="text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-yellow-600 font-semibold hover:underline"
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
          className={`absolute top-0 w-1/2 h-full bg-gradient-to-br from-blue-600 to-blue-800 text-white p-12 flex flex-col justify-center items-center transition-all duration-700 ease-in-out ${
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
                  className="px-12 py-3 border-2 border-yellow-400 text-yellow-400 rounded-full font-bold hover:bg-yellow-400 hover:text-blue-800 transition-all"
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
                  className="px-12 py-3 border-2 border-yellow-400 text-yellow-400 rounded-full font-bold hover:bg-yellow-400 hover:text-blue-800 transition-all"
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
          className="absolute top-4 left-4 text-gray-600 hover:text-gray-800 z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
