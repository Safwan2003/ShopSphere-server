const UserInteraction = require('./models/UserInteraction');
const SearchHistory = require('./models/SearchHistory');
const Order = require('./models/Order');
const Product = require('./models/Product');

// Example function to get recommendations
async function getRecommendations(userId) {
  try {
    // Fetch user interactions
    const interactions = await UserInteraction.find({ user: userId });

    // Fetch search history
    const searchHistory = await SearchHistory.find({ user: userId });

    // Fetch order history
    const orders = await Order.find({ user: userId });

    // Get all products
    const products = await Product.find();

    // Create a map of product IDs to product details
    const productMap = products.reduce((acc, product) => {
      acc[product._id] = product;
      return acc;
    }, {});

    // Extract product IDs from interactions, search history, and orders
    const interactedProductIds = interactions.map(interaction => interaction.product.toString());
    const searchedTerms = searchHistory.map(search => search.searchTerm.toLowerCase());
    const orderedProductIds = orders.flatMap(order => order.orderItems.map(item => item.product.toString()));

    // Filter products based on interactions, searches, and orders
    const recommendedProducts = products.filter(product => {
      // Example recommendation logic:
      // 1. Products that the user has interacted with but not purchased yet
      // 2. Products that match the search terms
      // 3. Products similar to those that the user has ordered
      return !interactedProductIds.includes(product._id.toString()) &&
             (searchedTerms.some(term => product.name.toLowerCase().includes(term)) ||
              orderedProductIds.includes(product._id.toString()));
    });

    // Optionally sort recommendations by relevance, popularity, etc.
    // For simplicity, we are not implementing sorting here

    return recommendedProducts;
  } catch (error) {
    console.error('Error getting recommendations:', error.message);
    throw new Error('Recommendation Error');
  }
}

module.exports = { getRecommendations };
