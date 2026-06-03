import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ShieldCheck, Zap, Lock, ArrowRight, Briefcase, Calculator, Award, Sparkles, TrendingUp, Users, ChevronRight, Video, FileText, MonitorPlay, MessageSquare, CheckCircle2, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Custom 3D Particle Mesh Canvas Component
function InteractiveMesh() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const particles = [];
    const maxParticles = 60;
    const connectionDist = 120;
    const mouse = { x: null, y: null, radius: 150 };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 2.5 + 1.5;
      }

      update() {
        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Mouse interaction (push away gently)
        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x += (dx / dist) * force * 2;
            this.y += (dy / dist) * force * 2;
          }
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.45)'; // Soft blue
        ctx.fill();
      }
    }

    // Initialize
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grids/isometric lines in background
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.lineWidth = 0.5;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & Draw particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Draw lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`; // Indigo lines
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}

export default function Home() {
  const [jobs, setJobs] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pricing Estimator State
  const [estimateCategory, setEstimateCategory] = useState('Web Design');
  const [estimateBudget, setEstimateBudget] = useState(40000);
  const platformFee = Math.round(estimateBudget * 0.02);
  const totalInvoice = estimateBudget + platformFee;

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

  const categoriesData = [
    { name: 'Web Design', icon: <Briefcase className="text-blue-600" size={20} />, desc: 'Next.js, Tailwind layouts, landing pages, and interactive WebGL assets.', count: '140+ Projects' },
    { name: 'Video Editing', icon: <Video className="text-indigo-600" size={20} />, desc: 'SaaS promos, corporate reviews, color grading, SFX, and product tutorials.', count: '85+ Projects' },
    { name: 'Reels Making', icon: <MonitorPlay className="text-purple-600" size={20} />, desc: 'High retention captions, fast-paced transitions, TikTok, and YouTube Shorts.', count: '220+ Projects' },
    { name: 'Copywriting', icon: <FileText className="text-emerald-600" size={20} />, desc: 'High-converting ad copies, landing pages, sales sequences, and blogs.', count: '95+ Projects' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center py-20 px-4 overflow-hidden border-b border-slate-100 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        
        {/* Interactive 3D particle node network background */}
        <InteractiveMesh />
        
        {/* Futuristic Glowing light-theme shapes */}
        <div className="absolute top-1/4 left-1/10 w-72 h-72 bg-gradient-to-tr from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl opacity-60 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-gradient-to-tr from-purple-400/10 to-pink-400/10 rounded-full blur-3xl opacity-60 animate-pulse animation-delay-2000"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl space-y-8"
        >
          {/* Tagline */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200/80 shadow-md backdrop-blur-sm">
            <Sparkles className="text-blue-500" size={14} />
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">Decentralized Escrow Talent Portal</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tight leading-none">
            Where elite talent <br />
            meets <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">frictionless trust.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
            WorkSphere connects top-tier designers, creators, and marketers. Secured by automated digital contracts, 2% platform fees, and real-time bank escrow vaults.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl hover:shadow-blue-500/20 transition-all transform hover:-translate-y-1 flex items-center gap-2">
              Start Hiring <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="px-8 py-4 bg-white text-slate-800 rounded-2xl font-bold shadow-lg border border-slate-200 hover:bg-slate-100/80 transition-all transform hover:-translate-y-1">
              Find Freelance Work
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Categories & Freelance Marketing focus */}
      <section className="py-24 bg-white relative z-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-extrabold text-blue-600 tracking-widest uppercase bg-blue-50 px-3 py-1 rounded-full">Core Disciplines</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Harness elite creative and tech categories</h2>
            <p className="text-slate-500">Every project is secured with automatic payments escrowed before the deliverables begin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoriesData.map((cat, idx) => (
              <motion.div
                key={cat.name}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="p-6 bg-slate-50/50 hover:bg-white rounded-3xl border border-slate-200/60 hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    {cat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">{cat.desc}</p>
                </div>
                <div className="mt-6 flex justify-between items-center text-xs font-semibold text-slate-400">
                  <span>{cat.count}</span>
                  <ChevronRight size={16} />
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Live Jobs Preview Section */}
      <section className="py-24 bg-slate-50/50 relative z-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Active Board</span>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vetted opportunities in market</h2>
              <p className="text-slate-500">Apply to live freelance jobs posted by verified firms.</p>
            </div>
            <Link to={user ? "/dashboard" : "/login"} className="text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-4 py-2.5 rounded-xl text-sm transition-all hover:shadow-md">
              View All Projects <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {jobs.length > 0 ? jobs.map(job => (
              <motion.div 
                whileHover={{ y: -5 }}
                key={job._id} 
                className="bg-white p-6 rounded-3xl border border-slate-200/70 shadow-sm cursor-pointer group hover:shadow-xl transition-all flex flex-col justify-between min-h-[220px]"
                onClick={handleJobClick}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full uppercase tracking-wider">
                      {job.category || 'Freelance'}
                    </span>
                    <span className="text-base font-extrabold text-slate-900">₹{job.budget.toLocaleString('en-IN')}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">{job.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-4">{job.description}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold">{job.client?.companyName || 'Verified Client'}</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                    {job.skillsRequired && job.skillsRequired[0] ? job.skillsRequired[0] : 'React'}
                  </span>
                </div>
              </motion.div>
            )) : (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 h-52 animate-pulse">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg mb-4"></div>
                  <div className="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Interactive Platform Fee & Cost Estimator Widget */}
      <section className="py-24 bg-white relative z-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Widget Copy */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Transparent Pricing</span>
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                No hidden fees. <br />Only a <span className="text-blue-600 font-black">2.0% platform fee</span>.
              </h2>
              <p className="text-slate-500 leading-relaxed font-medium">
                We believe in extreme pricing transparency. Clients pay a flat 2.0% facilitation fee on top of the freelancer's agreed bid to secure the bank escrow, while the freelancer receives 100% of their proposal quote.
              </p>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={12} /></div>
                  <span className="text-sm font-semibold text-slate-700">Funds released only after milestone approval</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={12} /></div>
                  <span className="text-sm font-semibold text-slate-700">Digital receipt generation with tax itemization</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={12} /></div>
                  <span className="text-sm font-semibold text-slate-700">Razorpay secure integration & payment simulation</span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Widget */}
            <div className="lg:col-span-6">
              <motion.div 
                whileHover={{ y: -3 }}
                className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-2xl relative overflow-hidden"
              >
                {/* Visual grid background details */}
                <div className="absolute inset-0 bg-grid-slate-100 opacity-20 pointer-events-none"></div>

                <div className="relative z-10 space-y-6">
                  <h3 className="text-xl font-extrabold text-slate-950 flex items-center gap-2">
                    <Calculator className="text-blue-600" size={20} /> Fee Estimator
                  </h3>
                  
                  {/* Category Dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Project Category</label>
                    <select 
                      value={estimateCategory} 
                      onChange={(e) => setEstimateCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 text-sm"
                    >
                      <option value="Web Design">Web Design & Dev</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Reels Making">Reels & TikTok Editing</option>
                      <option value="Copywriting">Copywriting & Blogs</option>
                      <option value="Digital Marketing">Digital Marketing Campaigns</option>
                      <option value="SEO Optimization">SEO & Technical Audits</option>
                    </select>
                  </div>

                  {/* Budget Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freelancer Proposal Bid</label>
                      <span className="font-extrabold text-blue-600 text-base">₹{estimateBudget.toLocaleString('en-IN')}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5000" 
                      max="200000" 
                      step="5000"
                      value={estimateBudget}
                      onChange={(e) => setEstimateBudget(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
                      <span>₹5,000</span>
                      <span>₹2,00,000</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 font-mono text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>FREELANCER BID AMOUNT:</span>
                      <span className="font-bold text-slate-800">₹{estimateBudget.toLocaleString('en-IN')}.00</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>PLATFORM FACILITATION (2%):</span>
                      <span className="font-bold text-slate-800">₹{platformFee.toLocaleString('en-IN')}.00</span>
                    </div>
                    <div className="border-t border-dashed border-slate-200 w-full my-2"></div>
                    <div className="flex justify-between text-sm font-black text-slate-900">
                      <span>CLIENT TOTAL BILLING:</span>
                      <span>₹{totalInvoice.toLocaleString('en-IN')}.00</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-center text-slate-400 font-semibold leading-relaxed">
                    💸 Freelancer receives the full ₹{estimateBudget.toLocaleString('en-IN')}. platform fee covers payment gateways & escrow insurance.
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust & Escrow Features Redesign - Light Theme */}
      <section className="py-24 bg-slate-50/50 relative z-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Platform Core Safeguards</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Trust built directly into the codebase</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We protect client investments and freelancer labor with military-grade safety systems.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            
            <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 border border-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <Zap size={22} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Vetted Matching</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">Our system ensures freelancers are fully approved by moderators before they submit proposal bids on open jobs.</p>
              </div>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Escrow Security</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">Payments are deposited to secure virtual accounts via Razorpay before contract kickoff. Funds are released only after client audit.</p>
              </div>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 border border-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
                  <Lock size={22} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Encrypted Chat</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">All communications are encrypted. The workspace alerts users automatically if they attempt to share contact/payment details outside the system.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white relative z-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Global Reviews</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">Trusted by Indian Founders and Creators</h2>
            <p className="text-slate-500 max-w-xl mx-auto">See how agencies scale Web and Marketing operations with secure escrow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-500"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"Securing ₹50,000 for a React landing page used to be stressful. With WorkSphere's Escrow funding, I know the client has deposited the cash before I lay down a single line of code."</p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Rohit Mehta</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Full Stack Dev, Bangalore</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-500"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"Hired a reels editor and funded ₹15k escrow. The thermal receipt bill looked so professional! Once he delivered, the video went viral and I released the payment. Incredible platform."</p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Anisha Gupta</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Founder, FinScale media</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-500"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"The 2.0% platform fee is the lowest in the market. The interactive pricing calculator on the homepage is completely transparent. Highly recommended for small startups."</p>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Sameer Sen</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">CTO, EduSpark India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Light Theme */}
      <footer className="py-12 bg-slate-50 text-slate-500 text-center border-t border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="text-base font-extrabold text-blue-600 tracking-tight">WorkSphere</div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} WorkSphere. Built with cryptographic verification. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Escrow Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
