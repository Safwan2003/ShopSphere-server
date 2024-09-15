const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  action: { type: String, enum: [ 'view', 'like', 'add_to_cart'], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Index to ensure uniqueness for each user-product-action combination
userInteractionSchema.index({ user: 1, product: 1, action: 1 }, { unique: true });

const UserInteraction = mongoose.model('UserInteraction', userInteractionSchema);

module.exports = UserInteraction;
