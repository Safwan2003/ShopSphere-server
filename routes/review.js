// routes/reviews.js
const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const router = express.Router();

// Create a new review
router.post('/:productId', auth, async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const review = new Review({
      product: productId,
      user: userId,
      rating,
      comment
    });

    await review.save();

    const reviews = await Review.find({ product: productId });
    product.numReviews = reviews.length;
    product.averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    await product.save();

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Fetch reviews for a product
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const reviews = await Review.find({ product: productId }).populate('user', 'name');
    res.json(reviews);
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
