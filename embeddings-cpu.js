/**
 * Vector Embeddings Module for Cursor-Cortex
 *
 * Generate, store, and query vector embeddings for knowledge documents.
 * Uses pure TensorFlow.js (CPU) — avoids @tensorflow/tfjs-node, whose native
 * binding can hang indefinitely on some macOS setups and block MCP startup.
 */

import { Console } from 'node:console';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Storage paths
const STORAGE_PATHS = {
  root: path.join(os.homedir(), '.cursor-cortex'),
  embeddings: path.join(os.homedir(), '.cursor-cortex', 'embeddings')
};

let modelInstance = null;
let isModelLoading = false;

/**
 * MCP uses stdout for JSON-RPC. Only redirect console.log/warn — never
 * process.stdout.write. Patching stdout races with concurrent tool replies
 * and can send JSON-RPC to stderr, which makes Cursor hang waiting forever.
 *
 * Keep the redirect permanently (do not restore). Restoring used to re-enable
 * dependency console.log on stdout after model load and break the MCP client.
 * Write to a stderr-bound Console so these stay logs, not console.error.
 */
const stderrConsole = new Console({
  stdout: process.stderr,
  stderr: process.stderr,
});

function withStdoutSafeLogs(fn) {
  console.log = (...args) => stderrConsole.log(...args);
  console.info = (...args) => stderrConsole.info(...args);
  console.debug = (...args) => stderrConsole.debug(...args);
  console.warn = (...args) => stderrConsole.warn(...args);
  return Promise.resolve().then(fn);
}

/**
 * Initialize TensorFlow.js CPU backend and Universal Sentence Encoder model
 * @returns {Promise<Object>} The loaded model
 */
async function initializeModel() {
  if (modelInstance) return modelInstance;
  
  if (isModelLoading) {
    // Wait for existing load to complete
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelInstance;
  }

  try {
    isModelLoading = true;

    console.log('Loading Universal Sentence Encoder (TensorFlow.js CPU)...');

    await withStdoutSafeLogs(async () => {
      await tf.ready();
      modelInstance = await use.load();
    });

    console.log('Model loaded successfully');
    console.log('Backend:', tf.getBackend());
    
    return modelInstance;
    
  } catch (error) {
    console.error('Failed to load model:', error.message);
    throw error;
  } finally {
    isModelLoading = false;
  }
}

/**
 * Generate embeddings for a text string
 * @param {string} text - The text to embed
 * @returns {Promise<Float32Array>} The embedding vector
 */
async function generateEmbedding(text) {
  const model = await initializeModel();
  
  // Generate embedding
  const embeddings = await model.embed(text);
  
  // Convert to regular array for storage
  const embeddingArray = await embeddings.array();
  
  // Clean up tensor memory
  embeddings.dispose();
  
  return embeddingArray[0]; // Return just the first embedding
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array|Float32Array} vecA - First vector
 * @param {Array|Float32Array} vecB - Second vector
 * @returns {number} Similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions must match');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Store embedding for a document
 * @param {string} projectName - Project name
 * @param {string} documentName - Document filename
 * @param {Float32Array} embedding - The embedding vector
 */
async function storeEmbedding(projectName, documentName, embedding) {
  const embeddingDir = path.join(STORAGE_PATHS.embeddings, projectName);
  await fs.mkdir(embeddingDir, { recursive: true });
  
  const embeddingFile = path.join(embeddingDir, `${documentName}.json`);
  const embeddingData = {
    document: documentName,
    embedding: Array.from(embedding),
    timestamp: new Date().toISOString(),
    backend: tf.getBackend()
  };
  
  await fs.writeFile(embeddingFile, JSON.stringify(embeddingData, null, 2));
}

/**
 * Load embedding for a document
 * @param {string} projectName - Project name
 * @param {string} documentName - Document filename
 * @returns {Promise<Float32Array|null>} The embedding vector or null if not found
 */
async function loadEmbedding(projectName, documentName) {
  try {
    const embeddingFile = path.join(STORAGE_PATHS.embeddings, projectName, `${documentName}.json`);
    const data = await fs.readFile(embeddingFile, 'utf8');
    const embeddingData = JSON.parse(data);
    return new Float32Array(embeddingData.embedding);
  } catch (error) {
    return null; // Embedding not found
  }
}

/**
 * Find similar documents using vector similarity
 * @param {string} queryText - The search query
 * @param {string} projectName - Project to search in
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of {document, similarity} objects
 */
async function findSimilarDocuments(queryText, projectName, threshold = 0.3, limit = 10) {
  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Load all stored embeddings for the project
    const embeddingDir = path.join(STORAGE_PATHS.embeddings, projectName);
    
    try {
      await fs.access(embeddingDir);
    } catch {
      return []; // No embeddings directory
    }
    
    const embeddingFiles = await fs.readdir(embeddingDir);
    const results = [];
    
    for (const file of embeddingFiles) {
      if (!file.endsWith('.json')) continue;
      
      const documentName = file.replace('.json', '');
      const docEmbedding = await loadEmbedding(projectName, documentName);
      
      if (docEmbedding) {
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        
        if (similarity >= threshold) {
          results.push({
            document: documentName,
            similarity: similarity
          });
        }
      }
    }
    
    // Sort by similarity descending and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
      
  } catch (error) {
    console.error('Error in semantic search:', error.message);
    return [];
  }
}

/**
 * Check if the model is available
 * @returns {Promise<boolean>} True if model can be loaded
 */
async function isModelAvailable() {
  try {
    await initializeModel();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get current backend information
 * @returns {Object} Backend information
 */
function getBackendInfo() {
  return {
    backend: tf.getBackend(),
    available: true,
    type: 'cpu'
  };
}

// ES6 exports for compatibility with index.js
export {
  generateEmbedding,
  storeEmbedding,
  loadEmbedding,
  findSimilarDocuments,
  cosineSimilarity,
  cosineSimilarity as calculateCosineSimilarity, // Alias for compatibility
  isModelAvailable,
  getBackendInfo,
  initializeModel
};
