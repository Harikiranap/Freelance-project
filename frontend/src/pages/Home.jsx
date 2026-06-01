import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Zap, Lock, ArrowRight, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/jobs');
        setJobs(res.data.slice(0, 3)); // Only show top 3 jobs as preview
      } catch (err) {
        console.error("Failed to load jobs");
      }
    };
    fetchJobs();
  }, []);

  const handleJobClick = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-24 px-4 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-emerald-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-4xl"
        >
          <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 tracking-tight mb-8">
            Do great work, <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">securely.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-10 font-medium">
            WorkSphere connects top-tier Indian talent with growing businesses. AI-matched, Escrow-secured, and fully encrypted.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link to="/register" className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold shadow-2xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 flex items-center gap-2">
              Start Hiring <ArrowRight size={20} />
            </Link>
            <Link to="/register" className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold shadow-lg border border-slate-200 hover:bg-slate-50 transition-all transform hover:-translate-y-1">
              Find Work
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Live Jobs Preview Section */}
      <section className="py-20 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Live Opportunities</h2>
              <p className="text-slate-500 mt-2">Latest projects posted by verified startups.</p>
            </div>
            <Link to={user ? "/dashboard" : "/login"} className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {jobs.length > 0 ? jobs.map(job => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={job._id} 
                className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer group"
                onClick={handleJobClick}
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-slate-900">₹{job.budget.toLocaleString('en-IN')}</span>
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-200 text-slate-700 rounded-full">
                    {job.skillsRequired[0]}
                  </span>
                </div>
              </motion.div>
            )) : (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-48 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-lg mb-4"></div>
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-900 text-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why WorkSphere?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We've engineered trust directly into the platform so you can focus on building great products.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">AI Matching</h3>
              <p className="text-slate-400 leading-relaxed">Our ML algorithm instantly finds the perfect freelancer for your project needs, drastically reducing hiring time.</p>
            </div>
            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700">
              <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Escrow</h3>
              <p className="text-slate-400 leading-relaxed">Payments are held safely via Razorpay until the project is delivered and approved by the client.</p>
            </div>
            <div className="p-8 bg-slate-800 rounded-3xl border border-slate-700">
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6">
                <Lock size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3">Encrypted Chat</h3>
              <p className="text-slate-400 leading-relaxed">End-to-end encrypted real-time communication keeps your intellectual property and business discussions completely private.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 bg-slate-900 border-t border-slate-800">
        <p>&copy; {new Date().getFullYear()} WorkSphere. Built for India.</p>
      </footer>
    </div>
  );
}
