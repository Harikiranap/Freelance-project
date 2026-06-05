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
              roomName: `${j._id}_${bid.freelancer?._id}`
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
              roomName: j._id
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
            roomName: `${j._id}_${user.id || user._id}`
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
      
      // Auto-select conversation if location state passed
      if (conversations.length > 0) {
        let selected = conversations[0];
        const passedJobId = location.state?.jobId;
        const passedFreelancerId = location.state?.directUserId;
        
        if (passedJobId) {
          const match = conversations.find(c => 
            c.job._id === passedJobId && 
            (!passedFreelancerId || c.freelancer?._id === passedFreelancerId)
          );
          if (match) selected = match;
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
    
    socket.emit('join_room', selectedJob.roomName);

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
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    socket.on('warning', (data) => {
      toast.error(data.message, { duration: 5000 });
    });

    return () => socket.disconnect();
  }, [selectedJob, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedJob) return;
    
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

  const handleEditBidClick = () => {
    setNewBidAmount(selectedJob.budget.toString());
    setShowEditBidModal(true);
  };

  const handleUpdateBidSubmit = async () => {
    if (!newBidAmount || Number(newBidAmount) <= 0) {
      toast.error("Please enter a valid bid amount.");
      return;
    }
    if (Number(newBidAmount) <= selectedJob.job.budget) {
      toast.error(`Your bid must be greater than the client's budget (₹${selectedJob.job.budget}).`);
      return;
    }

    try {
      const token = user?.token || sessionStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/jobs/bid/${selectedJob.bidId}`, {
        amount: Number(newBidAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Bid updated to ₹${Number(newBidAmount).toLocaleString('en-IN')}!`);
      
      // Update local state
      setJobs(prev => prev.map(c => {
        if (c.bidId === selectedJob.bidId) {
          return { ...c, budget: Number(newBidAmount) };
        }
        return c;
      }));
      setSelectedJob(prev => ({ ...prev, budget: Number(newBidAmount) }));

      // Send system chat message notifying the client
      const msgData = {
        senderId: user.id || user._id,
        receiverId: selectedJob.job.client?._id || selectedJob.job.client,
        jobId: selectedJob.job._id,
        content: `📢 Negotiation update: I have updated my bid price proposal to ₹${Number(newBidAmount).toLocaleString('en-IN')}.`,
        roomName: selectedJob.roomName
      };
      socket.emit('send_message', msgData);

      setShowEditBidModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update bid');
    }
  };

  if (loadingJobs) return <div className="p-8 text-center text-blue-600">Loading chats...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[80vh] flex overflow-hidden">
      
      {/* Edit Bid Confirmation Modal */}
      <ConfirmModal
        isOpen={showEditBidModal}
        title="Revise Bid Amount"
        message={`Enter new proposal budget (Client target budget: ₹${selectedJob?.job?.budget})`}
        requireInput={true}
        inputValue={newBidAmount}
        inputPlaceholder="e.g. 15000"
        inputType="number"
        onInputChange={(val) => setNewBidAmount(val)}
        onConfirm={handleUpdateBidSubmit}
        onCancel={() => setShowEditBidModal(false)}
      />

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
              {user.role === 'freelancer' && selectedJob.status === 'open' && selectedJob.bidId && (
                <button
                  type="button"
                  onClick={handleEditBidClick}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl border border-blue-200 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  ✏️ Edit Bid Price
                </button>
              )}
              <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                ₹{selectedJob.budget.toLocaleString('en-IN')} - {selectedJob.status.toUpperCase()}
              </div>
            </div>
          </div>
          
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
                    <span className={`text-[10px] mt-1.5 block text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
