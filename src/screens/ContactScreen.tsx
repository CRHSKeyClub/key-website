import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ContactScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 p-4">
      {/* Header */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/home')}
            className="p-2 text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-white">Contact Us</h1>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div 
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-8 border border-slate-600">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Get in Touch</h2>
            
            {/* Email Display */}
            <motion.div 
              className="flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
              </svg>
              
              <a 
                href="mailto:keyclubcyranch@gmail.com"
                className="text-2xl font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                keyclubcyranch@gmail.com
              </a>
              
              <p className="text-slate-400 mt-4">
                Send us an email and we'll get back to you as soon as possible!
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
