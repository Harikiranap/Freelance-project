import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

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
  const passedJobId = location.state?.jobId;

  useEffect(() => {
    const fetchMyJobs = async () => {
      try {
        const token = user?.token || localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/jobs/my-jobs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setJobs(res.data);
        if (res.data.length > 0) {
          const selected = res.data.find(j => j._id === passedJobId) || res.data[0];
          setSelectedJob(selected);
        }
      } catch (err) {
        console.error("Failed to fetch my jobs", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchMyJobs();
  }, [user, passedJobId]);

  useEffect(() => {
    if (!selectedJob) return;

    // Connect to Socket.io server
    socket = io('http://localhost:5000');
    
    socket.emit('join_room', selectedJob._id);

    // Fetch message history for the selected job
    const fetchMessages = async () => {
      try {
        const token = user?.token || localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/jobs/${selectedJob._id}/messages`, {
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
      // Incoming messages are stored in state
      setMessages((prev) => [...prev, data]);
      scrollToBottom();
    });

    socket.on('warning', (data) => {
      alert(data.message);
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
    
    // Determine receiver: if user is client, receiver is freelancer, and vice versa
    let receiverId = null;
    if (user.role === 'client') {
      receiverId = selectedJob.selectedFreelancer?._id || selectedJob.selectedFreelancer;
    } else {
      receiverId = selectedJob.client?._id || selectedJob.client;
    }

    if (!receiverId) {
      alert("Cannot send message. The other party is unknown (e.g. no freelancer selected yet).");
      return;
    }

    const msgData = {
      senderId: user.id || user._id, // depending on how auth context stores it
      receiverId: receiverId,
      jobId: selectedJob._id,
      content: message
    };
    
    socket.emit('send_message', msgData);
    setMessage('');
  };

  if (loadingJobs) return <div className="p-8 text-center">Loading chats...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[80vh] flex overflow-hidden">
      
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
                  {user.role === 'client' ? 'Freelancer: ' + (job.selectedFreelancer?.name || 'Pending') : 'Client: ' + (job.client?.companyName || job.client?.name || 'Unknown')}
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
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
              </p>
            </div>
            <div className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
              ₹{selectedJob.budget} - {selectedJob.status.toUpperCase()}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]">
            <div className="flex justify-center mb-6">
              <span className="bg-amber-50 text-amber-700 text-xs px-4 py-1.5 rounded-full font-medium flex items-center shadow-sm border border-amber-100">
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
              disabled={selectedJob.status === 'open' && user.role === 'client' && !selectedJob.selectedFreelancer}
            />
            <button 
              type="submit" 
              disabled={selectedJob.status === 'open' && user.role === 'client' && !selectedJob.selectedFreelancer}
              className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
          
          {selectedJob.status === 'open' && user.role === 'client' && !selectedJob.selectedFreelancer && (
            <div className="absolute bottom-[72px] left-0 w-full bg-orange-50 text-orange-600 text-xs p-2 text-center border-t border-orange-100">
              You must accept a bid before you can message a freelancer.
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
