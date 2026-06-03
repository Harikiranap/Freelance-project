const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { encrypt } = require('../utils/crypto');
const nodemailer = require('nodemailer');

const generateToken = (id, role, isProfileComplete) => {
  return jwt.sign({ id, role, isProfileComplete }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Setup Nodemailer for OTP (using ethereal email for testing purposes)
// In production, configure this with real SMTP (Gmail, SendGrid)
let transporter;
nodemailer.createTestAccount().then(account => {
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
  console.log("Mock Email Setup Completed. Check ethereal.email for OTPs.");
});

exports.register = async (req, res) => {
  try {
    const { name, username, email, password, role, skills, companyName, upiId } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Encrypt sensitive info
    const encryptedUpi = upiId ? encrypt(upiId) : undefined;

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role,
      skills,
      companyName,
      upiId: encryptedUpi,
      otp,
      otpExpires
    });

    if (user) {
      // Send OTP via email
      if (transporter) {
        const info = await transporter.sendMail({
          from: '"WorkSphere" <noreply@worksphere.com>',
          to: user.email,
          subject: "Your Verification Code",
          text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
        });
        console.log("OTP Email Sent! View it here: " + nodemailer.getTestMessageUrl(info));
      }

      res.status(201).json({
        message: 'User registered. Please verify OTP sent to email.',
        email: user.email
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });
    
    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user._id, user.role, user.isProfileComplete),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // The 'email' field from the frontend can be either email or username
    const user = await User.findOne({ $or: [{ email }, { username: email }] });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email first', email: user.email, requireVerification: true });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        token: generateToken(user._id, user.role, user.isProfileComplete),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { name, email } = req.body;
    let user = await User.findOne({ email });

    if (!user) {
      // Don't create the user yet, return 202 requiring role selection
      return res.status(202).json({
        requiresRole: true,
        name,
        email
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user._id, user.role, user.isProfileComplete),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.completeProfile = async (req, res) => {
  try {
    const { skills, portfolioUrl, phoneNumber, upiId, bankAccount } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.skills = skills || user.skills;
    user.portfolioUrl = portfolioUrl;
    user.phoneNumber = phoneNumber;
    if (upiId) user.upiId = encrypt(upiId);
    if (bankAccount) user.bankAccount = encrypt(bankAccount);
    
    user.isProfileComplete = true;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user._id, user.role, user.isProfileComplete),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleComplete = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const randomPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);
    
    user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role, 
      authProvider: 'google',
      isVerified: true
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user._id, user.role, user.isProfileComplete),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { companyName, phoneNumber, skills, portfolioUrl } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (phoneNumber) user.phoneNumber = phoneNumber;
    
    if (user.role === 'client') {
      if (companyName) user.companyName = companyName;
    } else if (user.role === 'freelancer') {
      if (skills) user.skills = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean);
      if (portfolioUrl) user.portfolioUrl = portfolioUrl;
    }
    
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isProfileComplete: user.isProfileComplete,
      token: generateToken(user._id, user.role, user.isProfileComplete),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
