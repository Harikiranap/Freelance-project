import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { signInWithGoogle } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Start on register if URL is /register, else login
  const [isLogin, setIsLogin] = useState(location.pathname !== '/register');
  
  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [error, setError] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  
  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // For Google Role Selection
  const [requiresRole, setRequiresRole] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const [selectedRole, setSelectedRole] = useState('client');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!isLogin && !acceptPolicies) {
      toast.error('You must accept the Privacy Policy and Cookie Consent.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (isLogin) {
        const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
        login(res.data.token, res.data, rememberMe);
        toast.success('Successfully logged in!');
        window.location.href = '/dashboard';
      } else {
        const res = await axios.post('http://localhost:5000/api/auth/register', { name, username, email, password, role });
        toast.success('Verification code sent to your email.');
        navigate('/verify-otp', { state: { email: res.data.email } });
      }
    } catch (err) {
      if (err.response?.data?.requireVerification) {
        toast.error('Please verify your email first.');
        navigate('/verify-otp', { state: { email: err.response.data.email } });
      } else {
        toast.error(err.response?.data?.message || (isLogin ? 'Login failed' : 'Registration failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setIsSubmitting(true);
    try {
      const user = await signInWithGoogle();
      const res = await axios.post('http://localhost:5000/api/auth/google', { 
        name: user.displayName, 
        email: user.email 
      });
      
      if (res.status === 202 && res.data.requiresRole) {
        setGoogleData({ name: res.data.name, email: res.data.email });
        setRequiresRole(true);
      } else {
        login(res.data.token, res.data);
        toast.success('Successfully logged in with Google!');
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Google Sign-In Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRoleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/google/complete', {
        name: googleData.name,
        email: googleData.email,
        role: selectedRole
      });
      login(res.data.token, res.data);
      toast.success('Registration complete!');
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete Google registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
      >
        {!requiresRole ? (
          <>
            {/* Toggle Header */}
            <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
              <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Log In
              </button>
              <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">I want to...</label>
                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                      <button 
                        type="button"
                        onClick={() => setRole('client')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === 'client' ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Hire (Client)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRole('freelancer')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${role === 'freelancer' ? 'bg-white shadow-sm text-blue-600 border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Work (Freelancer)
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{isLogin ? 'Email or Username' : 'Email'}</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              {!isLogin && (
                <div className="flex items-start gap-3 mt-4 mb-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <input 
                    type="checkbox"
                    id="acceptPolicies"
                    required
                    checked={acceptPolicies}
                    onChange={(e) => setAcceptPolicies(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="acceptPolicies" className="text-xs text-slate-500 leading-normal select-none cursor-pointer">
                    I accept the <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy: Your data is secure and encrypted with WorkSphere."); }} className="text-blue-600 hover:underline font-semibold">Privacy Policy</a> and consent to use cookies for session and payment verification.
                  </label>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between mt-4 mb-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-sm text-slate-600 select-none cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:underline">Forgot password?</a>
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  isLogin ? 'Log In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-3 text-slate-400 text-sm">Or</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            <button 
              onClick={handleGoogle} 
              disabled={isSubmitting}
              className="w-full mt-6 py-3 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-70"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Complete Registration</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Are you joining as a Client or a Freelancer?</p>
            
            <div className="space-y-3 mb-6">
              <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'client' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}>
                <input type="radio" className="hidden" name="role" value="client" checked={selectedRole === 'client'} onChange={(e) => setSelectedRole(e.target.value)} />
                <div className="font-semibold text-slate-900">Client</div>
                <div className="text-sm text-slate-500">I am a Client.</div>
              </label>
              
              <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'freelancer' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}>
                <input type="radio" className="hidden" name="role" value="freelancer" checked={selectedRole === 'freelancer'} onChange={(e) => setSelectedRole(e.target.value)} />
                <div className="font-semibold text-slate-900">Freelancer</div>
                <div className="text-sm text-slate-500">I am a Freelancer.</div>
              </label>
            </div>

            <button 
              onClick={handleGoogleRoleSubmit}
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 rounded-lg shadow-md transition-all disabled:opacity-70"
            >
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Continue to Dashboard'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
