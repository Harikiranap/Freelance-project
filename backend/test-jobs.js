const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/freelance-app').then(async () => {
  const Job = require('./models/Job');
  const jobs = await Job.find({ selectedFreelancer: { $ne: null } });
  jobs.forEach(job => {
    const basePrice = job.acceptedPrice || job.budget;
    const platformFee = basePrice * 0.05;
    const totalAmount = basePrice + platformFee;
    console.log('Job:', job._id, 'Title:', job.title, 'acceptedPrice:', job.acceptedPrice, 'budget:', job.budget, 'totalAmount:', totalAmount);
  });
  process.exit(0);
});
