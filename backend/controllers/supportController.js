const SupportMessage = require('../models/SupportMessage');
const User = require('../models/User');
const { decrypt, encrypt } = require('../utils/crypto');

exports.getUserSupportMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find({ user: req.user.id }).sort({ createdAt: 1 });
    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      content: decrypt(msg.content)
    }));
    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminSupportChats = async (req, res) => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 }).populate('user', 'name email role');
    
    // Group by user
    const chatsMap = new Map();
    messages.forEach(msg => {
      if (!msg.user) return; // User deleted
      const userId = msg.user._id.toString();
      if (!chatsMap.has(userId)) {
        chatsMap.set(userId, {
          user: msg.user,
          lastMessageAt: msg.createdAt,
          unreadCount: msg.senderModel === 'User' && !msg.isRead ? 1 : 0
        });
      } else {
        const chat = chatsMap.get(userId);
        if (msg.senderModel === 'User' && !msg.isRead) chat.unreadCount++;
      }
    });

    res.json(Array.from(chatsMap.values()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminSupportMessagesForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await SupportMessage.find({ user: userId }).sort({ createdAt: 1 });
    const decryptedMessages = messages.map(msg => ({
      ...msg.toObject(),
      content: decrypt(msg.content)
    }));
    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
