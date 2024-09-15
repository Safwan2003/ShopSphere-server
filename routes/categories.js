const express = require('express');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const router = express.Router();

// Create a category
router.post('/', [auth, admin], async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Category name is required' });

        const category = new Category({ name });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error creating category', error: error.message });
    }
});

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
});

// Get a single category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category', error: error.message });
    }
});

// Update a category
router.put('/:id', [auth, admin], async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error updating category', error: error.message });
    }
});

// Delete a category
router.delete('/:id', [auth, admin], async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await category.deleteOne(); // This triggers the pre-remove middleware

        res.status(200).json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category', error: error.message });
    }
});

module.exports = router;
