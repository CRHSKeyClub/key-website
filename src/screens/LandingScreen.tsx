import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-8 relative overflow-hidden">
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
      
      <div className="max-w-md w-full text-center relative z-10">
        {/* Logo */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -30, scale: 0.5, rotate: -180 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            rotate: 0
          }}
          transition={{ 
            duration: 1.2, 
            ease: "easeOut"
          }}
          whileHover={{ 
            scale: 1.1,
            rotate: 5,
            transition: { duration: 0.3 }
          }}
        >
          <img 
            src="/assets/images/keyclublogo.png" 
            alt="Key Club Logo"
            className="w-48 h-48 mx-auto rounded-full"
          />
        </motion.div>

        {/* Title */}
        <motion.h1 
          className="text-4xl font-bold text-blue-400 mb-3"
          initial={{ opacity: 0, y: -20, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            textShadow: [
              "0 0 0 rgba(59, 130, 246, 0)",
              "0 0 20px rgba(59, 130, 246, 0.5)",
              "0 0 0 rgba(59, 130, 246, 0)"
            ]
          }}
          transition={{ 
            duration: 0.8, 
            delay: 0.2, 
            ease: "easeOut",
            textShadow: { 
              duration: 3, 
              repeat: Infinity,
              repeatDelay: 2
            }
          }}
          whileHover={{ 
            scale: 1.05,
            color: "#60a5fa",
            transition: { duration: 0.2 }
          }}
        >
          Cypress Ranch Key Club
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          className="text-gray-300 text-lg mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          Track events, hours, and stay connected
        </motion.p>

        {/* Buttons */}
        <div className="space-y-4 mb-8">
          {/* Student Login Button */}
          <motion.button
            onClick={() => navigate('/student-login')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.6, 
              ease: "easeOut",
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span>Student Login</span>
          </motion.button>

          {/* Admin Login Button */}
          <motion.button
            onClick={() => navigate('/admin-login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.8, 
              ease: "easeOut",
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Admin Login</span>
          </motion.button>

          {/* View Public Events Button */}
          <motion.button
            onClick={() => navigate('/public-events')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 1.0, 
              ease: "easeOut",
              type: "spring",
              stiffness: 100
            }}
            whileHover={{ 
              scale: 1.02,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <span>View Public Events</span>
          </motion.button>
        </div>

        {/* Help Text */}
        <motion.div 
          className="flex items-center justify-center gap-2 text-gray-400 text-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>Need help? Contact your Key Club sponsor</span>
        </motion.div>
      </div>
    </div>
  );
}
