/**
 * Simple test to check if TensorFlow.js can be imported correctly
 */

import * as tf from '@tensorflow/tfjs-node';

console.log("TensorFlow import successful!");
console.log(`TensorFlow version: ${tf.version.tfjs}`);

// Create a simple model to test TensorFlow functionality
try {
  // Create a simple model
  const model = tf.sequential();
  model.add(tf.layers.dense({units: 1, inputShape: [1]}));
  
  // Compile the model
  model.compile({
    loss: 'meanSquaredError',
    optimizer: 'sgd'
  });
  
  console.log("Successfully created and compiled a TensorFlow model");
  
  // Create some fake data
  const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
  const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);
  
  // Train the model synchronously for 10 epochs
  model.fit(xs, ys, {
    epochs: 10,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
      }
    }
  }).then(() => {
    // Make a prediction
    const output = model.predict(tf.tensor2d([5], [1, 1]));
    output.print();
    console.log("TensorFlow prediction test successful!");
  });
} catch (error) {
  console.error("Error testing TensorFlow:", error);
} 