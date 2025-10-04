import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onAnimationComplete: () => void;
}

export default function SplashAnimationScreen({ onAnimationComplete }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onAnimationComplete();
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [onAnimationComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      {/* Floating Diamonds */}
      <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-yellow-500 opacity-30 rotate-45 animate-float"></div>
      <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-yellow-400 opacity-40 rotate-45 animate-float-delayed"></div>
      
      {/* Main Content */}
      <div className="text-center z-10">
        {/* Animated Key Club Logo with Glowing Rings */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer glow rings */}
          <div className="absolute w-80 h-80 rounded-full border-4 border-blue-400 opacity-20 animate-ping-slow"></div>
          <div className="absolute w-72 h-72 rounded-full border-4 border-blue-300 opacity-30 animate-pulse-slow"></div>
          <div className="absolute w-64 h-64 rounded-full border-4 border-blue-200 opacity-40 animate-pulse"></div>
          
          {/* Logo Container with Glow */}
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl animate-float">
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-40 blur-2xl"></div>
            
            {/* Key Club Logo */}
            <img 
              src="/assets/images/keyclublogo.png" 
              alt="Key Club Logo"
              className="w-32 h-32 relative z-10 drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 animate-fade-in">
          Cypress Ranch Key Club
        </h1>
        
        {/* Subtitle */}
        <p className="text-yellow-400 text-xl mb-6 font-semibold animate-fade-in-delayed">
          Caring • Our way of life
        </p>
        
        {/* Tagline Button */}
        <div className="inline-block animate-fade-in-delayed-more">
          <div className="px-8 py-3 rounded-full border-2 border-blue-400 text-blue-100 text-sm backdrop-blur-sm bg-white bg-opacity-10">
            Building Leaders • Serving Communities
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64">
        <div className="h-2 bg-blue-900 bg-opacity-50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Additional Floating Diamonds */}
      <motion.div 
        className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-yellow-300 opacity-25 rotate-45"
        animate={{
          y: [0, -20, 0],
          rotate: [45, 225, 405],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute top-1/2 right-1/3 w-5 h-5 bg-yellow-500 opacity-20 rotate-45"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
          rotate: [45, 315, 45],
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
        className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-400 opacity-30 rotate-45"
        animate={{
          y: [0, -25, 0],
          rotate: [45, 405, 45],
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
        className="absolute bottom-1/4 right-1/4 w-6 h-6 bg-green-400 opacity-20 rotate-45"
        animate={{
          y: [0, -30, 0],
          x: [0, -15, 0],
          rotate: [45, 225, 405],
          scale: [1, 0.7, 1]
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-15px) rotate(45deg); }
        }
        
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delayed {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delayed-more {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          animation-delay: 0.5s;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
        
        .animate-fade-in-delayed {
          animation: fade-in-delayed 0.8s ease-out forwards;
          animation-delay: 0.6s;
          opacity: 0;
        }
        
        .animate-fade-in-delayed-more {
          animation: fade-in-delayed-more 0.8s ease-out forwards;
          animation-delay: 0.9s;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
