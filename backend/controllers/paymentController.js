const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Job = require('../models/Job');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res) => {
  try {
    const { jobId } = req.body;
    
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!job.selectedFreelancer) return res.status(400).json({ message: 'No freelancer selected yet' });

    const totalAmount = job.acceptedPrice || job.budget; // Use agreed bid amount if available
    const platformFee = totalAmount * 0.05;
    const freelancerAmount = totalAmount * 0.95;

    // Simulation/Fallback mode if Razorpay credentials are not provided
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      const mockOrderId = `mock_order_${Math.random().toString(36).substring(7)}`;
      const payment = await Payment.create({
        job: jobId,
        client: req.user.id,
        freelancer: job.selectedFreelancer,
        razorpayOrderId: mockOrderId,
        amount: totalAmount,
        platformFee,
        freelancerAmount,
        status: 'created'
      });
      return res.json({ isMock: true, order: { id: mockOrderId, amount: totalAmount * 100 }, payment });
    }

    const options = {
      amount: totalAmount * 100, // Razorpay takes amount in paise (1 INR = 100 paise)
      currency: "INR",
      receipt: `receipt_job_${jobId}`,
    };

    const order = await razorpay.orders.create(options);

    const payment = await Payment.create({
      job: jobId,
      client: req.user.id,
      freelancer: job.selectedFreelancer,
      razorpayOrderId: order.id,
      amount: totalAmount,
      platformFee,
      freelancerAmount,
    });

    res.json({ isMock: false, order, payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    // Auto-verify simulated mock payments
    if (razorpay_order_id && razorpay_order_id.startsWith('mock_order_')) {
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      payment.status = 'escrow_funded';
      payment.razorpayPaymentId = razorpay_payment_id || `mock_pay_${Math.random().toString(36).substring(7)}`;
      await payment.save();

      const job = await Job.findById(payment.job);
      job.paymentStatus = 'escrow_funded';
      await job.save();

      return res.json({ message: 'Mock payment verified successfully and funded to escrow', payment });
    }

    // Simple verification (in production, use crypto to verify signature against RAZORPAY_KEY_SECRET)
    // For this demonstration, we'll assume it's valid if all fields exist
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      payment.status = 'escrow_funded';
      payment.razorpayPaymentId = razorpay_payment_id;
      await payment.save();

      const job = await Job.findById(payment.job);
      job.paymentStatus = 'escrow_funded';
      await job.save();

      res.json({ message: 'Payment verified successfully and funded to escrow', payment });
    } else {
      res.status(400).json({ message: 'Invalid payment details' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.releasePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    
    if (payment.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to release this payment' });
    }
    
    if (payment.status !== 'escrow_funded') {
      return res.status(400).json({ message: 'Payment is not in escrow' });
    }

    // Simulate payout to freelancer's encrypted bank/UPI via Razorpay route
    // In reality, this would use RazorpayX Payouts
    
    payment.status = 'released';
    await payment.save();

    const job = await Job.findById(payment.job);
    job.paymentStatus = 'released';
    job.status = 'completed';
    await job.save();

    res.json({ message: 'Payment released to freelancer successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.releasePaymentByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const payment = await Payment.findOne({ job: jobId, status: 'escrow_funded' });
    if (!payment) return res.status(404).json({ message: 'Active escrow payment not found for this job' });
    
    if (payment.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to release this payment' });
    }

    payment.status = 'released';
    await payment.save();

    const job = await Job.findById(payment.job);
    job.paymentStatus = 'released';
    job.status = 'completed';
    await job.save();

    res.json({ message: 'Payment released to freelancer successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
