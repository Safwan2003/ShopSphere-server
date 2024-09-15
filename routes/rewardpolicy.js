// routes/rewardPolicyRoutes.js
const express = require('express');
const RewardPolicy = require('../models/RewardPolicy'); // Ensure this import is correct
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  const { name, description, pointsPerCurrencyUnit } = req.body;

  try {
    const policy = new RewardPolicy({ name, description, pointsPerCurrencyUnit });
    await policy.save();
    res.json({ message: 'Reward policy created successfully', policy });
  } catch (error) {
    console.error(error.message)
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/', auth, async (req, res) => {
  const { policyId, name, description, pointsPerCurrencyUnit, isActive } = req.body;

  try {
    const policy = await RewardPolicy.findById(policyId);
    if (!policy) {
      return res.status(404).json({ message: 'Reward policy not found' });
    }

    policy.name = name || policy.name;
    policy.description = description || policy.description;
    policy.pointsPerCurrencyUnit = pointsPerCurrencyUnit || policy.pointsPerCurrencyUnit;
    policy.isActive = isActive !== undefined ? isActive : policy.isActive;

    await policy.save();
    res.json({ message: 'Reward policy updated successfully', policy });
  } catch (error) {
    console.error(error.message)

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const policies = await RewardPolicy.find();
    res.json(policies);
  } catch (error) {
    console.error(error.message)

    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
