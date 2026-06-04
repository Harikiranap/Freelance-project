import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function EditProfile() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phoneNumber: '',
    skills: '',
    portfolioUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/me');
        const data = res.data;
        setFormData({
          name: data.name || '',
          email: data.email || '',
          companyName: data.companyName || '',
          phoneNumber: data.phoneNumber || '',
          skills: data.skills ? data.skills.join(', ') : '',
          portfolioUrl: data.portfolioUrl || ''
        });
      } catch (err) {
        toast.error('Failed to load profile data');
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.put('http://localhost:5000/api/auth/profile', formData);
      login(res.data.token, res.data);
      toast.success('Profile updated successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.name}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
              value={formData.email}
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
            />
          </div>
          
          {user?.role === 'client' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
              />
            </div>
          )}

          {user?.role === 'freelancer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills (comma separated)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.skills}
                  onChange={(e) => setFormData({...formData, skills: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Portfolio URL</label>
                <input 
                  type="url" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.portfolioUrl}
                  onChange={(e) => setFormData({...formData, portfolioUrl: e.target.value})}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-md transition-all"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
