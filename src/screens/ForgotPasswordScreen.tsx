import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordScreen() {
  const [sNumber, setSNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sNumber.trim()) {
      alert('Please enter your S-Number');
      return;
    }

    if (!sNumber.startsWith('s')) {
      alert('Please enter a valid S-Number starting with "s"');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      alert('Password reset request submitted. Please contact your Key Club sponsor for assistance.');
      setLoading(false);
      navigate('/student-login');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleResetRequest} className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your S-Number to request a password reset</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student ID Number
            </label>
            <input
              type="text"
              placeholder="s123456"
              value={sNumber}
              onChange={(e) => setSNumber(e.target.value)}
              disabled={loading}
              className="input"
              autoFocus
            />
          </div>
          
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              After submitting, please contact your Key Club sponsor to complete the password reset process.
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary mb-4"
          >
            {loading ? 'Submitting...' : 'Request Password Reset'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/student-login')}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
