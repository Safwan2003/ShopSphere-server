const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Product = require('../models/Product');
const Category = require('../models/Category');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload function for multiple images and video
const uploadToCloudinary = async (file, resourceType) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
};

// Create a product with image and video upload
router.post('/', auth, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const { name, price, description, category, colors,video_url ,stock} = req.body;

  if (!name || !price || !description || !category) {
    return res.status(400).json({ message: 'All fields except image and video are required' });
  }

  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ message: 'Invalid price. Price must be a positive number.' });
  }

  try {
    const validCategory = await Category.findById(category);
    if (!validCategory) return res.status(400).json({ message: 'Invalid category' });

    let imageUrls = [];
    if (req.files['images']) {
      for (const image of req.files['images']) {
        const imageUrl = await uploadToCloudinary(image, 'image');
        imageUrls.push(imageUrl);
      }
    }

    let videoUrl = '';
    if (req.files['video']) {
      videoUrl = await uploadToCloudinary(req.files['video'][0], 'video');
    }

    const product = new Product({
      name,
      price,
      description,
      category,
      colors: colors ? colors.split(',') : [],
      images: imageUrls,
      video_url,
      stock,
      video: videoUrl
    });

    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Read all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category', 'name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving products', error: error.message });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving product', error: error.message });
  }
});

// Update a product with optional image and video upload
router.put('/:id', [auth, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }])], async (req, res) => {
  const { name, price, description, category, colors,video_url,stock } = req.body;
  const productId = req.params.id;

  if (!name || !price || !description || !category) {
    return res.status(400).json({ message: 'All fields except image and video are required' });
  }

  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ message: 'Invalid price. Price must be a positive number.' });
  }

  try {
    const validCategory = await Category.findById(category);
    if (!validCategory) return res.status(400).json({ message: 'Invalid category' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.files['images']) {
      const imageUrls = [];
      for (const image of req.files['images']) {
        const imageUrl = await uploadToCloudinary(image, 'image');
        imageUrls.push(imageUrl);
      }
      product.images = imageUrls;
    }

    if (req.files['video']) {
      const videoUrl = await uploadToCloudinary(req.files['video'][0], 'video');
      product.video = videoUrl;
    }

    product.name = name;
    product.price = price;
    product.description = description;
    product.category = category;
    product.stock = stock;
    product.video_url = video_url;
    product.colors = colors ? colors.split(',') : [];

    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a product
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Track product views
router.post('/view-product/:productId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = req.params.productId;

    await User.findByIdAndUpdate(userId, { $addToSet: { viewedProducts: productId } });
    res.status(200).json({ message: 'Product view tracked' });
  } catch (error) {
    res.status(500).json({ message: 'Error tracking product view' });
  }
});

module.exports = router;
