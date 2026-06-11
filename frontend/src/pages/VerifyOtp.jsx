import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const email = location.state?.email;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + '/api/auth/verify-otp', { email, otp });
      login(res.data.token, res.data);
      toast.success('Email verified successfully!');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!email) {
    return <div className="text-center mt-20">No email provided. Please register first.</div>;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Verify Email</h2>
          <p className="text-slate-500 text-sm">Enter the 6-digit OTP sent to {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">OTP Code</label>
            <input 
              type="text" 
              maxLength="6"
              className="w-full px-4 py-3 text-center tracking-widest text-2xl rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
          >
            {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Verify & Continue'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
