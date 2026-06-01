const express = require('express');
const { createOrder, verifyPayment, releasePayment, releasePaymentByJobId } = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.post('/create-order', protect, authorize('client'), createOrder);
router.post('/verify', protect, authorize('client'), verifyPayment);
router.post('/release/job/:jobId', protect, authorize('client'), releasePaymentByJobId);
router.post('/:paymentId/release', protect, authorize('client'), releasePayment);
router.get('/config/key', protect, (req, res) => res.json({ key: process.env.RAZORPAY_KEY_ID }));

module.exports = router;
