const express = require('express');
const { getUserSupportMessages, getAdminSupportChats, getAdminSupportMessagesForUser } = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

router.get('/messages', getUserSupportMessages);
router.get('/admin/chats', authorize('admin'), getAdminSupportChats);
router.get('/admin/messages/:userId', authorize('admin'), getAdminSupportMessagesForUser);

module.exports = router;
