const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    originalMessage: { type: String, required: true }, // Encrypted at rest
    violationType: { type: String, required: true }, // 'email' | 'phone' | 'upi' | 'multiple'
  },
  { timestamps: true }
);

module.exports = mongoose.model('Violation', violationSchema);
