import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentVerificationScreen() {
  const [sNumber, setSNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVerify = async (e: React.FormEvent) => {
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
    // Simulate verification
    setTimeout(() => {
      navigate('/student-registration', { state: { sNumber } });
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleVerify} className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Verify Student ID</h1>
            <p className="text-gray-600">Enter your S-Number to create an account</p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="sNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Student ID Number
            </label>
            <input
              id="sNumber"
              type="text"
              placeholder="s123456"
              value={sNumber}
              onChange={(e) => setSNumber(e.target.value)}
              disabled={loading}
              className="input"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary mb-4"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/student-login')}
            className="w-full text-sm text-gray-600 hover:text-gray-800"
          >
            Already have an account? Log in
          </button>
        </form>
      </div>
    </div>
  );
}
