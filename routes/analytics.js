const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');

// Route to get total sales amount
router.get('/total-sales', async (req, res) => {
  try {
    const totalSales = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);
    res.json({ totalSales: totalSales[0]?.total || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get number of orders
router.get('/order-count', async (req, res) => {
  try {
    const orderCount = await Order.countDocuments();
    res.json({ orderCount });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get average order value
router.get('/average-order-value', async (req, res) => {
  try {
    const averageOrderValue = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, avgValue: { $avg: "$totalPrice" } } },
    ]);
    res.json({ averageOrderValue: averageOrderValue[0]?.avgValue || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get sales by category
// Route to get sales by category
router.get('/sales-by-category', async (req, res) => {
  try {
    const salesByCategory = await Order.aggregate([
      { $match: { isPaid: true } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.category", // This assumes orderItems.category is the category ID
          totalSales: { $sum: "$orderItems.price" },
        },
      },
      {
        $lookup: {
          from: "categories", // Assuming your collection name is "categories"
          localField: "_id",  // This should match the category ID
          foreignField: "_id", // The field in the Category collection that matches _id
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },
      {
        $project: {
          _id: 0,
          category: "$categoryDetails.name", // Project the name of the category
          totalSales: 1
        }
      }
    ]);
    res.json(salesByCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});


// Route to get total number of customers
router.get('/customer-count', async (req, res) => {
  try {
    const customerCount = await User.countDocuments({ isAdmin: false });
    res.json({ customerCount });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get new customers over a period (e.g., last 30 days)
router.get('/new-customers', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const newCustomers = await User.find({
      isAdmin: false,
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
    }).countDocuments();
    res.json({ newCustomers });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get top customers by purchase amount
router.get('/top-customers', async (req, res) => {
  try {
    const topCustomers = await Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: "$user", totalSpent: { $sum: "$totalPrice" } } },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
      { $unwind: "$userDetails" },
      { $project: { _id: 0, name: "$userDetails.name", email: "$userDetails.email", totalSpent: 1 } },
    ]);
    res.json(topCustomers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get top-selling products
router.get('/top-selling-products', async (req, res) => {
  try {
    const topSellingProducts = await Order.aggregate([
      { $match: { isPaid: true } },
      { $unwind: "$orderItems" },
      { $group: { _id: "$orderItems.product", totalQty: { $sum: "$orderItems.qty" } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
      { $unwind: "$productDetails" },
      { $project: { _id: 0, name: "$productDetails.name", totalQty: 1 } },
    ]);
    res.json(topSellingProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get number of orders by status
router.get('/orders-by-status', async (req, res) => {
  try {
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: { isPaid: "$isPaid", isDelivered: "$isDelivered" }, count: { $sum: 1 } } },
      { $project: { _id: 0, isPaid: "$_id.isPaid", isDelivered: "$_id.isDelivered", count: 1 } },
    ]);
    res.json(ordersByStatus);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get order volume over time (daily)
router.get('/order-volume-daily', async (req, res) => {
  try {
    const orderVolumeDaily = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json(orderVolumeDaily);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

// Route to get average time from order to delivery
router.get('/average-delivery-time', async (req, res) => {
  try {
    const averageDeliveryTime = await Order.aggregate([
      { $match: { isDelivered: true } },
      {
        $project: {
          diff: { $subtract: ["$deliveredAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$diff" },
        },
      },
    ]);
    res.json({ averageDeliveryTime: averageDeliveryTime[0]?.avgTime || 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error });
  }
});

module.exports = router;
