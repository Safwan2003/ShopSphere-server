// routes/rewardRoutes.js
const express = require('express');
const Reward = require('../models/Reward');
const auth = require('../middleware/auth');
const router = express.Router();


router.get('/', auth, async (req, res) => {
    const  userId = req.user.id;
  console.log(req.user.id)
    try {
      const reward = await Reward.findOne({ user: userId });
      if (!reward) {
        return res.status(404).json({ message: 'Reward record not found' });
      }
  
      res.json(reward);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);







router.post('/redeem', auth, async (req, res) => {
    const {  pointsToRedeem } = req.body;
  const userId=req.user.id
    try {
      const reward = await Reward.findOne({ user: userId });
      if (!reward) {
        return res.status(404).json({ message: 'Reward record not found' });
      }
  
      if (reward.points < pointsToRedeem) {
        return res.status(400).json({ message: 'Insufficient reward points' });
      }
  
      reward.points -= pointsToRedeem;
      await reward.save();
  
      const discount = pointsToRedeem * 0.1;
  
      res.json({ message: 'Rewards redeemed successfully', discount });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
  );

module.exports = router;
