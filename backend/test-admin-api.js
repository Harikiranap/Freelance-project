const axios = require('axios');

async function testApi() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful! Token acquired.');

    console.log('Fetching admin stats...');
    const statsRes = await axios.get('http://localhost:5000/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('--- BACKEND STATS API RESPONSE ---');
    console.log('userCount:', statsRes.data.userCount);
    console.log('jobCount:', statsRes.data.jobCount);
    console.log('paymentCount:', statsRes.data.paymentCount);
    console.log('totalEscrowVolume:', statsRes.data.totalEscrowVolume);
    console.log('platformFees:', statsRes.data.platformFees);
    console.log('payments array length:', statsRes.data.payments?.length);
    console.log('jobsStatus:', statsRes.data.jobsStatus);
    
  } catch (error) {
    console.error('API test failed:', error.response ? error.response.data : error.message);
  }
}

testApi();
