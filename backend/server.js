const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars FIRST
dotenv.config({ path: __dirname + "/.env" });

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const http = require('http');
const { Server } = require('socket.io');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);

// Simple test route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Setup Socket.io for Real-time chat
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const Message = require('./models/Message');
const User = require('./models/User');
const { encrypt } = require('./utils/crypto');
const { sendEmail } = require('./utils/email');

// Regex to detect personal details
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const phoneRegex = /\b\d{10}\b/; // Simplistic Indian phone number check
const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join a room based on Job ID (so client and freelancer chat in a specific job context)
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`User joined room: ${roomName}`);
  });

  socket.on('send_message', async (data) => {
    // data expected: { senderId, receiverId, jobId, content, roomName }
    const { senderId, receiverId, jobId, content, roomName } = data;

    // Filter personal info
    if (emailRegex.test(content) || phoneRegex.test(content) || upiRegex.test(content)) {
      // Emit warning back to sender
      socket.emit('warning', { message: 'Do not share personal contact details. Continue at your own risk.' });
      // Depending on policy, we might still send the message or block it. The prompt said "Block or warn user". Let's just warn and send for now.
    }

    // Encrypt before saving
    const encryptedContent = encrypt(content);

    try {
      const message = await Message.create({
        sender: senderId,
        receiver: receiverId,
        job: jobId,
        content: encryptedContent
      });

      // Broadcast to room (sending decrypted/plain text to clients, keeping DB encrypted at rest)
      io.to(roomName || jobId).emit('receive_message', {
        _id: message._id,
        sender: senderId,
        receiver: receiverId,
        job: jobId,
        content: content, // Decrypted/plain text for frontend display
        createdAt: message.createdAt
      });

      // Check if receiver is in the room
      const roomClients = io.sockets.adapter.rooms.get(roomName || jobId);
      if (!roomClients || roomClients.size < 2) {
        // Receiver is likely offline, send email notification
        const receiver = await User.findById(receiverId);
        if (receiver && receiver.email) {
          sendEmail(
            receiver.email,
            'New Message on WorkSphere',
            'You have received a new message regarding your project.',
            `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
               <h2>WorkSphere Notification</h2>
               <p>You have received a new secure message.</p>
               <br/>
               <a href="http://localhost:5173/dashboard" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Reply</a>
             </div>`
          );
        }
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
