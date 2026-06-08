const express = require('express');
const { submitContactMessage } = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/', protect, submitContactMessage);

module.exports = router;
