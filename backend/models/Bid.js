const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true }, // in INR
    proposal: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    negotiationHistory: [
      {
        offeredBy: { type: String, enum: ['client', 'freelancer'], required: true },
        amount: { type: Number, required: true },
        message: String,
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bid', bidSchema);
