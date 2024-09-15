const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const http = require('http');
const socketIo = require('socket.io');
const Notification = require('./models/Notification'); // Path to your notification model
const sendMail = require('./config/mailer'); // Import the mailer function
const User = require('./models/User'); // Import the mailer function
const auth = require('./middleware/auth');
const tf = require('@tensorflow/tfjs');
const { getRecommendations } = require('./recommend');


dotenv.config();
require('./config/passport'); // Import passport configuration

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Your client URL
    methods: ['GET', 'POST'],
    credentials: true
  }


});




module.exports.io = io;

app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth/admin', require('./routes/Admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/user'));
app.use('/api/orders', require('./routes/order'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/rewards', require('./routes/reward'));
app.use('/api/reward-policies', require('./routes/rewardpolicy'));
app.use('/api/user-interaction', require('./routes/userinteraction'));
app.use('/api/search-history', require('./routes/searchhistory'));











// Notification routes
app.post('/api/notifications', async (req, res) => {
  try {
    const { message, type } = req.body; // Remove user
    const notification = new Notification({ message, type }); // No user field
    await notification.save();
    
    // Broadcast notification to all clients
    io.emit('receiveNotification', notification);
    
 // Send email to customers
 if (type === 'promotion') {
  const customers = await User.find({}); // Assuming you have a User model to get customer emails
  customers.forEach((customer) => {
    sendMail(
      customer.email,
      'New Promotion',
      message,
      `<p>${message}</p>`
    );
  });
 }


    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification', error });
  }
});


app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error });
  }
});


// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('sendNotification', (notification) => {
    console.log('Emitting notification:', notification); // Debugging line

    io.emit('receiveNotification', notification);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});






app.get('/api/recommendations',auth, async (req, res) => {
  try {
    const  userId  = req.user.id;
    const recommendations = await getRecommendations(userId);
   console.log(recommendations)
    res.json(recommendations);
  } catch (err) {
    console.error(err.message)
    res.status(500).json({ error: err.message });
  }
});









// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
