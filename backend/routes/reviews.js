const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const Review = require('../models/Review');
const User = require('../models/User');
const Job = require('../models/Job');
const router = express.Router();

// Create a review
router.post('/', protect, authorize('client'), async (req, res) => {
  try {
    const { jobId, rating, comment } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed jobs.' });
    }

    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const existingReview = await Review.findOne({ job: jobId });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already submitted for this job.' });
    }

    const review = await Review.create({
      job: jobId,
      client: req.user.id,
      freelancer: job.selectedFreelancer,
      rating,
      comment
    });

    // Update freelancer average rating
    const allReviews = await Review.find({ freelancer: job.selectedFreelancer });
    const avgRating = allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
    
    await User.findByIdAndUpdate(job.selectedFreelancer, { rating: avgRating.toFixed(1) });

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get freelancer reviews
router.get('/freelancer/:id', async (req, res) => {
  try {
    const reviews = await Review.find({ freelancer: req.params.id }).populate('client', 'name companyName').sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
