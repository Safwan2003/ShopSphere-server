const express = require('express');
const UserInteraction = require('../models/UserInteraction');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { productId, action } = req.body;

  if (!productId || !action) {
    return res.status(400).json({ message: 'Product ID and action are required' });
  }

  try {
    const interaction = new UserInteraction({
      user: req.user.id,
      product: productId,
      action,
    });

    await interaction.save();
    res.status(201).json(interaction);
  } catch (error) {
    console.error('Error logging user interaction:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
