const ContactMessage = require('../models/ContactMessage');

exports.submitContactMessage = async (req, res) => {
  try {
    const { subject, message } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: 'Must be logged in' });
    }

    const newMessage = new ContactMessage({
      user: req.user.id,
      name: req.user.name,
      email: req.user.email,
      subject,
      message
    });

    await newMessage.save();

    res.status(201).json({ message: 'Message submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
