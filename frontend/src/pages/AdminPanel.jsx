import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Trash2, Users, Briefcase } from 'lucide-react';
import Loading from '../components/Loading';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${id}`);
      fetchStats();
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  const deleteJob = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/jobs/${id}`);
      fetchStats();
    } catch (err) {
      alert("Failed to delete job");
    }
  };

  const approveFreelancer = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/admin/approve-freelancer/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStats();
    } catch (err) {
      alert("Failed to approve freelancer");
    }
  };

  const revokeFreelancer = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/admin/revoke-freelancer/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStats();
    } catch (err) {
      alert("Failed to revoke freelancer verification");
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage users, jobs, and platform health.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{stats.userCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Jobs Posted</p>
            <p className="text-2xl font-bold text-slate-900">{stats.jobCount}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Recent Users</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.users.map(u => (
              <div key={u._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{u.name}</p>
                    {u.role === 'freelancer' && (
                      u.isFreelancerApproved ? (
                        <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Approved</span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Pending Admin</span>
                      )
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{u.email} • {u.role.toUpperCase()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {u.role === 'freelancer' && (
                    !u.isFreelancerApproved ? (
                      <button 
                        onClick={() => approveFreelancer(u._id)} 
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Approve
                      </button>
                    ) : (
                      <button 
                        onClick={() => revokeFreelancer(u._id)} 
                        className="px-3 py-1 bg-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-bold rounded-lg transition-colors"
                      >
                        Revoke
                      </button>
                    )
                  )}
                  
                  <button onClick={() => deleteUser(u._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-800">Recent Jobs</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.jobs.map(j => (
              <div key={j._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-900">{j.title}</p>
                  <p className="text-xs text-slate-500">{j.client?.name} • ₹{j.budget}</p>
                </div>
                <button onClick={() => deleteJob(j._id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
