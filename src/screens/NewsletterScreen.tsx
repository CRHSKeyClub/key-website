import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NewsletterScreen() {
  const navigate = useNavigate();

  const newsletters = [
    {
      id: 'aug-2025',
      title: 'Mustang Monthly!',
      month: 'August 2025',
      volume: 'Volume 4 Issue 4',
      coverImage: '/newsletters/aug-2025-cover.png',
      pdfFile: '/newsletters/August 2025 Newsletter.pdf'
    }
  ];

  const handleNewsletterClick = (newsletter: typeof newsletters[0]) => {
    // Open PDF in new tab
    window.open(newsletter.pdfFile, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800 bg-opacity-90 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Newsletters</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Page Title */}
          <motion.h2 
            className="text-3xl font-bold text-white mb-8 text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            Monthly Newsletter
          </motion.h2>

          {/* Newsletter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsletters.map((newsletter, index) => (
              <motion.div
                key={newsletter.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: 0.4 + index * 0.1, 
                  type: "spring", 
                  stiffness: 100 
                }}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.95 }}
                className="bg-slate-800 bg-opacity-60 backdrop-blur-sm rounded-xl p-6 border border-slate-600 hover:border-blue-500 transition-all duration-300 cursor-pointer group"
                onClick={() => handleNewsletterClick(newsletter)}
              >
                {/* Newsletter Cover */}
                <motion.div 
                  className="relative mb-4 overflow-hidden rounded-lg"
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                >
                  <motion.div 
                    className="aspect-[3/4] rounded-lg relative overflow-hidden"
                    whileHover={{
                      boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)"
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.img 
                      src={newsletter.coverImage} 
                      alt={`${newsletter.title} Cover`}
                      className="w-full h-full object-cover"
                      whileHover={{ 
                        scale: 1.1,
                        transition: { duration: 0.5 }
                      }}
                    />
                  </motion.div>

                  {/* Overlay on hover */}
                  <motion.div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center"
                    whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
                  >
                    <motion.div 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={{ scale: 0 }}
                      whileHover={{ 
                        scale: 1,
                        transition: { 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 20 
                        }
                      }}
                    >
                      <motion.div 
                        className="bg-white bg-opacity-90 rounded-full p-3"
                        animate={{
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      >
                        <motion.svg 
                          className="w-8 h-8 text-blue-600" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          animate={{
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </motion.svg>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Newsletter Info */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">{newsletter.title}</h3>
                  <p className="text-blue-300 text-sm mb-2">{newsletter.month}</p>
                  <p className="text-slate-400 text-xs">{newsletter.volume}</p>
                  
                  {/* Download Button */}
                  <motion.button
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View Newsletter
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Coming Soon Message */}
          {newsletters.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">📰</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Newsletters Available</h3>
              <p className="text-slate-400">Check back soon for our latest monthly newsletter!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
