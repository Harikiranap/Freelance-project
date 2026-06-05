const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/users/freelancers
// Fetch all active/approved freelancers
router.get('/freelancers', protect, async (req, res) => {
  try {
    const freelancers = await User.find({
      role: 'freelancer',
      isFreelancerApproved: true
    }).select('-password -otp -otpExpires -upiId -bankAccount');
    
    res.json(freelancers);
  } catch (error) {
    console.error('Error fetching freelancers:', error);
    res.status(500).json({ message: 'Server error while fetching freelancers' });
  }
});

module.exports = router;
