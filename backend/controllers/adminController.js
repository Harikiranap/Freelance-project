const User = require('../models/User');
const Job = require('../models/Job');
const Payment = require('../models/Payment');

exports.getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const jobCount = await Job.countDocuments();
    const paymentCount = await Payment.countDocuments();

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const jobs = await Job.find().populate('client', 'name').sort({ createdAt: -1 });
    const payments = await Payment.find()
      .populate('client', 'name')
      .populate('freelancer', 'name')
      .populate('job', 'title')
      .sort({ createdAt: -1 });

    // Financial Metrics
    const fundedPayments = payments.filter(p => p.status === 'escrow_funded' || p.status === 'released');
    const totalEscrowVolume = fundedPayments.reduce((acc, p) => acc + p.amount, 0);
    const platformFees = fundedPayments.reduce((acc, p) => acc + (p.platformFee || 0), 0);

    // Job Status counts
    const jobsStatus = {
      open: jobs.filter(j => j.status === 'open').length,
      inProgress: jobs.filter(j => j.status === 'in-progress').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      delivered: jobs.filter(j => j.status === 'delivered').length,
      pendingApproval: jobs.filter(j => !j.isApproved).length
    };

    res.json({ 
      userCount, 
      jobCount, 
      paymentCount,
      totalEscrowVolume,
      platformFees,
      users, 
      jobs,
      payments,
      jobsStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveFreelancer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isFreelancerApproved = true;
    await user.save();
    res.json({ message: 'Freelancer approved successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.revokeFreelancer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isFreelancerApproved = false;
    await user.save();
    res.json({ message: 'Freelancer approval revoked', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
