import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { signInWithGoogle } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { authModal, closeAuth, login } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  
  useEffect(() => {
    if (authModal) {
      document.body.style.overflow = 'hidden';
      setIsLogin(authModal === 'login');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [authModal]);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('client');
  const [error, setError] = useState('');
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  
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
        login(res.data.token, res.data);
        localStorage.removeItem('rememberedEmail');
        toast.success('Successfully logged in!');
        closeAuth();
      } else {
        const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password, role, phoneNumber });
        toast.success('Registration successful. You can now log in.');
        setIsLogin(true); // switch to login modal
      }
    } catch (err) {
      if (err.response?.data?.requireVerification) {
        toast.error('Please verify your email first.');
        // If we had OTP verification in modal, we'd switch state. Since it's a separate route currently,
        // we could redirect or handle it. For now, just show error.
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
        closeAuth();
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
      closeAuth();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete Google registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuth}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      ></motion.div>

      <div style={{ perspective: 1500 }} className="w-full max-w-md relative z-10 max-h-[90vh]">
        <AnimatePresence mode="wait">
          {requiresRole ? (
            <motion.div 
              key="role-selection"
              initial={{ opacity: 0, rotateX: 90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: -90 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
              className="relative backdrop-blur-xl bg-white/80 border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-8 rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100/50 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Complete Registration</h2>
              <p className="text-sm text-slate-500 text-center mb-6">Are you joining as a Client or a Freelancer?</p>
              
              <div className="space-y-4 mb-6">
                <label className={`block p-4 border rounded-xl cursor-pointer transition-all duration-300 ${selectedRole === 'client' ? 'border-blue-400 bg-blue-50/80 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-slate-200 hover:border-blue-200 bg-white/50'}`}>
                  <input type="radio" className="hidden" name="role" value="client" checked={selectedRole === 'client'} onChange={(e) => setSelectedRole(e.target.value)} />
                  <div className="font-semibold text-slate-900">Client</div>
                  <div className="text-sm text-slate-500">I am a Client.</div>
                </label>
                
                <label className={`block p-4 border rounded-xl cursor-pointer transition-all duration-300 ${selectedRole === 'freelancer' ? 'border-slate-400 bg-slate-50/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-slate-200 hover:border-slate-200 bg-white/50'}`}>
                  <input type="radio" className="hidden" name="role" value="freelancer" checked={selectedRole === 'freelancer'} onChange={(e) => setSelectedRole(e.target.value)} />
                  <div className="font-semibold text-slate-900">Freelancer</div>
                  <div className="text-sm text-slate-500">I am a Freelancer.</div>
                </label>
              </div>

              <button 
                onClick={handleGoogleRoleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 rounded-xl shadow-md transition-all disabled:opacity-70 transform hover:-translate-y-1"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : 'Continue to Dashboard'}
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, rotateY: isLogin ? -90 : 90, scale: 0.9 }}
              animate={{ opacity: 1, rotateY: 0, scale: 1 }}
              exit={{ opacity: 0, rotateY: isLogin ? 90 : -90, scale: 0.9 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
              className="relative backdrop-blur-xl bg-white/80 border border-white shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-6 md:p-8 rounded-3xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button onClick={closeAuth} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-10 shadow-sm">
                <X size={18} />
              </button>

              {/* Toggle Header */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl mb-4 backdrop-blur-md border border-slate-200/50 mt-6 md:mt-4">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign Up
                </button>
              </div>

              <h2 className="text-2xl font-extrabold text-slate-900 mb-4 text-center tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">I want to...</label>
                      <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
                        <button 
                          type="button"
                          onClick={() => setRole('client')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'client' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Hire (Client)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setRole('freelancer')}
                          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'freelancer' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Work (Freelancer)
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                        placeholder="9876543210"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{isLogin ? 'Email or Name' : 'Email'}</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400"
                    placeholder={isLogin ? "Enter email or name" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className="w-full px-3 py-2.5 rounded-xl bg-white/60 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-900 placeholder-slate-400 pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                {!isLogin && (
                  <div className="flex items-start gap-3 mt-4 mb-2 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox"
                      id="acceptPolicies"
                      required
                      checked={acceptPolicies}
                      onChange={(e) => setAcceptPolicies(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="acceptPolicies" className="text-xs text-slate-500 leading-relaxed select-none cursor-pointer">
                      I accept the <a href="#" onClick={(e) => { e.preventDefault(); alert("Privacy Policy: Your data is secure."); }} className="text-blue-600 hover:underline font-bold transition-colors">Privacy Policy</a> and consent to cookies.
                    </label>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end mt-4 mb-4">
                    <a href="#" className="text-sm font-bold text-blue-600 hover:underline transition-colors">Forgot password?</a>
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 mt-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all transform hover:-translate-y-1 disabled:opacity-70 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    isLogin ? 'Log In Securely' : 'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center">
                <div className="flex-1 border-t border-slate-200"></div>
                <span className="px-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Or continue with</span>
                <div className="flex-1 border-t border-slate-200"></div>
              </div>

              <button 
                onClick={handleGoogle} 
                disabled={isSubmitting}
                className="w-full mt-6 py-3.5 flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-bold transition-all shadow-sm disabled:opacity-70 group"
              >
                <div className="group-hover:scale-110 transition-transform">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                </div>
                Google
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
