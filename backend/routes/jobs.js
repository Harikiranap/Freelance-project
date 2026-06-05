const express = require('express');
const { createJob, getJobs, getMyJobs, getJobMessages, placeBid, acceptBid, getJobBids, deliverJob, getJobById, approveJob, getAiMatches, updateBid } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.route('/')
  .get(getJobs)
  .post(protect, authorize('client'), createJob);

router.get('/my-jobs', protect, getMyJobs);
router.get('/job/:jobId', protect, getJobById); // Use /job/:jobId to prevent conflict with other routes
router.get('/:jobId/messages', protect, getJobMessages);
router.get('/:jobId/bids', protect, authorize('client'), getJobBids);
router.get('/:jobId/ai-match', protect, authorize('client'), getAiMatches);

router.post('/:jobId/bid', protect, authorize('freelancer'), placeBid);
router.post('/:jobId/deliver', protect, authorize('freelancer'), deliverJob);
router.post('/:jobId/approve', protect, authorize('admin'), approveJob);
router.post('/bid/:bidId/accept', protect, authorize('client'), acceptBid);
router.put('/bid/:bidId', protect, authorize('freelancer'), updateBid);

module.exports = router;
