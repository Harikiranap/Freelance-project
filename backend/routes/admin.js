const express = require('express');
const { getStats, deleteUser, deleteJob, approveFreelancer, revokeFreelancer } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.delete('/users/:id', deleteUser);
router.delete('/jobs/:id', deleteJob);
router.post('/approve-freelancer/:id', approveFreelancer);
router.post('/revoke-freelancer/:id', revokeFreelancer);

module.exports = router;
