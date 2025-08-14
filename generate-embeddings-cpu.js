#!/usr/bin/env node

/**
 * Generate embeddings for existing tacit knowledge documents using CPU backend
 */

import { generateEmbedding, storeEmbedding } from './embeddings-cpu.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const storageRoot = path.join(os.homedir(), '.cursor-cortex');

async function generateEmbeddingsForProject(projectName) {
  console.log(`\n📁 Processing project: ${projectName}`);
  
  const knowledgeDir = path.join(storageRoot, 'knowledge', projectName);
  
  try {
    const files = await fs.readdir(knowledgeDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`   Found ${mdFiles.length} documents`);
    
    for (const file of mdFiles) {
      try {
        console.log(`   🔄 Processing: ${file}`);
        
        // Read document content
        const filePath = path.join(knowledgeDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract meaningful text (title + some content)
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines.find(line => line.startsWith('#')) || file;
        const textContent = lines.slice(0, 10).join(' ').substring(0, 500); // First 500 chars
        const embeddingText = `${title} ${textContent}`;
        
        // Generate and store embedding
        const embedding = await generateEmbedding(embeddingText);
        await storeEmbedding(projectName, file.replace('.md', ''), embedding);
        
        console.log(`   ✅ Embedded: ${file}`);
        
      } catch (error) {
        console.error(`   ❌ Failed to process ${file}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to process project ${projectName}:`, error.message);
  }
}

async function main() {
  console.log('🧠 Generating embeddings for tacit knowledge documents...');
  
  try {
    // Get all projects
    const knowledgeRoot = path.join(storageRoot, 'knowledge');
    const projects = await fs.readdir(knowledgeRoot);
    
    console.log(`Found ${projects.length} projects: ${projects.join(', ')}`);
    
    for (const project of projects) {
      if (project !== '.DS_Store') {
        await generateEmbeddingsForProject(project);
      }
    }
    
    console.log('\n🎉 Embedding generation completed!');
    
  } catch (error) {
    console.error('❌ Failed to generate embeddings:', error.message);
    process.exit(1);
  }
}

main();
