#!/usr/bin/env node

/**
 * Test TensorFlow.js CPU backend compatibility
 * Avoiding native binaries by using CPU-only backend
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';

async function testTensorFlowCPU() {
  try {
    console.log('🧪 Testing TensorFlow.js CPU backend...');
    
    // Set backend to CPU explicitly
    await tf.setBackend('cpu');
    
    console.log('✅ TensorFlow.js CPU backend set');
    console.log('Backend:', tf.getBackend());
    console.log('TensorFlow.js version:', tf.version.tfjs);
    
    // Test basic tensor operations
    const a = tf.tensor1d([1, 2, 3, 4]);
    const b = tf.tensor1d([5, 6, 7, 8]);
    const result = a.add(b);
    
    console.log('🔢 Test tensor operation:');
    console.log('a:', await a.data());
    console.log('b:', await b.data());
    console.log('a + b:', await result.data());
    
    // Clean up
    a.dispose();
    b.dispose();
    result.dispose();
    
    console.log('✅ TensorFlow.js CPU backend working!');
    return true;
    
  } catch (error) {
    console.error('❌ TensorFlow.js CPU backend failed:', error.message);
    return false;
  }
}

// Run test
testTensorFlowCPU().then(success => {
  process.exit(success ? 0 : 1);
});
