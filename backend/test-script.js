const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
mongoose.connect('mongodb://localhost:27017/freelance-app').then(async () => {
  const Job = require('./models/Job');
  const User = require('./models/User');
  const job = await Job.findOne({ selectedFreelancer: { $ne: null } });
  if (!job) {
    console.log('No job with selected freelancer');
    process.exit(0);
  }
  const client = await User.findById(job.client);
  const token = jwt.sign({ id: client._id, role: client.role }, 'supersecretjwtkey123!', { expiresIn: '1d' });
  
  const axios = require('axios');
  try {
    const res = await axios.post('http://localhost:5000/api/payments/create-order', { jobId: job._id }, { headers: { Authorization: 'Bearer ' + token } });
    console.log('SUCCESS:', res.data);
  } catch(err) {
    console.log('ERROR:', err.response ? err.response.data : err.message);
  }
  process.exit(0);
});
