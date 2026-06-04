import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, ShieldCheck, ChevronDown } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Loading from './components/Loading';
import { AuthProvider, useAuth } from './context/AuthContext';
import Avatar from './components/Avatar';
import AuthModal from './components/AuthModal';
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const VerifyOtp = lazy(() => import('./pages/VerifyOtp'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));

function AppNav() {
  const { user, logout, openAuth } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-extrabold text-violet-600 tracking-tight cursor-pointer">
              WorkSphere
            </motion.div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-violet-600 transition-colors">Home</Link>
            <Link to="/about" className="hover:text-violet-600 transition-colors">About Us</Link>
            {user && <Link to="/dashboard" className="hover:text-violet-600 transition-colors">Jobs</Link>}
            {user && <Link to="/chat" className="hover:text-violet-600 transition-colors">Messages</Link>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <button onClick={() => openAuth('login')} className="text-sm font-semibold px-6 py-2.5 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-all shadow-md hover:shadow-lg">
              Sign In / Join
            </button>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Avatar name={user.name} size={32} />
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                    
                    <div className="p-2 space-y-1">
                      <Link to="/edit-profile" onClick={() => setDropdownOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                        <Settings size={16} /> Edit Profile
                      </Link>
                      
                      {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setDropdownOpen(false)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-violet-700 hover:bg-violet-50 rounded-lg transition-colors">
                          <ShieldCheck size={16} /> Admin Panel
                        </Link>
                      )}
                      
                      <div className="h-px bg-slate-100 my-1"></div>
                      
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// Protected Route Wrapper
function ProtectedRoute({ children, requireCompleteProfile = true }) {
  const { user, loading, openAuth } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !user) {
      openAuth('login');
      navigate('/', { replace: true });
    }
  }, [user, loading, openAuth, navigate]);

  if (loading) return <Loading />;
  
  if (!user) {
    return null;
  }

  // If user hasn't completed their profile, redirect to complete-profile
  if (requireCompleteProfile && !user.isProfileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <main className="w-full">
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          
          {/* Semi-Protected (Requires auth, but not completed profile) */}
          <Route 
            path="/complete-profile" 
            element={<ProtectedRoute requireCompleteProfile={false}><CompleteProfile /></ProtectedRoute>} 
          />
          <Route 
            path="/edit-profile" 
            element={<ProtectedRoute requireCompleteProfile={false}><EditProfile /></ProtectedRoute>} 
          />
          
          {/* Fully Protected Routes */}
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><Dashboard /></div></ProtectedRoute>} 
          />
          <Route 
            path="/chat" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><Chat /></div></ProtectedRoute>} 
          />
          <Route 
            path="/payment/:jobId" 
            element={<ProtectedRoute><div className="max-w-7xl mx-auto px-4 py-8"><PaymentPage /></div></ProtectedRoute>} 
          />

          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={<AdminRoute><div className="max-w-7xl mx-auto px-4 py-8"><AdminPanel /></div></AdminRoute>} 
          />
        </Routes>
      </Suspense>
    </main>
  );
}

function CookieBanner() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setAccepted(false);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 z-50 flex flex-col gap-3"
    >
      <div>
        <h4 className="font-bold text-sm">🍪 Cookie Consent</h4>
        <p className="text-xs text-slate-400 mt-1">We use cookies to optimize your platform experience, verify user sessions, and secure escrow payments.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={handleAccept} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors">
          Accept All
        </button>
      </div>
    </motion.div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
              padding: '16px',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
          <AppNav />
          <AuthModal />
          <AppRoutes />
          <CookieBanner />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
