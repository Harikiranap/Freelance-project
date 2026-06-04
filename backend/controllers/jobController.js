const Job = require('../models/Job');
const Bid = require('../models/Bid');
const Message = require('../models/Message');
const User = require('../models/User');
const { decrypt } = require('../utils/crypto');
const axios = require('axios');

exports.createJob = async (req, res) => {
  try {
    const { title, description, budget, skills, category } = req.body;
    const job = await Job.create({
      client: req.user.id,
      title,
      description,
      budget,
      skills,
      category
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open', isApproved: true }).populate('client', 'name companyName');
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    if (req.user.role === 'client') {
      const jobs = await Job.find({ client: req.user.id }).populate('selectedFreelancer', 'name email').sort({ createdAt: -1 });
      res.json(jobs);
    } else {
      const bids = await Bid.find({ freelancer: req.user.id }).populate({
        path: 'job',
        populate: { path: 'client', select: 'name companyName' }
      });
      const jobs = bids.map(bid => bid.job).filter(job => job != null);
      const uniqueJobs = Array.from(new Set(jobs.map(j => j._id.toString())))
        .map(id => jobs.find(j => j._id.toString() === id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(uniqueJobs);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobMessages = async (req, res) => {
  try {
    const { jobId } = req.params;
    const messages = await Message.find({ job: jobId }).sort({ createdAt: 1 });
    
    // Decrypt messages for authorized client reading
    const decryptedMessages = messages.map(msg => {
      try {
        return {
          _id: msg._id,
          sender: msg.sender,
          receiver: msg.receiver,
          job: msg.job,
          content: decrypt(msg.content),
          createdAt: msg.createdAt,
          updatedAt: msg.updatedAt
        };
      } catch (err) {
        return msg;
      }
    });

    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobBids = async (req, res) => {
  try {
    const { jobId } = req.params;
    const bids = await Bid.find({ job: jobId }).populate('freelancer', 'name email skills rating');
    res.json(bids);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.placeBid = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { amount, proposal } = req.body;
    
    // Check if freelancer is approved by admin
    const userProfile = await User.findById(req.user.id);
    if (!userProfile || !userProfile.isFreelancerApproved) {
      return res.status(403).json({ message: 'Your account is pending admin approval. You cannot place bids yet.' });
    }

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'open') {
      return res.status(404).json({ message: 'Job not found or not open' });
    }

    const bid = await Bid.create({
      job: jobId,
      freelancer: req.user.id,
      amount,
      proposal
    });

    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    
    const bid = await Bid.findById(bidId).populate('job');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Ensure only the client who posted the job can accept the bid
    if (bid.job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update Bid status
    bid.status = 'accepted';
    await bid.save();

    // Reject all other bids for this job
    await Bid.updateMany(
      { job: bid.job._id, _id: { $ne: bidId } },
      { $set: { status: 'rejected' } }
    );

    // Update Job
    const job = await Job.findById(bid.job._id);
    job.status = 'in-progress';
    job.selectedFreelancer = bid.freelancer;
    job.acceptedPrice = bid.amount; // Save agreed bid amount
    await job.save();

    res.json({ message: 'Bid accepted, job in progress', job, bid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deliverJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { deliverableLink } = req.body;
    
    if (!deliverableLink) {
      return res.status(400).json({ message: 'Deliverable link is required.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if current user is the selected freelancer
    if (job.selectedFreelancer?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to deliver this job' });
    }

    if (job.status !== 'in-progress') {
      return res.status(400).json({ message: 'Job is not in progress' });
    }

    job.status = 'delivered';
    job.deliverableLink = deliverableLink;
    await job.save();

    res.json({ message: 'Work delivered successfully, pending client review', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId)
      .populate('client', 'name email companyName')
      .populate('selectedFreelancer', 'name email skills rating portfolioUrl experience location');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveJob = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized, admin only' });
    }
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    
    job.isApproved = true;
    await job.save();
    res.json({ message: 'Job approved successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAiMatches = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to get AI matches for this job' });
    }

    const freelancers = await User.find({ role: 'freelancer' }).select('_id skills name username rating profileCompleteness');

    const payload = {
      job: {
        id: job._id.toString(),
        skills_required: job.skills
      },
      freelancers: freelancers.map(f => ({
        id: f._id.toString(),
        skills: f.skills
      }))
    };

    const aiResponse = await axios.post('http://127.0.0.1:8000/match', payload);
    const matches = aiResponse.data;

    const enrichedMatches = matches.map(match => {
      const fData = freelancers.find(f => f._id.toString() === match.freelancer_id);
      return {
        freelancer: fData,
        score: match.score
      };
    });

    res.status(200).json(enrichedMatches);
  } catch (error) {
    console.error('AI Matcher Error:', error.message);
    res.status(500).json({ message: 'Failed to generate AI matches' });
  }
};
