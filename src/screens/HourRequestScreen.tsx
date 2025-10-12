import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHours } from '../contexts/HourContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import CustomDatePicker from '../components/CustomDatePicker';

interface HourRequestData {
  studentSNumber: string;
  studentName: string;
  eventName: string;
  eventDate: string;
  hoursRequested: string;
  description: string;
}

export default function HourRequestScreen() {
  const navigate = useNavigate();
  const { getStudentHours, submitHourRequest } = useHours();
  const { user } = useAuth();
  const { showModal } = useModal();
  
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [hoursRequested, setHoursRequested] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentHours, setCurrentHours] = useState(0);
  
  // Image state
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Animation states
  const [submittingStage, setSubmittingStage] = useState('');

  useEffect(() => {
    if (user?.sNumber) {
      loadCurrentHours();
    }
  }, [user]);

  const loadCurrentHours = async () => {
    if (user?.sNumber) {
      try {
        const hours = await getStudentHours(user.sNumber);
        setCurrentHours(hours);
      } catch (error) {
        console.error('Failed to load current hours:', error);
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // File input handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  // Convert image to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  // Submit hour request
  const handleSubmitRequest = async () => {
    console.log('🚀 handleSubmitRequest called');
    
    // Validate input
    if (!eventName.trim() || !hoursRequested.trim() || !description.trim()) {
      showModal({
        title: 'Error',
        message: 'Please fill in all required fields',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    // Validate photo is required
    if (!image) {
      showModal({
        title: 'Photo Required',
        message: 'Please upload a proof photo for your hour request. This helps verify your volunteer work.',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'camera',
        iconColor: '#ff4d4d'
      });
      return;
    }

    const hours = parseFloat(hoursRequested);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      showModal({
        title: 'Error',
        message: 'Please enter a valid number of hours (0.1 - 24.0)',
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
      return;
    }

    console.log('✅ Validation passed');

    try {
      setLoading(true);
      setSubmittingStage('processing');
      
      const requestData: HourRequestData = {
        studentSNumber: user!.sNumber,
        studentName: user!.name || user!.sNumber,
        eventName: eventName.trim(),
        eventDate: eventDate.toISOString().split('T')[0],
        hoursRequested: hours.toString(),
        description: description.trim()
      };

      // Add delay to show processing stage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmittingStage('saving');
      
      let imageData = null;
      if (image) {
        try {
          imageData = await convertImageToBase64(image);
          console.log('✅ Image converted to base64');
        } catch (error) {
          console.error('❌ Image conversion failed:', error);
        }
      }

      // Submit to backend via HourContext
      await submitHourRequest({
        ...requestData,
        imageData: imageData
      });
      
      if (imageData) {
        setSubmittingStage('uploading');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setSubmittingStage('completing');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('🎉 Request successful!');
      
      showModal({
        title: 'Success',
        message: `Your request for ${hours} hours has been submitted successfully!`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'checkmark-circle',
        iconColor: '#4CAF50'
      });
      
      // Clear form
      setEventName('');
      setHoursRequested('');
      setDescription('');
      setImage(null);
      setImagePreview(null);
      
      // Refresh current hours
      try {
        const updatedHours = await getStudentHours(user.sNumber);
        setCurrentHours(updatedHours);
      } catch (error) {
        console.error('Failed to refresh hours:', error);
      }
      
    } catch (error) {
      console.error('💥 handleSubmitRequest caught error:', error);
      showModal({
        title: 'Error',
        message: `Unexpected error: ${error.message}`,
        onCancel: () => {},
        onConfirm: () => {},
        cancelText: '',
        confirmText: 'OK',
        icon: 'alert-circle',
        iconColor: '#ff4d4d'
      });
    } finally {
      setLoading(false);
      setSubmittingStage('');
    }
  };

  // Calculate progress percentage (assuming 20 hours goal)
  const goalHours = 20;
  const progressPercentage = Math.min((currentHours / goalHours) * 100, 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7 }}
        className="bg-slate-800 bg-opacity-80 border-b border-slate-700 py-6 px-6"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/home')} 
            className="p-2 text-blue-400 hover:text-blue-300 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-blue-400">Request Hours</h1>
        </div>
      </motion.div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Current Hours Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-slate-600"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-blue-400 font-bold text-lg">Your Current Hours</h3>
                <p className="text-3xl font-bold text-white">{currentHours.toFixed(1)}</p>
                <p className="text-slate-400 text-sm">Goal: {goalHours} hours</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-center text-slate-400 text-sm mt-2">
                {Math.round(progressPercentage)}% Complete
              </p>
            </div>
          </motion.div>

          {/* Form Container */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-slate-700 bg-opacity-40 backdrop-blur-sm rounded-2xl p-6 border border-slate-600"
          >
            <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">Submit Hour Request</h2>
            
            <div className="space-y-6">
              {/* Event Name */}
              <div>
                <label className="block text-blue-400 font-bold mb-2">Event/Activity Name *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Community Cleanup, Food Drive"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Event Date - Custom Date Picker */}
              <div>
                <label className="block text-blue-400 font-bold mb-2">Event Date *</label>
                <CustomDatePicker
                  value={eventDate}
                  onChange={setEventDate}
                  placeholder="Pick event date"
                  className="w-full"
                />
              </div>
              
              {/* Hours Requested */}
              <div>
                <label className="block text-blue-400 font-bold mb-2">Hours Requested *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="24"
                  value={hoursRequested}
                  onChange={(e) => setHoursRequested(e.target.value)}
                  placeholder="e.g., 2.5"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-blue-400 font-bold mb-2">Description/Details *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you did during this volunteer activity..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
              
              {/* Photo Upload */}
              <div>
                <label className="block text-blue-400 font-bold mb-2">Upload Proof Photo *</label>
                
                {!image ? (
                  <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <svg className="w-12 h-12 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-blue-400 font-medium">Select Photo</p>
                    </label>
                  </div>
                ) : (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <img 
                      src={imagePreview || ''} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={removeImage}
                        className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                      
                      <label htmlFor="image-upload" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Change
                      </label>
                    </div>
                  </div>
                )}
                
                <p className="text-slate-400 text-sm mt-2">
                  A proof photo is required to verify your volunteer work.
                </p>
              </div>

              {/* Submit Button */}
              <motion.button
                onClick={handleSubmitRequest}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {submittingStage === 'processing' && 'Processing...'}
                    {submittingStage === 'saving' && 'Saving...'}
                    {submittingStage === 'uploading' && 'Uploading...'}
                    {submittingStage === 'completing' && 'Finishing...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Submit Request
                  </>
                )}
              </motion.button>
              
              {/* View Requests Button */}
              <button
                onClick={() => navigate('/student-hour-requests')}
                className="w-full border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>View My Requests</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}