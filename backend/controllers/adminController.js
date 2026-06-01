const User = require('../models/User');
const Job = require('../models/Job');

exports.getStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const jobCount = await Job.countDocuments();
    const users = await User.find().select('-password').sort({ createdAt: -1 }).limit(20);
    const jobs = await Job.find().populate('client', 'name').sort({ createdAt: -1 }).limit(20);

    res.json({ userCount, jobCount, users, jobs });
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
