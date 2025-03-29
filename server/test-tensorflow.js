// Simple script to test TensorFlow.js installation
console.log('Testing TensorFlow.js installation...');

try {
  console.log('Loading @tensorflow/tfjs-node...');
  const tf = require('@tensorflow/tfjs-node');
  
  console.log('TensorFlow.js version:', tf.version.tfjs);
  console.log('TensorFlow C++ backend version:', tf.version.core);
  
  // Create a simple tensor
  console.log('Creating a simple tensor...');
  const tensor = tf.tensor2d([[1, 2], [3, 4]]);
  console.log('Tensor shape:', tensor.shape);
  
  // Perform a simple operation
  console.log('Performing a simple matrix multiplication...');
  const result = tensor.matMul(tensor);
  console.log('Result shape:', result.shape);
  console.log('Result values:', result.arraySync());
  
  console.log('TensorFlow.js is working correctly!');
} catch (error) {
  console.error('Error testing TensorFlow.js:');
  console.error(error);
  
  // Check if the libraries exist
  const fs = require('fs');
  const path = require('path');
  
  const tfLibPath = path.join(__dirname, 'node_modules/@tensorflow/tfjs-node/lib/napi-v8');
  console.log(`Checking TensorFlow library path: ${tfLibPath}`);
  
  try {
    if (fs.existsSync(tfLibPath)) {
      console.log('Library directory exists. Contents:');
      const files = fs.readdirSync(tfLibPath);
      console.log(files);
    } else {
      console.log('Library directory does not exist!');
    }
  } catch (fsError) {
    console.error('Error checking library path:', fsError);
  }
  
  process.exit(1);
} 