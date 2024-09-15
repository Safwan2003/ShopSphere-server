const tf = require('@tensorflow/tfjs');
const { MongoClient } = require('mongodb');

// MongoDB connection setup
const loadData = async () => {
  try {
    const client = new MongoClient(
      'mongodb+srv://safwanalimukaddam:0204kakwanplaza@cluster0.islosy4.mongodb.net/?retryWrites=true&w=majority'
    );
    await client.connect();
    
    const db = client.db('test');
    const orders = await db.collection('orders').find({}).toArray();
    const products = await db.collection('products').find({}).toArray();
    const categories = await db.collection('categories').find({}).toArray();
    const userInteractions = await db.collection('userinteractions').find({}).toArray();

    await client.close();
    
    return { orders, products, userInteractions, categories };
  } catch (err) {
    console.error('Error:', err.message);
  }
}

const processData = (orders, searchHistories, userInteractions) => {
  const userItemMatrix = {};

  orders.forEach(order => {
    const userId = order.user.toString(); // Convert ObjectId to string
    if (order.orderItems && Array.isArray(order.orderItems)) {
      order.orderItems.forEach(item => {
        const itemId = item.product.toString(); // Convert ObjectId to string
        if (!userItemMatrix[userId]) {
          userItemMatrix[userId] = new Set();
        }
        userItemMatrix[userId].add(itemId);
      });
    }
  });

  

  userInteractions.forEach(interaction => {
    const userId = interaction.user.toString(); // Convert ObjectId to string
    const itemId = interaction.product.toString(); // Convert ObjectId to string
    if (!userItemMatrix[userId]) {
      userItemMatrix[userId] = new Set();
    }
    userItemMatrix[userId].add(itemId);
  });

  // Convert sets to arrays for consistent processing
  Object.keys(userItemMatrix).forEach(userId => {
    userItemMatrix[userId] = Array.from(userItemMatrix[userId]);
  });

  return userItemMatrix;
}


const buildModel = (numItems) => {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [numItems] }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: numItems, activation: 'sigmoid' }));
  model.compile({ optimizer: 'adam', loss: 'binaryCrossentropy' });

  return model;
}

const processTrainingData = (userItemMatrix) => {
  const userIds = Object.keys(userItemMatrix);
  const itemIds = Array.from(new Set(Object.values(userItemMatrix).flat()));

  const numItems = itemIds.length;
  const inputs = [];
  const labels = [];

  userIds.forEach(userId => {
    const userVector = new Array(numItems).fill(0);

    itemIds.forEach((itemId, index) => {
      if (userItemMatrix[userId].includes(itemId)) { // Use includes for arrays
        userVector[index] = 1;
      }
    });

    inputs.push(userVector);
    labels.push(userVector); // For simplicity, using the same vector as labels
  });

  return { inputs, labels };
}


const trainModel = async (model, userItemMatrix) => {
  const { inputs, labels } = processTrainingData(userItemMatrix);
  const xs = tf.tensor2d(inputs);
  const ys = tf.tensor2d(labels);

  await model.fit(xs, ys, {
    epochs: 20,
    validationSplit: 0.1
  });

  return model;
}

const loadModel = async (numItems) => {
  return buildModel(numItems);
}

const getRecommendations = async (userId) => {
  const { orders, searchHistories, userInteractions } = await loadData();
  const userItemMatrix = processData(orders, searchHistories, userInteractions);
  const itemIds = Array.from(new Set(Object.values(userItemMatrix).flat()));

  if (itemIds.length === 0) {
    throw new Error('No items found for training.');
  }

  const model = await loadModel(itemIds.length);

  await trainModel(model, userItemMatrix);

  const userVector = new Array(itemIds.length).fill(0);
  if (userItemMatrix[userId]) {
    itemIds.forEach((itemId, index) => {
      if (userItemMatrix[userId].includes(itemId)) { // Use includes for arrays
        userVector[index] = 1;
      }
    });
  }

  const userTensor = tf.tensor2d([userVector]);
  const predictions = model.predict(userTensor).arraySync()[0];

  const recommendedItems = predictions
    .map((score, index) => ({ itemId: itemIds[index], score })) // Ensure itemId is a string
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 10 recommendations

  return recommendedItems;
}


module.exports={getRecommendations}

// // Example usage
// const exampleUserId = '66d338e05bbd8e628006a6a7'; // Ensure this user ID exists in your data
// getRecommendations(exampleUserId).then(recommendations => {
//   console.log('Recommendations:', recommendations);
// }).catch(err => {
//   console.error('Error getting recommendations:', err.message);
// });
