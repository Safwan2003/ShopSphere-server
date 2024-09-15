const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Reference to a Category model
  colors: [{ type: String }], // Array of color options
  images: [{ type: String }], // Array of image URLs
  video: { type: String }, // Local video URL (if any)
  video_url: { type: String }, // YouTube video URL
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
