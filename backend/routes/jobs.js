const express = require('express');
const { createJob, getJobs, getMyJobs, getJobMessages, placeBid, acceptBid, getJobBids, deliverJob } = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.route('/')
  .get(getJobs)
  .post(protect, authorize('client'), createJob);

router.get('/my-jobs', protect, getMyJobs);
router.get('/:jobId/messages', protect, getJobMessages);
router.get('/:jobId/bids', protect, authorize('client'), getJobBids);

router.post('/:jobId/bid', protect, authorize('freelancer'), placeBid);
router.post('/:jobId/deliver', protect, authorize('freelancer'), deliverJob);
router.post('/bid/:bidId/accept', protect, authorize('client'), acceptBid);

module.exports = router;
