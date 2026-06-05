import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Loader2, MessageSquare, CheckSquare, CreditCard, Landmark, Compass, Briefcase, FileText, Sparkles, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import Avatar from '../components/Avatar';
import TalentDirectory from '../components/TalentDirectory';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(user?.role === 'client' ? 'talents' : 'discover'); // 'talents', 'discover' or 'workspace'
  const [profile, setProfile] = useState(null);
  
  // Discover Jobs
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Workspace Jobs
  const [myJobs, setMyJobs] = useState([]);
  const [loadingMyJobs, setLoadingMyJobs] = useState(false);
  
  // Removed redundant bidding state
  
  // Create Job Form State
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ title: '', description: '', budget: '', skills: '', category: 'Web Design' });
  const [isPosting, setIsPosting] = useState(false);

  // Custom Confirmation Modal State
  const [confirmAction, setConfirmAction] = useState({
    isOpen: false,
    title: '',
    message: '',
    requireInput: false,
    inputValue: '',
    inputPlaceholder: '',
    inputType: 'text',
    onConfirm: () => {}
  });

  const triggerConfirm = (title, message, onConfirmAction, requireInput = false, inputPlaceholder = '', inputType = 'text') => {
    setConfirmAction({
      isOpen: true,
      title,
      message,
      requireInput,
      inputValue: '',
      inputPlaceholder,
      inputType,
      onConfirm: (val) => {
        onConfirmAction(val);
        setConfirmAction(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  
  // Bids Modal State
  const [viewingBidsJob, setViewingBidsJob] = useState(null);
  const [jobBids, setJobBids] = useState([]);
  const [isAccepting, setIsAccepting] = useState(null);
  
  // Payment states
  const [isPaying, setIsPaying] = useState(null);
  const [isReleasing, setIsReleasing] = useState(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(null);

  // AI Matching States
  const [aiMatches, setAiMatches] = useState({});
  const [loadingAi, setLoadingAi] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  };

  useEffect(() => {
    if (showJobModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showJobModal]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/jobs');
      setJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
      toast.error("Failed to fetch jobs list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyJobs = async () => {
    try {
      setLoadingMyJobs(true);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyJobs(res.data);
    } catch (err) {
      console.error("Failed to fetch my workspace jobs", err);
    } finally {
      setLoadingMyJobs(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobs();
    fetchMyJobs();
    if (user) {
      setActiveTab(user.role === 'client' ? 'talents' : 'discover');
    }
  }, [user]);

  const handlePostJobSubmit = (e) => {
    e.preventDefault();
    triggerConfirm(
      "Publish Project",
      "Are you sure continuing to post this job?",
      executePostJob
    );
  };

  const executePostJob = async () => {
    setIsPosting(true);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const skillsArray = jobForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      
      await axios.post('http://localhost:5000/api/jobs', {
        title: jobForm.title,
        description: jobForm.description,
        budget: Number(jobForm.budget),
        skills: skillsArray,
        category: jobForm.category
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Job posted successfully!");
      setShowJobModal(false);
      setJobForm({ title: '', description: '', budget: '', skills: '', category: 'Web Design' });
      fetchJobs();
      fetchMyJobs();
    } catch (err) {
      console.error("Failed to post job", err);
      toast.error(err.response?.data?.message || "Failed to post job.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleAiMatch = async (jobId) => {
    try {
      setLoadingAi(jobId);
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/jobs/${jobId}/ai-match`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiMatches(prev => ({ ...prev, [jobId]: res.data }));
      toast.success("AI found the best matches!");
    } catch (err) {
      console.error("Failed to get AI matches", err);
      toast.error("Failed to get AI recommendations.");
    } finally {
      setLoadingAi(null);
    }
  };

  // Removed executeBid from dashboard. Now handled in JobDetails.

  const fetchJobBids = async (job) => {
    setViewingBidsJob(job);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/jobs/${job._id}/bids`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobBids(res.data);
    } catch (err) {
      toast.error('Failed to load bids.');
      setViewingBidsJob(null);
    }
  };

  const handleAcceptBidClick = (bidId, amount, freelancerName) => {
    triggerConfirm(
      "Accept Bid & Hire",
      `Are you sure continuing to accept this bid of ₹${amount} and hire ${freelancerName}?`,
      () => executeAcceptBid(bidId, amount)
    );
  };

  const executeAcceptBid = async (bidId, amount) => {
    setIsAccepting(bidId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/jobs/bid/${bidId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Bid accepted successfully! Contract created for ₹${amount}`);
      setViewingBidsJob(null);
      fetchJobs();
      fetchMyJobs();
      // Redirect client to payment/billing page
      navigate(`/payment/${res.data.job._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept bid');
    } finally {
      setIsAccepting(null);
    }
  };

  // Deliver/Submit project by Freelancer
  const handleDeliverClick = (jobId) => {
    triggerConfirm(
      "Deliver Project Work",
      "Are you sure continuing to submit work for review?",
      (link) => executeDeliverJob(jobId, link),
      true,
      "Enter GitHub or hosted link here...",
      "url"
    );
  };

  const executeDeliverJob = async (jobId, deliverableLink) => {
    setIsSubmittingWork(jobId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/jobs/${jobId}/deliver`, { deliverableLink }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Work delivered successfully! Waiting for client review.');
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deliver job');
    } finally {
      setIsSubmittingWork(null);
    }
  };

  // Release payment and complete job
  const handleReleaseClick = (jobId) => {
    triggerConfirm(
      "Release Escrow Funds",
      "Are you sure continuing to release payment and close the project?",
      () => executeReleasePayment(jobId)
    );
  };

  const executeReleasePayment = async (jobId) => {
    setIsReleasing(jobId);
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/payments/release/job/${jobId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('🏆 Escrow funds released to freelancer! Project closed as completed.');
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to release escrow payment');
    } finally {
      setIsReleasing(null);
    }
  };

  // Navigate to message room contextually
  const handleChatTransition = (jobId) => {
    navigate('/chat', { state: { jobId } });
  };

  return (
    <div className="space-y-8">
      
      {/* Alert banner for pending freelancer approval */}
      {user?.role === 'freelancer' && profile && !profile.isFreelancerApproved && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 text-blue-800 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0 animate-pulse">
            ⏳
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Account Pending Admin Verification</h4>
            <p className="text-xs text-slate-500 mt-1">Your freelancer profile was submitted successfully and is currently under review by our moderation team. You will be able to submit proposal bids on open projects immediately after verification.</p>
          </div>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">WorkSphere Portal</h1>
          <p className="text-slate-500 mt-1">Collaborate securely using AI matches, encrypted chat, and escrow payments.</p>
        </div>
        
        {user?.role === 'client' && (
          <button 
            onClick={() => setShowJobModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Post a Job
          </button>
        )}
      </div>

      {/* Premium Tab Mechanism */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full max-w-md border border-slate-200/50">
        {user?.role === 'client' ? (
          <>
            <button
              onClick={() => setActiveTab('talents')}
              className={`flex-1 py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all ${activeTab === 'talents' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Compass size={16} />
              Find Talents
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex-1 py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all ${activeTab === 'workspace' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={16} />
              My Workspace
              {myJobs.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.length}
                </span>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all ${activeTab === 'discover' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Compass size={16} />
              Explore Jobs
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`flex-1 py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2.5 transition-all ${activeTab === 'workspace' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Briefcase size={16} />
              My Workspace
              {myJobs.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {myJobs.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Tabs Content */}
      {activeTab === 'talents' ? (
        <TalentDirectory />
      ) : activeTab === 'discover' ? (
        // Explore/Discover Tab
        loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm font-medium">Scanning network for active projects...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white border border-dashed rounded-3xl p-10">
            No open jobs available on the platform right now. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job, index) => (
              <motion.div
                key={job._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full group hover:shadow-xl transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      OPEN FOR BIDS
                    </span>
                    <span className="text-lg font-bold text-slate-900">₹{job.budget}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                  <p className="text-xs text-slate-400 mb-4">{job.client?.companyName || job.client?.name || 'Client'}</p>
                  <p className="text-sm text-slate-500 mb-5 line-clamp-3">{job.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {job.skills && job.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Freelancer Action */}
                {user?.role === 'freelancer' && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => navigate(`/job/${job._id}`)}
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} /> View Details & Bid
                    </button>
                  </div>
                )}

                {/* Client Owner Action */}
                {user?.role === 'client' && (job.client?._id === user?.id || job.client === user?.id) && (
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-auto">
                    <button 
                      onClick={() => navigate(`/job/${job._id}`)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Manage Proposals
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )
      ) : (
        // Workspace Tab
        loadingMyJobs ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 size={36} className="animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm font-medium">Syncing secure workspace agreements...</p>
          </div>
        ) : myJobs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-white border border-dashed rounded-3xl p-10">
            No active jobs in your workspace. 
            {user?.role === 'freelancer' ? ' Find an interesting job and submit a bid!' : ' Post a job and accept freelancer proposals.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myJobs.map((job) => {
              // Determine status colors
              let statusBg = 'bg-slate-100 text-slate-600';
              let statusText = job.status.toUpperCase();
              
              if (!job.isApproved) {
                statusBg = 'bg-blue-100 text-blue-700 border border-blue-200';
                statusText = 'PENDING ADMIN APPROVAL';
              } else if (job.status === 'open') {
                statusBg = 'bg-slate-100 text-slate-600 border border-slate-200';
                statusText = 'PENDING ASSIGNMENT';
              } else if (job.status === 'in-progress') {
                statusBg = 'bg-slate-50 text-slate-700 border border-slate-100';
                statusText = 'ACTIVE / IN-PROGRESS';
              } else if (job.status === 'delivered') {
                statusBg = 'bg-slate-50 text-slate-700 border border-slate-100';
                statusText = 'DELIVERED (PENDING REVIEW)';
              } else if (job.status === 'completed') {
                statusBg = 'bg-blue-50 text-blue-700 border border-blue-100';
                statusText = 'COMPLETED';
              }

              // Final displayed budget (prefer accepted price if hired)
              const finalPrice = job.status !== 'open' && job.acceptedPrice ? job.acceptedPrice : job.budget;

              return (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBg}`}>
                        {statusText}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-semibold uppercase">Hired Price:</span>
                        <span className="text-xl font-extrabold text-blue-600">₹{finalPrice}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        <Link to={`/job/${job._id}`} className="hover:text-blue-600 transition-colors">
                          {job.title}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar name={user?.role === 'client' ? job.selectedFreelancer?.name : job.client?.name} size={24} />
                        <p className="text-xs text-slate-500">
                          {user?.role === 'client' 
                            ? `Hired Freelancer: ${job.selectedFreelancer?.name || 'None Assigned'}`
                            : `Contract Client: ${job.client?.companyName || job.client?.name || 'Unknown'}`
                          }
                        </p>
                      </div>
                    </div>

                    {/* Escrow Status indicators */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className="text-slate-400" />
                        <span className="text-slate-500 font-medium">Secure Escrow:</span>
                      </div>
                      <div>
                        {job.paymentStatus === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            UNFUNDED
                          </span>
                        )}
                        {job.paymentStatus === 'escrow_funded' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-50 text-slate-700 border border-slate-100 flex items-center gap-1">
                            🔐 SECURELY HELD
                          </span>
                        )}
                        {job.paymentStatus === 'released' && (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            RELEASED TO TALENT
                          </span>
                        )}
                      </div>
                    </div>

                    {job.deliverableLink && (
                      <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <p className="text-xs font-semibold text-blue-700 mb-1">Delivered Work Link:</p>
                        <a href={job.deliverableLink.includes('http') ? job.deliverableLink : `https://${job.deliverableLink}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                          {job.deliverableLink}
                        </a>
                      </div>
                    )}
                  </div>

                    {/* Actions Area */}
                    <div className="mt-auto p-6 pt-0 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 pt-5">
                      
                      {/* Left Actions */}
                      <div className="flex gap-2">
                        {/* Message / Chat Button */}
                        <button 
                          onClick={() => handleChatTransition(job._id)}
                          className="px-4 py-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare size={14} />
                          Encrypted Chat
                        </button>
                        
                        {user?.role === 'client' && job.status === 'open' && (
                          <>
                            <button 
                              onClick={() => handleAiMatch(job._id)}
                              disabled={loadingAi === job._id}
                              className="px-4 py-2 text-slate-700 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {loadingAi === job._id ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                              Find AI Matches
                            </button>
                            <button 
                              onClick={() => navigate(`/job/${job._id}`)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText size={14} />
                              View Bids / Proposals
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                      {/* Freelancer submits work */}
                      {user?.role === 'freelancer' && job.status === 'in-progress' && (
                        <button
                          onClick={() => handleDeliverClick(job._id)}
                          disabled={isSubmittingWork === job._id}
                          className="px-4 py-2 bg-gradient-to-r from-slate-500 to-red-500 hover:from-slate-600 hover:to-red-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSubmittingWork === job._id ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={14} />}
                          Submit / Deliver Work
                        </button>
                      )}

                      {/* Client funds escrow */}
                      {user?.role === 'client' && job.status === 'in-progress' && job.paymentStatus === 'pending' && (
                        <button
                          onClick={() => navigate(`/payment/${job._id}`)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-slate-600 hover:from-blue-700 hover:to-slate-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 animate-pulse hover:animate-none"
                        >
                          <CreditCard size={14} />
                          Pay Escrow
                        </button>
                      )}

                      {/* Client releases payment */}
                      {user?.role === 'client' && job.status === 'delivered' && job.paymentStatus === 'escrow_funded' && (
                        <button
                          onClick={() => handleReleaseClick(job._id)}
                          disabled={isReleasing === job._id}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-slate-500 hover:from-blue-600 hover:to-slate-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isReleasing === job._id ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={14} />}
                          Release Payment & Close
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Matches Display Section */}
                  {aiMatches[job._id] && (
                    <div className="border-t border-slate-100 bg-slate-50/30 p-5">
                      <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-slate-500" /> AI Top Recommended Freelancers
                      </h4>
                      {aiMatches[job._id].length === 0 ? (
                        <p className="text-xs text-slate-500">No matching freelancers found for these skills.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {aiMatches[job._id].map((match, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <Avatar name={match.freelancer.name} size={36} className="border-slate-100 text-slate-600" />
                                <div>
                                  <div className="font-bold text-sm text-slate-800">{match.freelancer.name}</div>
                                  <div className="text-[10px] font-semibold text-slate-400">Rating: {match.freelancer.rating} ⭐</div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="text-sm font-black text-slate-600">{Math.round(match.score * 100)}% Match</div>
                                <button className="mt-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded uppercase transition-colors">
                                  Invite
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </motion.div>
              );
            })}
          </div>
        )
      )}

      {/* Post Job Modal */}
      {showJobModal && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Post a New Job</h2>
                <p className="text-xs text-slate-500 mt-0.5">Specify requirements and set a budget in INR.</p>
              </div>
              <button onClick={() => setShowJobModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            
            <form onSubmit={handlePostJobSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Job Title</label>
                <input 
                  type="text" 
                  required
                  value={jobForm.title}
                  onChange={e => setJobForm({...jobForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                  placeholder="e.g. React & Node Developer Needed for SaaS" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Category</label>
                <select 
                  value={jobForm.category}
                  onChange={e => setJobForm({...jobForm, category: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                >
                  <option value="Web Design">Web Design</option>
                  <option value="Video Editing">Video Editing</option>
                  <option value="Reels Making">Reels Making</option>
                  <option value="Graphics Design">Graphics Design</option>
                  <option value="Copywriting">Copywriting</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="SEO Optimization">SEO Optimization</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Project Description</label>
                <textarea 
                  required
                  value={jobForm.description}
                  onChange={e => setJobForm({...jobForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-28 resize-none text-sm" 
                  placeholder="Describe the deliverables, scope of work, and timelines..."
                ></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Budget (₹)</label>
                  <input 
                    type="number" 
                    required
                    value={jobForm.budget}
                    onChange={e => setJobForm({...jobForm, budget: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                    placeholder="e.g. 50000" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Skills (comma separated)</label>
                  <input 
                    type="text" 
                    required
                    value={jobForm.skills}
                    onChange={e => setJobForm({...jobForm, skills: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                    placeholder="React, Express, JWT" 
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowJobModal(false)} disabled={isPosting} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={isPosting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition-colors flex items-center gap-2">
                  {isPosting ? <><Loader2 size={14} className="animate-spin" /> Publishing...</> : 'Publish Job'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={confirmAction.isOpen}
        title={confirmAction.title}
        message={confirmAction.message}
        requireInput={confirmAction.requireInput}
        inputValue={confirmAction.inputValue}
        inputPlaceholder={confirmAction.inputPlaceholder}
        inputType={confirmAction.inputType}
        onInputChange={(val) => setConfirmAction(prev => ({ ...prev, inputValue: val }))}
        onConfirm={() => confirmAction.onConfirm(confirmAction.inputValue)}
        onCancel={() => setConfirmAction(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
