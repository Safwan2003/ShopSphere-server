const express = require('express');
const SearchHistory = require('../models/SearchHistory');
const auth = require('../middleware/auth');
const router = express.Router();

// Route to save search history
router.post('/', auth, async (req, res) => {
  const { searchTerm } = req.body;

  try {
    const searchHistory = new SearchHistory({
      user: req.user.id,
      searchTerm
    });

    await searchHistory.save();
    res.status(201).json(searchHistory);
  } catch (error) {
    console.error('Error saving search history:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route to get all search history for a user
router.get('/', auth, async (req, res) => {
  try {
    const searchHistories = await SearchHistory.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(searchHistories);
  } catch (error) {
    console.error('Error fetching search history:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route to delete a specific search history
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const searchHistory = await SearchHistory.findById(id);

    if (!searchHistory) {
      return res.status(404).json({ message: 'Search history not found' });
    }

    if (searchHistory.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await searchHistory.deleteOne();
    res.status(200).json({ message: 'Search history deleted' });
  } catch (error) {
    console.error('Error deleting search history:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route to clear all search history for a user
router.delete('/', auth, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ user: req.user.id });
    res.status(200).json({ message: 'All search history cleared' });
  } catch (error) {
    console.error('Error clearing search history:', error.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
