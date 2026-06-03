const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: Number, required: true }, // in INR
    skills: [{ type: String, required: true }],
    category: { type: String, required: true, default: 'Web Design' },
    isApproved: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'in-progress', 'delivered', 'completed', 'cancelled'], default: 'open' },
    deliverableLink: { type: String },
    selectedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acceptedPrice: { type: Number },
    paymentStatus: { type: String, enum: ['pending', 'escrow_funded', 'released'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
