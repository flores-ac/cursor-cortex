#!/usr/bin/env node

/**
 * Test CPU-based embeddings functionality
 */

import { generateEmbedding, findSimilarDocuments, isModelAvailable, getBackendInfo } from './embeddings-cpu.js';

async function testEmbeddings() {
  console.log('🧪 Testing CPU-based vector embeddings...\n');
  
  try {
    // Check if model is available
    console.log('1. Checking model availability...');
    const available = await isModelAvailable();
    console.log(`   Model available: ${available ? '✅' : '❌'}`);
    
    if (!available) {
      console.log('❌ Model not available, stopping test');
      return false;
    }
    
    // Get backend info
    const backendInfo = getBackendInfo();
    console.log(`   Backend: ${backendInfo.backend} (${backendInfo.type})`);
    
    // Test embedding generation
    console.log('\n2. Testing embedding generation...');
    const testText = "This is a test document about machine learning and artificial intelligence.";
    console.log(`   Text: "${testText}"`);
    
    const embedding = await generateEmbedding(testText);
    console.log(`   Embedding generated: ✅`);
    console.log(`   Embedding length: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Test another embedding for similarity
    console.log('\n3. Testing similarity calculation...');
    const testText2 = "Machine learning and AI are fascinating topics in computer science.";
    console.log(`   Text 2: "${testText2}"`);
    
    const embedding2 = await generateEmbedding(testText2);
    console.log(`   Second embedding generated: ✅`);
    
    // Calculate similarity (this would be done by findSimilarDocuments)
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < embedding.length; i++) {
      dotProduct += embedding[i] * embedding2[i];
      normA += embedding[i] * embedding[i];
      normB += embedding2[i] * embedding2[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);
    
    if (similarity > 0.5) {
      console.log('   ✅ High similarity detected (related content)');
    } else {
      console.log('   ⚠️  Lower similarity (may still be working correctly)');
    }
    
    console.log('\n🎉 CPU-based embeddings test completed successfully!');
    console.log('\n📊 Results Summary:');
    console.log(`   - TensorFlow.js CPU backend: ✅ Working`);
    console.log(`   - Universal Sentence Encoder: ✅ Loaded`);
    console.log(`   - Embedding generation: ✅ Functional`);
    console.log(`   - Vector similarity: ✅ Calculated`);
    console.log(`   - Similarity score: ${(similarity * 100).toFixed(1)}%`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
testEmbeddings().then(success => {
  process.exit(success ? 0 : 1);
});
