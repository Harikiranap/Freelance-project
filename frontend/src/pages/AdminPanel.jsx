import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  Users, 
  Briefcase, 
  LayoutDashboard, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Search, 
  ShieldCheck, 
  DollarSign, 
  TrendingUp, 
  Activity,
  UserCheck,
  UserX,
  FileText,
  Menu
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'jobs', 'payments'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobApprovalFilter, setJobApprovalFilter] = useState('all');

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');

  // Interactive Chart Tooltip State
  const [activeTooltip, setActiveTooltip] = useState(null);

  const getHeaders = () => {
    const token = sessionStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: getHeaders()
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load admin stats. Please verify your administrator privileges.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This is irreversible.")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
        headers: getHeaders()
      });
      toast.success("User deleted successfully");
      fetchStats();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job? This is irreversible.")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/jobs/${id}`, {
        headers: getHeaders()
      });
      toast.success("Job deleted successfully");
      fetchStats();
    } catch (err) {
      toast.error("Failed to delete job");
    }
  };

  const approveJob = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/jobs/${id}/approve`, {}, {
        headers: getHeaders()
      });
      toast.success("Job approved and published!");
      fetchStats();
    } catch (err) {
      toast.error("Failed to approve job");
    }
  };

  const approveFreelancer = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/approve-freelancer/${id}`, {}, {
        headers: getHeaders()
      });
      toast.success("Freelancer verified successfully!");
      fetchStats();
    } catch (err) {
      toast.error("Failed to approve freelancer");
    }
  };

  const revokeFreelancer = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/revoke-freelancer/${id}`, {}, {
        headers: getHeaders()
      });
      toast.success("Freelancer verification revoked.");
      fetchStats();
    } catch (err) {
      toast.error("Failed to revoke freelancer verification");
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-center py-20 text-red-500 font-semibold">{error}</div>;

  // Filter logic
  const filteredUsers = (stats?.users || []).filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || 
                          (userStatusFilter === 'approved' && u.isFreelancerApproved) || 
                          (userStatusFilter === 'pending' && u.role === 'freelancer' && !u.isFreelancerApproved);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const filteredJobs = (stats?.jobs || []).filter(j => {
    const clientName = j.client?.name || '';
    const matchesSearch = j.title.toLowerCase().includes(jobSearch.toLowerCase()) || 
                          clientName.toLowerCase().includes(jobSearch.toLowerCase());
    const matchesStatus = jobStatusFilter === 'all' || j.status === jobStatusFilter;
    const matchesApproval = jobApprovalFilter === 'all' || 
                            (jobApprovalFilter === 'approved' && j.isApproved) || 
                            (jobApprovalFilter === 'pending' && !j.isApproved);
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const filteredPayments = (stats?.payments || []).filter(p => {
    const clientName = p.client?.name || '';
    const freelancerName = p.freelancer?.name || '';
    const jobTitle = p.job?.title || '';
    const matchesSearch = clientName.toLowerCase().includes(paymentSearch.toLowerCase()) || 
                          freelancerName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                          jobTitle.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                          (p.razorpayOrderId || '').toLowerCase().includes(paymentSearch.toLowerCase());
    const matchesStatus = paymentStatusFilter === 'all' || p.status === paymentStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate total escrow volume and platform fees from payments list dynamically on the client side
  const fundedPaymentsForCalc = (stats?.payments || []).filter(p => p.status === 'escrow_funded' || p.status === 'released');
  const clientTotalEscrowVolume = fundedPaymentsForCalc.reduce((sum, p) => sum + (p.amount || 0), 0);
  const clientPlatformFees = fundedPaymentsForCalc.reduce((sum, p) => sum + (p.platformFee || 0), 0);

  // Calculate Chart Coordinates
  const getAreaChartPoints = () => {
    const rawData = [...(stats?.payments || [])]
      .filter(p => p.status === 'escrow_funded' || p.status === 'released')
      .reverse();

    // Default mock historical trend if transaction list is sparse
    const mockData = [
      { label: 'Jan', value: 2000 },
      { label: 'Feb', value: 4500 },
      { label: 'Mar', value: 8000 },
      { label: 'Apr', value: 12000 },
      { label: 'May', value: clientTotalEscrowVolume * 0.7 || 18000 },
      { label: 'Jun', value: clientTotalEscrowVolume || 25000 }
    ];

    const data = rawData.length > 2 ? rawData.map((p, idx) => ({
      label: new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: p.amount
    })) : mockData;

    const maxVal = Math.max(...data.map(d => d.value), 1000);
    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = data.map((d, idx) => {
      const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (d.value / maxVal) * chartHeight;
      return { x, y, label: d.label, value: d.value };
    });

    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
    }

    return { points, linePath, areaPath, width, height, maxVal, chartHeight, paddingTop, paddingLeft, chartWidth };
  };

  const chartInfo = getAreaChartPoints();

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 min-h-[calc(100vh-64px)] relative">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Section */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-600 flex flex-col justify-between p-6 border-r border-slate-200/80 transition-transform duration-300 transform md:translate-x-0 md:static md:h-[calc(100vh-64px)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex-shrink-0`}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25">
              W
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-lg tracking-tight">WorkSphere</span>
              <span className="block text-[10px] text-blue-600 font-bold uppercase tracking-wider">Admin Engine</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'overview' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <LayoutDashboard size={18} />
              Overview Console
            </button>

            <button
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Users size={18} />
                Manage Users
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'users' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.userCount || 0}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('jobs'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'jobs' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Briefcase size={18} />
                Manage Projects
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'jobs' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.jobCount || 0}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${activeTab === 'payments' ? 'bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm' : 'hover:bg-slate-50 hover:text-slate-900 text-slate-500'}`}
            >
              <span className="flex items-center gap-3">
                <Receipt size={18} />
                Financial Orders
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'payments' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {stats?.paymentCount || 0}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-slate-100 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            AD
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Security Guard</p>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Admin Authorization
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-[calc(100vh-64px)]">
        {/* Header Navigation */}
        <header className="bg-white border-b border-slate-150 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center">
            {/* Hamburger Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors mr-2"
              title="Toggle Menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 capitalize tracking-tight">{activeTab} Dashboard</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time system health checks & dispute settlement console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> API: Live
            </span>
          </div>
        </header>

        {/* Content Tabs Switcher */}
        <div className="flex-1 p-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Escrow Volume</p>
                      <p className="text-2xl font-black text-slate-900">₹{clientTotalEscrowVolume.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                        <TrendingUp size={12} /> Real-time active deposits
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <DollarSign size={22} />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Commissions</p>
                      <p className="text-2xl font-black text-slate-900">₹{clientPlatformFees.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-500 font-bold">5% Escrow commission rate</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <TrendingUp size={22} />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Contracts</p>
                      <p className="text-2xl font-black text-slate-900">{(stats?.jobs || []).filter(j => j.status === 'in-progress' || j.status === 'delivered').length}</p>
                      <p className="text-[10px] text-amber-500 font-bold">{(stats?.jobs || []).filter(j => j.status === 'delivered').length} waiting for client approval</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Activity size={22} />
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registered Accounts</p>
                      <p className="text-2xl font-black text-slate-900">{stats?.userCount || 0}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Clients & Verified Freelancers</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users size={22} />
                    </div>
                  </div>
                </div>

                {/* Charts Segment */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Area Chart Component */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Escrow Transaction Trends</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Chronological representation of funded transaction values</p>
                    </div>

                    <div className="relative pt-4 flex justify-center">
                      <svg width="100%" height={chartInfo.height} viewBox={`0 0 ${chartInfo.width} ${chartInfo.height}`} className="overflow-visible">
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00"/>
                          </linearGradient>
                        </defs>

                        {/* Y-axis gridlines & labels */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                          const y = chartInfo.paddingTop + chartInfo.chartHeight * (1 - ratio);
                          const val = Math.round(chartInfo.maxVal * ratio);
                          return (
                            <g key={index} className="opacity-40">
                              <line 
                                x1={chartInfo.paddingLeft} 
                                y1={y} 
                                x2={chartInfo.width - 20} 
                                y2={y} 
                                stroke="#cbd5e1" 
                                strokeDasharray="4 4"
                              />
                              <text 
                                x={chartInfo.paddingLeft - 10} 
                                y={y + 4} 
                                fill="#64748b" 
                                fontSize="10" 
                                fontWeight="bold" 
                                textAnchor="end"
                              >
                                ₹{val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Area */}
                        {chartInfo.areaPath && (
                          <path d={chartInfo.areaPath} fill="url(#areaGrad)" />
                        )}

                        {/* Chart Line */}
                        {chartInfo.linePath && (
                          <path 
                            d={chartInfo.linePath} 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="3.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                          />
                        )}

                        {/* Interactive Nodes */}
                        {chartInfo.points.map((p, idx) => (
                          <g 
                            key={idx}
                            onMouseEnter={() => setActiveTooltip(p)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className="cursor-pointer"
                          >
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="5" 
                              fill="#ffffff" 
                              stroke="#3b82f6" 
                              strokeWidth="3"
                              className="transition-all hover:r-7"
                            />
                            {/* Hover highlight circle */}
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r="12" 
                              fill="#3b82f6" 
                              opacity="0" 
                              className="hover:opacity-10 transition-opacity"
                            />
                          </g>
                        ))}

                        {/* X-axis labels */}
                        {chartInfo.points.map((p, idx) => (
                          <text 
                            key={idx}
                            x={p.x} 
                            y={chartInfo.height - 15} 
                            fill="#94a3b8" 
                            fontSize="10" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            {p.label}
                          </text>
                        ))}
                      </svg>

                      {/* Tooltip Overlay */}
                      {activeTooltip && (
                        <div 
                          className="absolute bg-slate-900 text-white rounded-xl px-3 py-2 shadow-xl border border-slate-700 pointer-events-none text-left space-y-0.5 transition-all"
                          style={{
                            left: `${(activeTooltip.x / chartInfo.width) * 100}%`,
                            top: `${(activeTooltip.y / chartInfo.height) * 80}%`,
                            transform: 'translate(-50%, -115%)'
                          }}
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{activeTooltip.label}</p>
                          <p className="text-xs font-black text-blue-400">₹{activeTooltip.value.toLocaleString('en-IN')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pie / Donut Chart Statuses */}
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Project Breakdown</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Distribution of platform jobs by project status</p>
                    </div>

                    <div className="flex justify-center items-center py-2 relative">
                      {/* Donut Draw */}
                      {(() => {
                        const statusCounts = [
                          { label: 'Open', count: (stats?.jobs || []).filter(j => j.status === 'open').length, color: '#3b82f6' },
                          { label: 'Hired', count: (stats?.jobs || []).filter(j => j.status === 'in-progress').length, color: '#f59e0b' },
                          { label: 'Delivered', count: (stats?.jobs || []).filter(j => j.status === 'delivered').length, color: '#6366f1' },
                          { label: 'Completed', count: (stats?.jobs || []).filter(j => j.status === 'completed').length, color: '#10b981' }
                        ];

                        const total = statusCounts.reduce((acc, c) => acc + c.count, 0);

                        if (total === 0) {
                          return (
                            <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                              NO PROJECTS
                            </div>
                          );
                        }

                        let accumulatedPercent = 0;
                        const r = 36;
                        const c = 2 * Math.PI * r; // 226.19

                        return (
                          <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                              {statusCounts.map((s, idx) => {
                                const percent = s.count / total;
                                const strokeDasharray = `${percent * c} ${c}`;
                                const strokeDashoffset = -accumulatedPercent * c;
                                accumulatedPercent += percent;

                                if (s.count === 0) return null;

                                return (
                                  <circle
                                    key={idx}
                                    cx="50"
                                    cy="50"
                                    r={r}
                                    fill="transparent"
                                    stroke={s.color}
                                    strokeWidth="10"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    className="transition-all hover:stroke-width-12"
                                  />
                                );
                              })}
                            </svg>
                            <div className="absolute text-center">
                              <span className="block text-2xl font-black text-slate-900">{total}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Open ({(stats?.jobs || []).filter(j => j.status === 'open').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Hired ({(stats?.jobs || []).filter(j => j.status === 'in-progress').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Delivered ({(stats?.jobs || []).filter(j => j.status === 'delivered').length})
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Done ({(stats?.jobs || []).filter(j => j.status === 'completed').length})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlight/Disputes Quick Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm mb-4">Pending Approvals Queue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pending Freelancers Info */}
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Pending Freelancer Approvals</h4>
                        <p className="text-xl font-black text-blue-700 mt-1">{(stats?.users || []).filter(u => u.role === 'freelancer' && !u.isFreelancerApproved).length}</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('users'); setUserStatusFilter('pending'); }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Review
                      </button>
                    </div>

                    {/* Pending Jobs Info */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Pending Job Moderations</h4>
                        <p className="text-xl font-black text-slate-700 mt-1">{(stats?.jobs || []).filter(j => !j.isApproved).length}</p>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('jobs'); setJobApprovalFilter('pending'); }}
                        className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-[10px] transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users by name or email..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={userRoleFilter}
                      onChange={e => setUserRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Roles</option>
                      <option value="client">Clients</option>
                      <option value="freelancer">Freelancers</option>
                      <option value="admin">Administrators</option>
                    </select>

                    <select
                      value={userStatusFilter}
                      onChange={e => setUserStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Verification Statuses</option>
                      <option value="approved">Approved Freelancers</option>
                      <option value="pending">Pending Approval</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">User Details</th>
                          <th className="p-4">Contact Info</th>
                          <th className="p-4">Verification Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No users match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => (
                            <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase text-xs">
                                  {u.name.substring(0,2)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                    {u.name}
                                    {u.role === 'admin' && (
                                      <span className="bg-purple-100 text-purple-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">ADMIN</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{u.role}</p>
                                </div>
                              </td>
                              <td className="p-4 text-slate-500 font-medium">
                                <p>{u.email}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{u.phoneNumber || 'No phone'}</p>
                              </td>
                              <td className="p-4">
                                {u.role === 'freelancer' ? (
                                  u.isFreelancerApproved ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                      <UserCheck size={10} /> Verified
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                      <UserX size={10} /> Pending Approval
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400 text-[10px]">N/A (Client)</span>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {u.role === 'freelancer' && (
                                    !u.isFreelancerApproved ? (
                                      <button 
                                        onClick={() => approveFreelancer(u._id)} 
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                      >
                                        Approve Account
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => revokeFreelancer(u._id)} 
                                        className="px-3 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                                      >
                                        Revoke Access
                                      </button>
                                    )
                                  )}
                                  
                                  {u.role !== 'admin' && (
                                    <button 
                                      onClick={() => deleteUser(u._id)} 
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Account"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'jobs' && (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search jobs by title or client name..."
                      value={jobSearch}
                      onChange={e => setJobSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={jobStatusFilter}
                      onChange={e => setJobStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Work States</option>
                      <option value="open">Open (Bidding)</option>
                      <option value="in-progress">In Progress</option>
                      <option value="delivered">Delivered (Pending Client)</option>
                      <option value="completed">Completed</option>
                    </select>

                    <select
                      value={jobApprovalFilter}
                      onChange={e => setJobApprovalFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Moderation Statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending Admin Verification</option>
                    </select>
                  </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">Job Details</th>
                          <th className="p-4">Owner (Client)</th>
                          <th className="p-4">Financial Budget</th>
                          <th className="p-4">Platform Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredJobs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No jobs match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredJobs.map(j => (
                            <tr key={j._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 space-y-1 max-w-xs">
                                <p className="font-bold text-slate-800 truncate">{j.title}</p>
                                <p className="text-[10px] text-slate-400 line-clamp-1">{j.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {j.skills && j.skills.map(s => (
                                    <span key={s} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-semibold text-slate-500">{s}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-slate-600">
                                {j.client?.name || 'Unknown Client'}
                              </td>
                              <td className="p-4 font-bold text-slate-800">
                                ₹{j.budget.toLocaleString('en-IN')}
                              </td>
                              <td className="p-4 space-y-1">
                                {/* State indicators */}
                                <div>
                                  {j.isApproved ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold text-[9px] uppercase">Approved</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold text-[9px] uppercase">Pending Admin</span>
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                                  Status: {j.status}
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {!j.isApproved && (
                                    <button 
                                      onClick={() => approveJob(j._id)} 
                                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      Approve & Publish
                                    </button>
                                  )}
                                  
                                  <button 
                                    onClick={() => deleteJob(j._id)} 
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Job"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search by order ID, client, freelancer..."
                      value={paymentSearch}
                      onChange={e => setPaymentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select
                      value={paymentStatusFilter}
                      onChange={e => setPaymentStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="all">All Payment Statuses</option>
                      <option value="created">Created (Unfunded)</option>
                      <option value="escrow_funded">Secured in Escrow</option>
                      <option value="released">Released to Talent</option>
                    </select>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto max-h-[550px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                          <th className="p-4 pl-6">Order ID</th>
                          <th className="p-4">Project Title</th>
                          <th className="p-4">Agreed Price Breakdown</th>
                          <th className="p-4">Client vs Talent</th>
                          <th className="p-4">Escrow Badge</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center p-12 text-slate-400 font-medium bg-white">
                              No financial orders match your active search or filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map(p => (
                            <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6 font-bold text-slate-800">
                                {p.razorpayOrderId}
                              </td>
                              <td className="p-4 font-semibold text-slate-700 truncate max-w-[200px]">
                                {p.job?.title || 'Job Deleted'}
                              </td>
                              <td className="p-4 space-y-0.5">
                                <p className="font-bold text-slate-800">Total: ₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Platform (5%): ₹{(p.platformFee || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[9px] text-slate-400 font-medium">Talent Share (95%): ₹{(p.freelancerAmount || 0).toLocaleString('en-IN')}</p>
                              </td>
                              <td className="p-4 space-y-1 font-semibold text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Client: {p.client?.name || 'Unknown'}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Talent: {p.freelancer?.name || 'Unknown'}
                                </div>
                              </td>
                              <td className="p-4">
                                {p.status === 'created' && (
                                  <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-bold uppercase text-[9px]">
                                    Unfunded
                                  </span>
                                )}
                                {p.status === 'escrow_funded' && (
                                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                    🔐 Secure Escrow
                                  </span>
                                )}
                                {p.status === 'released' && (
                                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-bold uppercase text-[9px] flex items-center gap-1 w-max">
                                    🏆 Paid Out
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
