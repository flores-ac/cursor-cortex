/**
 * Configuration constants for Cursor-Cortex
 */

import path from 'path';
import os from 'os';

// Storage root directory
export const STORAGE_ROOT = path.join(os.homedir(), '.cursor-cortex');

// Storage paths for different data types
export const STORAGE_PATHS = {
  knowledge: path.join(STORAGE_ROOT, 'knowledge'),
  context: path.join(STORAGE_ROOT, 'context'),
  branchNotes: path.join(STORAGE_ROOT, 'branch-notes'),
  checklists: path.join(STORAGE_ROOT, 'checklists'),
  tacitKnowledge: path.join(STORAGE_ROOT, 'tacit-knowledge'),
  embeddings: path.join(STORAGE_ROOT, 'embeddings'),
  criticalThinking: path.join(STORAGE_ROOT, 'critical-thinking')
};

// Server configuration
export const SERVER_CONFIG = {
  name: 'cursor-cortex',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
};

// Vector search configuration
export const VECTOR_CONFIG = {
  defaultSimilarityThreshold: 0.4,
  maxResults: 10,
  embeddingModel: 'universal-sentence-encoder'
};

// Default values
export const DEFAULTS = {
  branchName: 'main',
  projectName: 'default-project',
  similarityThreshold: 0.4
};
