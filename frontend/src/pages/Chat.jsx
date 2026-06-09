import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

let socket;

export default function Chat() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const location = useLocation();
  
  // Edit Bid State
  const [showEditBidModal, setShowEditBidModal] = useState(false);
  const [newBidAmount, setNewBidAmount] = useState('');

  // Real-time Chat UX State
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Counter Offer Negotiation States
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const fetchMyJobs = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/jobs/my-jobs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let conversations = [];
      for (const j of res.data) {
        if (user.role === 'client' && j.status === 'open') {
          // Client: fetch all bids for this open job to let client chat with each freelancer separately
          const bidsRes = await axios.get(`http://localhost:5000/api/jobs/${j._id}/bids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          bidsRes.data.forEach(bid => {
            conversations.push({
              _id: `${j._id}_${bid.freelancer?._id}`,
              job: j,
              freelancer: bid.freelancer,
              bidId: bid._id,
              title: j.title,
              subtitle: `Freelancer: ${bid.freelancer?.name || 'Applicant'}`,
              budget: bid.amount,
              status: j.status,
              roomName: `${j._id}_${bid.freelancer?._id}`,
              negotiationHistory: bid.negotiationHistory
            });
          });
          
          if (bidsRes.data.length === 0) {
            conversations.push({
              _id: `${j._id}_pending`,
              job: j,
              freelancer: null,
              bidId: null,
              title: j.title,
              subtitle: 'No proposals yet',
              budget: j.budget,
              status: j.status,
              roomName: j._id,
              negotiationHistory: []
            });
          }
        } else if (user.role === 'freelancer') {
          // Freelancer: find their own bid to show bidId and proposed price
          const bidsRes = await axios.get(`http://localhost:5000/api/jobs/${j._id}/bids`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const myBid = bidsRes.data.find(b => b.freelancer?._id === user.id || b.freelancer === user.id);
          conversations.push({
            _id: j._id,
            job: j,
            freelancer: null,
            bidId: myBid?._id,
            title: j.title,
            subtitle: `Client: ${j.client?.companyName || j.client?.name || 'Client'}`,
            budget: myBid?.amount || j.budget,
            status: j.status,
            roomName: `${j._id}_${user.id || user._id}`,
            negotiationHistory: myBid?.negotiationHistory || []
          });
        } else {
          // Hired client view
          const fl = j.selectedFreelancer;
          conversations.push({
            _id: j._id,
            job: j,
            freelancer: fl,
            bidId: null,
            title: j.title,
            subtitle: `Freelancer: ${fl?.name || 'Assigned'}`,
            budget: j.acceptedPrice || j.budget,
            status: j.status,
            roomName: fl ? `${j._id}_${fl._id || fl}` : j._id
          });
        }
      }

      setJobs(conversations);
      
      // Keep selected job updated or select first
      if (conversations.length > 0) {
        let selected = conversations[0];
        
        // If we already had a selected conversation, try to find it in the new list to update history
        const currentSelectedId = selectedJob?._id;
        if (currentSelectedId) {
          const match = conversations.find(c => c._id === currentSelectedId);
          if (match) selected = match;
        } else {
          const passedJobId = location.state?.jobId;
          const passedFreelancerId = location.state?.directUserId;
          
          if (passedJobId) {
            const match = conversations.find(c => 
              c.job._id === passedJobId && 
              (!passedFreelancerId || c.freelancer?._id === passedFreelancerId)
            );
            if (match) selected = match;
          }
        }
        setSelectedJob(selected);
      }
    } catch (err) {
      console.error("Failed to fetch my jobs", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchMyJobs();
  }, [user, location.state]);

  useEffect(() => {
    if (!selectedJob) return;

    // Connect to Socket.io server
    socket = io('http://localhost:5000');
    
    socket.emit('join_room', {
      roomName: selectedJob.roomName,
      userId: user.id || user._id,
      jobId: selectedJob.job._id
    });

    // Fetch messages history
    const fetchMessages = async () => {
      try {
        const token = user?.token || sessionStorage.getItem('token');
        const freelancerParam = selectedJob.freelancer 
          ? `?freelancerId=${selectedJob.freelancer._id || selectedJob.freelancer}` 
          : '';
        const res = await axios.get(`http://localhost:5000/api/jobs/${selectedJob.job._id}/messages${freelancerParam}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
        scrollToBottom();

        // If there are unread incoming messages, mark them as read immediately
        const hasUnread = res.data.some(m => m.receiver === (user.id || user._id) && !m.isRead);
        if (hasUnread) {
          socket.emit('mark_read', {
            roomName: selectedJob.roomName,
            userId: user.id || user._id,
            jobId: selectedJob.job._id
          });
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();

      // If we are actively viewing this chat and receive a message, mark it read
      const isMe = data.sender === (user.id || user._id);
      if (!isMe) {
        socket.emit('mark_read', {
          roomName: selectedJob.roomName,
          userId: user.id || user._id,
          jobId: selectedJob.job._id
        });
      }
    });

    socket.on('messages_marked_read', (data) => {
      setMessages((prev) => prev.map(m => {
        // If the receiver marked our message as read, update local tick status
        if (m.sender === (user.id || user._id)) {
          return { ...m, isRead: true };
        }
        return m;
      }));
    });

    socket.on('user_typing', (data) => {
      setOtherUserTyping(true);
    });

    socket.on('user_stopped_typing', () => {
      setOtherUserTyping(false);
    });

    socket.on('warning', (data) => {
      toast.error(data.message, { duration: 5000 });
    });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, [selectedJob, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedJob) return;
    
    // Clear typing timeout and emit stop_typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', {
      roomName: selectedJob.roomName,
      username: user.name
    });
    setOtherUserTyping(false);

    let receiverId = null;
    if (user.role === 'client') {
      receiverId = selectedJob.freelancer?._id || selectedJob.freelancer || selectedJob.job.selectedFreelancer?._id || selectedJob.job.selectedFreelancer;
    } else {
      receiverId = selectedJob.job.client?._id || selectedJob.job.client;
    }

    if (!receiverId) {
      toast.error("Cannot send message. The other party is unknown.");
      return;
    }

    const msgData = {
      senderId: user.id || user._id,
      receiverId: receiverId,
      jobId: selectedJob.job._id,
      content: message,
      roomName: selectedJob.roomName
    };
    
    socket.emit('send_message', msgData);
    setMessage('');
  };

  const handleAcceptCounterOffer = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/jobs/bid/${selectedJob.bidId}/counter/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("🤝 Counter-offer accepted! Contract established.");
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `🤝 Negotiation accepted! Active contract established at ₹${selectedJob.budget.toLocaleString('en-IN')}.`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept offer');
    }
  };

  const handleRejectCounterOffer = async () => {
    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/jobs/bid/${selectedJob.bidId}/counter/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Decline registered.");
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `❌ Proposed counter-offer has been declined. Let's continue negotiation.`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline offer');
    }
  };

  const handleProposeCounterClick = () => {
    setCounterAmount(selectedJob.budget.toString());
    setCounterMessage('');
    setShowCounterModal(true);
  };

  const handleCounterSubmit = async () => {
    if (!counterAmount || Number(counterAmount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (user.role === 'freelancer' && Number(counterAmount) <= selectedJob.job.budget) {
      toast.error(`Your proposed rate must exceed client budget of ₹${selectedJob.job.budget}`);
      return;
    }

    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/jobs/bid/${selectedJob.bidId}/counter`, {
        amount: Number(counterAmount),
        message: counterMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Counter-offer submitted: ₹${Number(counterAmount).toLocaleString('en-IN')}`);
      
      const receiverId = user.role === 'client' 
        ? (selectedJob.freelancer?._id || selectedJob.freelancer) 
        : (selectedJob.job.client?._id || selectedJob.job.client);

      const msgData = {
        senderId: user.id || user._id,
        receiverId,
        jobId: selectedJob.job._id,
        content: `📢 Negotiation update: Counter-offer proposed for ₹${Number(counterAmount).toLocaleString('en-IN')}. Message: "${counterMessage || 'Let\'s collaborate'}"`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      setShowCounterModal(false);
      fetchMyJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit counter-offer');
    }
  };

  if (loadingJobs) return <div className="p-8 text-center text-blue-600">Loading chats...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[80vh] flex overflow-hidden">
      
      {/* Propose Counter Offer Modal */}
      <AnimatePresence>
        {showCounterModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCounterModal(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col z-10 text-center"
            >
              <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-2">
                Propose Counter-Offer
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Submit a counter-proposal to negotiate the project budget. The other party must accept to establish the active contract.
              </p>

              <div className="space-y-4 text-left mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Proposed Price (₹)</label>
                  <input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Negotiation Message (Optional)</label>
                  <textarea
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    placeholder="Provide context or terms for this counter-offer..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowCounterModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCounterSubmit}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md transition-colors"
                >
                  Propose Rate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar: Job List */}
      <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800 text-lg">My Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No active jobs found to chat about.</div>
          ) : (
            jobs.map((job) => (
              <div 
                key={job._id}
                onClick={() => setSelectedJob(job)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${selectedJob?._id === job._id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-100'}`}
              >
                <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {job.subtitle}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedJob ? (
        <div className="flex-1 flex flex-col relative">
          <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center shadow-sm z-10">
            <div>
              <h2 className="font-bold text-slate-800">{selectedJob.title}</h2>
              <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span> Online
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedJob.status === 'open' && selectedJob.bidId && (
                <button
                  type="button"
                  onClick={handleProposeCounterClick}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl border border-blue-200 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  ✏️ Propose Counter-Offer
                </button>
              )}
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                ₹{selectedJob.budget.toLocaleString('en-IN')} - {selectedJob.status.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Visual Timeline and Action buttons for Negotiation */}
          {selectedJob.negotiationHistory && selectedJob.negotiationHistory.length > 0 && (
            <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shadow-inner z-10 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  🤝 Budget Negotiation History
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {selectedJob.negotiationHistory.length} offers
                </span>
              </div>
              
              {/* Horizontal Timeline display */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {selectedJob.negotiationHistory.map((hist, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`p-2 rounded-xl border text-left text-xs ${
                      hist.status === 'accepted'
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800'
                        : hist.status === 'rejected'
                        ? 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                        : 'bg-blue-50 border-blue-200 text-blue-800 ring-2 ring-blue-500/20'
                    }`}>
                      <div className="flex justify-between items-center gap-4">
                        <span className="font-bold">₹{hist.amount.toLocaleString('en-IN')}</span>
                        <span className="text-[8px] uppercase tracking-wide opacity-80 font-extrabold">
                          {hist.offeredBy}
                        </span>
                      </div>
                      {hist.message && (
                        <p className="text-[9px] mt-0.5 text-slate-500 line-clamp-1 italic max-w-[150px]" title={hist.message}>
                          "{hist.message}"
                        </p>
                      )}
                    </div>
                    {idx < selectedJob.negotiationHistory.length - 1 && (
                      <span className="text-slate-300 font-bold">➔</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Banner for pending counter-offers */}
              {(() => {
                const lastOffer = selectedJob.negotiationHistory[selectedJob.negotiationHistory.length - 1];
                if (lastOffer && lastOffer.status === 'pending') {
                  const proposedByMe = (lastOffer.offeredBy === 'client' && user.role === 'client') || 
                                       (lastOffer.offeredBy === 'freelancer' && user.role === 'freelancer');
                  
                  if (proposedByMe) {
                    return (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-150 rounded-xl text-xs text-blue-700 font-semibold text-center flex items-center justify-center gap-1.5 shadow-sm">
                        <span className="animate-pulse">⏳</span> Awaiting response on your proposed counter-offer of <span className="font-bold text-blue-800">₹{lastOffer.amount.toLocaleString('en-IN')}</span>.
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="text-left">
                          <p className="text-xs font-extrabold text-amber-800">
                            Counter-Offer Received: ₹{lastOffer.amount.toLocaleString('en-IN')}
                          </p>
                          {lastOffer.message && (
                            <p className="text-[10px] text-amber-600 mt-0.5">
                              "{lastOffer.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={handleRejectCounterOffer}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-rose-650 hover:text-rose-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors shadow-sm"
                          >
                            Decline
                          </button>
                          <button
                            onClick={handleAcceptCounterOffer}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                          >
                            Accept Offer
                          </button>
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]">
            <div className="flex justify-center mb-6">
              <span className="bg-blue-50 text-blue-700 text-xs px-4 py-1.5 rounded-full font-medium flex items-center shadow-sm border border-blue-100">
                🔒 Messages are encrypted in transit and at rest
              </span>
            </div>

            {messages.length === 0 && (
              <div className="text-center py-10 text-sm text-slate-400">
                No messages yet. Send a message to start the conversation!
              </div>
            )}

            {messages.map((msg, idx) => {
              const isMe = msg.sender === (user.id || user._id);
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg._id || idx} 
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] p-3.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    <p className="text-sm break-all">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <span className={`text-[10px] block ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      {isMe && (
                        <span className="text-[10px] leading-none select-none">
                          {msg.isRead ? (
                            <span className="text-cyan-300 font-bold" title="Read">✓✓</span>
                          ) : (
                            <span className="text-blue-200/50" title="Sent">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Real-time Typing Status Indicator */}
            {otherUserTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start items-center gap-1.5 text-xs text-slate-400 font-medium px-4 py-1"
              >
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>The other party is typing...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <input 
              type="text" 
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (socket) {
                  socket.emit('typing', {
                    roomName: selectedJob.roomName,
                    username: user.name
                  });
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    socket.emit('stop_typing', {
                      roomName: selectedJob.roomName,
                      username: user.name
                    });
                  }, 2000);
                }
              }}
              onBlur={() => {
                if (socket) {
                  socket.emit('stop_typing', {
                    roomName: selectedJob.roomName,
                    username: user.name
                  });
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              disabled={selectedJob.status === 'open' && !selectedJob.freelancer && !selectedJob.job.selectedFreelancer}
            />
            <button 
              type="submit" 
              disabled={selectedJob.status === 'open' && !selectedJob.freelancer && !selectedJob.job.selectedFreelancer}
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          
          {selectedJob.status === 'open' && !selectedJob.freelancer && !selectedJob.job.selectedFreelancer && (
            <div className="absolute bottom-[72px] left-0 w-full bg-slate-50 text-slate-600 text-xs p-2 text-center border-t border-slate-100">
              No freelancer has bid on this job yet. Conversations will start once bids are received.
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Your Messages</h3>
            <p className="text-slate-500 text-sm mt-1">Select a job from the sidebar to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
