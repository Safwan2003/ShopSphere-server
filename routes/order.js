const express = require('express');
const Order = require('../models/Order'); // Ensure the path is correct
const auth = require('../middleware/auth'); // Ensure the path is correct
const router = express.Router();
const Reward = require('../models/Reward');
const RewardPolicy = require('../models/RewardPolicy');
const User = require('../models/User'); // Import User model
const { io } = require('../index'); // Import the io instance from your server
const nodemailer = require('nodemailer');



// Create a transporter using your email service credentials
const transporter = nodemailer.createTransport({
  service: 'Gmail', // e.g., 'Gmail', 'Yahoo', etc.
  auth: {
    user: process.env.GMAIL_USER, // Add your email address to your .env file
    pass: process.env.GMAIL_PASS, // Add your email password to your .env file
  },
});



// Function to send an email
const sendOrderEmail = async (order, userEmail) => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: userEmail,
    subject: 'Order Confirmation',
    text: `Your order with ID: ${order._id} has been successfully placed.`,
    html: `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order!</p>
      <p>Order ID: ${order._id}</p>
      <p>Total Price: $${order.totalPrice}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent');
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
  }
};

























// Get orders for a specific user or all orders for admin
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from the request
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }); // Sort orders by creation date
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Create an order
router.post('/', auth, async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    color,
    phoneNumber,
  } = req.body;

  const missingFields = [];
  if (!orderItems) missingFields.push('orderItems');
  if (!shippingAddress) missingFields.push('shippingAddress');
  if (!paymentMethod) missingFields.push('paymentMethod');
  if (!itemsPrice) missingFields.push('itemsPrice');
  if (!taxPrice) missingFields.push('taxPrice');
  if (!shippingPrice) missingFields.push('shippingPrice');
  if (!totalPrice) missingFields.push('totalPrice');
  if (!phoneNumber) missingFields.push('phoneNumber');
  if (!req.user || !req.user.id) missingFields.push('user');

  if (missingFields.length > 0) {
    return res.status(400).json({ message: `Missing fields: ${missingFields.join(', ')}` });
  }

  try {
    const newOrder = new Order({
      user: req.user.id,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      color,
      phoneNumber,
    });

    const savedOrder = await newOrder.save();

    // Notify admin or users via WebSocket
    const notification = {
      type: 'order',
      message: `New order placed by user ${req.user.id}.`,
      order: savedOrder,
    };

    io.emit('receiveNotification', notification);
    console.log(notification);





// Send email to admin
const mailOptions = {
  from: process.env.GMAIL_USER,
  to: process.env.GMAIL_USER, // Send to admin
  subject: 'New Order Placed',
  text: `A new order has been placed by user ${req.user.id}. Total price: $${totalPrice.toFixed(2)}. Please check the admin dashboard for details.`,
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error('Error sending email:', error.message);
  }
  console.log('Email sent:', info.response);
});




    // Send order confirmation email
    const user = await User.findById(req.user.id);
    sendOrderEmail(savedOrder, user.email);

    const productIds = orderItems.map(item => item.product);
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { purchasedProducts: { $each: productIds } } });

    // Integrate reward system
    const activePolicy = await RewardPolicy.findOne({ isActive: true });
    if (activePolicy) {
      const rewardPoints = Math.floor(totalPrice * activePolicy.pointsPerCurrencyUnit);

      let reward = await Reward.findOne({ user: req.user.id });
      if (!reward) {
        reward = new Reward({ user: req.user.id, points: rewardPoints });
      } else {
        reward.points += rewardPoints;
      }
      await reward.save();
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Order creation error:', error.message);
    res.status(400).json({ message: error.message });
  }
});


// Get all orders (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update an order (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete an order (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
