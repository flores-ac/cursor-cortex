#!/usr/bin/env node

/**
 * Generate embeddings for ALL Cursor-Cortex knowledge files using native Node backend
 * Handles: tacit knowledge, branch notes, context files, and archives
 * 
 * Usage:
 *   node generate-all-embeddings-cpu.js [--verbose] [--force]
 *   --verbose: Show detailed processing information
 *   --force: Regenerate embeddings even if they already exist
 */

// Polyfill is loaded by embeddings-cpu.js
import { generateEmbedding, storeEmbedding, loadEmbedding } from './embeddings-cpu.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Parse command line arguments
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const FORCE_REGENERATE = args.includes('--force');

// Logging functions
const log = (...args) => {
  if (VERBOSE) console.log(...args);
};

const info = (...args) => {
  console.log(...args);
};

const storageRoot = path.join(os.homedir(), '.cursor-cortex');

async function generateEmbeddingsForTacitKnowledge() {
  info('\n📚 Processing Tacit Knowledge...');
  
  const knowledgeRoot = path.join(storageRoot, 'knowledge');
  let stats = { total: 0, processed: 0, skipped: 0, errors: 0 };
  
  try {
    const projects = await fs.readdir(knowledgeRoot);
    log(`   Found ${projects.length} projects: ${projects.join(', ')}`);
    
    for (const project of projects) {
      if (project === '.DS_Store') continue;
      
      log(`\n📁 Processing project: ${project}`);
      const projectDir = path.join(knowledgeRoot, project);
      
      try {
        const files = await fs.readdir(projectDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        log(`   Found ${mdFiles.length} documents`);
        
        for (const file of mdFiles) {
          stats.total++;
          const docName = file.replace('.md', '');
          
          try {
            // Check if embedding already exists
            if (!FORCE_REGENERATE) {
              const existingEmbedding = await loadEmbedding(project, docName);
              if (existingEmbedding) {
                log(`   ⏭️  Skipping: ${file} (already exists)`);
                stats.skipped++;
                continue;
              }
            }
            
            log(`   🔄 Processing: ${file}`);
            
            const filePath = path.join(projectDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Extract meaningful text (title + content)
            const lines = content.split('\n').filter(line => line.trim());
            
            // Extract actual title from template (not "# Tacit Knowledge Capture")
            const titleMatch = content.match(/\*\*Title:\*\*\s*(.+)/);
            const actualTitle = titleMatch ? titleMatch[1] : file;
            
            // Extract tags for better semantic matching
            const tagsMatch = content.match(/\*\*Tags:\*\*\s*(.+)/);
            const tags = tagsMatch ? tagsMatch[1] : '';
            
            // Increase text window from 800 to 2000 chars
            const textContent = lines.slice(0, 20).join(' ').substring(0, 2000);
            const embeddingText = `${actualTitle} ${tags} ${textContent}`;
            
            // Generate and store embedding
            const embedding = await generateEmbedding(embeddingText);
            await storeEmbedding(project, docName, embedding);
            
            log(`   ✅ Embedded: ${file}`);
            stats.processed++;
            
          } catch (error) {
            log(`   ❌ Failed to process ${file}:`, error.message);
            stats.errors++;
          }
        }
      } catch (error) {
        log(`❌ Failed to process project ${project}:`, error.message);
        stats.errors++;
      }
    }
    
    info(`   📊 Tacit Knowledge: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.errors} errors (${stats.total} total)`);
  } catch (error) {
    info('❌ Failed to process tacit knowledge:', error.message);
  }
  
  return stats;
}

async function generateEmbeddingsForBranchNotes() {
  info('\n🌿 Processing Branch Notes...');
  
  const branchNotesRoot = path.join(storageRoot, 'branch_notes');
  let stats = { total: 0, processed: 0, skipped: 0, errors: 0 };
  
  try {
    const projects = await fs.readdir(branchNotesRoot);
    log(`   Found ${projects.length} projects: ${projects.join(', ')}`);
    
    for (const project of projects) {
      if (project === '.DS_Store') continue;
      
      log(`\n📁 Processing project: ${project}`);
      const projectDir = path.join(branchNotesRoot, project);
      
      try {
        const files = await fs.readdir(projectDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        log(`   Found ${mdFiles.length} branch notes`);
        
        for (const file of mdFiles) {
          stats.total++;
          const branchName = file.replace('.md', '');
          const projectKey = `branch_notes_${project}`;
          
          try {
            // Check if embedding already exists
            if (!FORCE_REGENERATE) {
              const existingEmbedding = await loadEmbedding(projectKey, branchName);
              if (existingEmbedding) {
                log(`   ⏭️  Skipping: ${file} (already exists)`);
                stats.skipped++;
                continue;
              }
            }
            
            log(`   🔄 Processing: ${file}`);
            
            const filePath = path.join(projectDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // DUAL-EMBEDDING STRATEGY: Create both overall + entry embeddings
            
            // 1. OVERALL EMBEDDING: Captures what this branch is about
            const lines = content.split('\n').filter(line => line.trim());
            const meaningfulLines = lines.filter(line => 
              !line.startsWith('#') && 
              !line.startsWith('---') &&
              line.length > 20
            );
            
            // Take beginning (context) + end (recent work) for overall understanding
            const beginningLines = meaningfulLines.slice(0, 15);
            const endLines = meaningfulLines.slice(-15);
            const overallText = [...beginningLines, ...endLines].join(' ').substring(0, 2000);
            const overallEmbeddingText = `Branch: ${branchName} Project: ${project} ${overallText}`;
            
            const overallEmbedding = await generateEmbedding(overallEmbeddingText);
            await storeEmbedding(projectKey, branchName, overallEmbedding);
            
            // 2. ENTRY-BASED CHUNKING: Create one embedding per date entry
            const entries = content.split(/(?=## \d{4}-\d{2}-\d{2})/);
            
            let entryCount = 0;
            for (let i = 0; i < entries.length; i++) {
              const entry = entries[i].trim();
              if (!entry) continue;
              
              // Extract date from entry if present
              const dateMatch = entry.match(/## (\d{4}-\d{2}-\d{2})/);
              const entryDate = dateMatch ? dateMatch[1] : 'header';
              
              // Create embedding text with context
              const embeddingText = `Branch: ${branchName} Project: ${project} Date: ${entryDate} ${entry.substring(0, 3000)}`;
              
              // Generate and store embedding with unique key per entry
              const embedding = await generateEmbedding(embeddingText);
              const entryKey = `${branchName}_entry_${i}`;
              await storeEmbedding(projectKey, entryKey, embedding);
              
              entryCount++;
            }
            
            log(`   ✅ Embedded: ${file} (1 overall + ${entryCount} entries)`);
            stats.processed++;
            
          } catch (error) {
            log(`   ❌ Failed to process ${file}:`, error.message);
            stats.errors++;
          }
        }
      } catch (error) {
        log(`❌ Failed to process project ${project}:`, error.message);
        stats.errors++;
      }
    }
    
    info(`   📊 Branch Notes: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.errors} errors (${stats.total} total)`);
  } catch (error) {
    info('❌ Failed to process branch notes:', error.message);
  }
  
  return stats;
}

async function generateEmbeddingsForContextFiles() {
  info('\n📋 Processing Context Files...');
  
  const contextRoot = path.join(storageRoot, 'context');
  let stats = { total: 0, processed: 0, skipped: 0, errors: 0 };
  
  try {
    const projects = await fs.readdir(contextRoot);
    log(`   Found ${projects.length} projects: ${projects.join(', ')}`);
    
    for (const project of projects) {
      if (project === '.DS_Store') continue;
      
      log(`\n📁 Processing project: ${project}`);
      const projectDir = path.join(contextRoot, project);
      
      try {
        const files = await fs.readdir(projectDir);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        log(`   Found ${mdFiles.length} context files`);
        
        for (const file of mdFiles) {
          stats.total++;
          const contextType = file.replace('.md', '');
          const projectKey = `context_${project}`;
          
          try {
            // Check if embedding already exists
            if (!FORCE_REGENERATE) {
              const existingEmbedding = await loadEmbedding(projectKey, contextType);
              if (existingEmbedding) {
                log(`   ⏭️  Skipping: ${file} (already exists)`);
                stats.skipped++;
                continue;
              }
            }
            
            log(`   🔄 Processing: ${file}`);
            
            const filePath = path.join(projectDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            
            // Extract context type and content
            const lines = content.split('\n').filter(line => line.trim());
            
            // Get meaningful content (skip headers, get substantial content)
            const meaningfulLines = lines.filter(line => 
              !line.startsWith('#') && 
              !line.startsWith('---') &&
              line.length > 15
            ).slice(0, 25);
            
            const textContent = meaningfulLines.join(' ').substring(0, 1200);
            const embeddingText = `Context: ${contextType} Project: ${project} ${textContent}`;
            
            // Generate and store embedding using special "context" project key
            const embedding = await generateEmbedding(embeddingText);
            await storeEmbedding(projectKey, contextType, embedding);
            
            log(`   ✅ Embedded: ${file}`);
            stats.processed++;
            
          } catch (error) {
            log(`   ❌ Failed to process ${file}:`, error.message);
            stats.errors++;
          }
        }
      } catch (error) {
        log(`❌ Failed to process project ${project}:`, error.message);
        stats.errors++;
      }
    }
    
    info(`   📊 Context Files: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.errors} errors (${stats.total} total)`);
  } catch (error) {
    info('❌ Failed to process context files:', error.message);
  }
  
  return stats;
}

async function generateEmbeddingsForArchives() {
  info('\n📦 Processing Archives...');
  
  const archiveRoot = path.join(storageRoot, 'archive');
  let stats = { total: 0, processed: 0, skipped: 0, errors: 0 };
  
  try {
    // Check if archive directory exists
    await fs.access(archiveRoot);
    
    const items = await fs.readdir(archiveRoot, { withFileTypes: true });
    log(`   Found ${items.length} archive items`);
    
    for (const item of items) {
      if (item.name === '.DS_Store') continue;
      
      const itemPath = path.join(archiveRoot, item.name);
      
      if (item.isDirectory()) {
        // Process archive directory
        log(`\n📁 Processing archive directory: ${item.name}`);
        
        try {
          const files = await fs.readdir(itemPath);
          const mdFiles = files.filter(f => f.endsWith('.md'));
          
          for (const file of mdFiles) {
            stats.total++;
            const archiveName = `${item.name}_${file.replace('.md', '')}`;
            
            try {
              // Check if embedding already exists
              if (!FORCE_REGENERATE) {
                const existingEmbedding = await loadEmbedding('archives', archiveName);
                if (existingEmbedding) {
                  log(`   ⏭️  Skipping: ${file} (already exists)`);
                  stats.skipped++;
                  continue;
                }
              }
              
              log(`   🔄 Processing: ${file}`);
              
              const filePath = path.join(itemPath, file);
              const content = await fs.readFile(filePath, 'utf8');
              
              // Extract archive content
              const lines = content.split('\n').filter(line => line.trim());
              
              const meaningfulLines = lines.filter(line => 
                !line.startsWith('#') && 
                !line.startsWith('---') &&
                line.length > 10
              ).slice(0, 20);
              
              const textContent = meaningfulLines.join(' ').substring(0, 1000);
              const embeddingText = `Archive: ${item.name} File: ${file} ${textContent}`;
              
              // Generate and store embedding using special "archives" project key
              const embedding = await generateEmbedding(embeddingText);
              await storeEmbedding('archives', archiveName, embedding);
              
              log(`   ✅ Embedded: ${file}`);
              stats.processed++;
              
            } catch (error) {
              log(`   ❌ Failed to process ${file}:`, error.message);
              stats.errors++;
            }
          }
        } catch (error) {
          log(`❌ Failed to process archive directory ${item.name}:`, error.message);
          stats.errors++;
        }
        
      } else if (item.isFile() && item.name.endsWith('.md')) {
        // Process individual archive file
        stats.total++;
        const archiveName = item.name.replace('.md', '');
        
        try {
          // Check if embedding already exists
          if (!FORCE_REGENERATE) {
            const existingEmbedding = await loadEmbedding('archives', archiveName);
            if (existingEmbedding) {
              log(`   ⏭️  Skipping: ${item.name} (already exists)`);
              stats.skipped++;
              continue;
            }
          }
          
          log(`   🔄 Processing: ${item.name}`);
          
          const content = await fs.readFile(itemPath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          const meaningfulLines = lines.filter(line => 
            !line.startsWith('#') && 
            !line.startsWith('---') &&
            line.length > 10
          ).slice(0, 20);
          
          const textContent = meaningfulLines.join(' ').substring(0, 1000);
          const embeddingText = `Archive: ${archiveName} ${textContent}`;
          
          // Generate and store embedding
          const embedding = await generateEmbedding(embeddingText);
          await storeEmbedding('archives', archiveName, embedding);
          
          log(`   ✅ Embedded: ${item.name}`);
          stats.processed++;
          
        } catch (error) {
          log(`   ❌ Failed to process ${item.name}:`, error.message);
          stats.errors++;
        }
      }
    }
    
    info(`   📊 Archives: ${stats.processed} processed, ${stats.skipped} skipped, ${stats.errors} errors (${stats.total} total)`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      info('   📦 No archive directory found, skipping...');
    } else {
      info('❌ Failed to process archives:', error.message);
    }
  }
  
  return stats;
}

async function main() {
  info('🧠 Generating embeddings for ALL Cursor-Cortex knowledge files...');
  info('📍 Storage root:', storageRoot);
  if (VERBOSE) info('🔧 Verbose mode enabled');
  if (FORCE_REGENERATE) info('🔄 Force regenerate mode enabled');
  
  const startTime = Date.now();
  
  try {
    // Generate embeddings for all file types
    const tacitStats = await generateEmbeddingsForTacitKnowledge();
    const branchStats = await generateEmbeddingsForBranchNotes();
    const contextStats = await generateEmbeddingsForContextFiles();
    const archiveStats = await generateEmbeddingsForArchives();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Combine all stats
    const totalStats = {
      total: tacitStats.total + branchStats.total + contextStats.total + archiveStats.total,
      processed: tacitStats.processed + branchStats.processed + contextStats.processed + archiveStats.processed,
      skipped: tacitStats.skipped + branchStats.skipped + contextStats.skipped + archiveStats.skipped,
      errors: tacitStats.errors + branchStats.errors + contextStats.errors + archiveStats.errors
    };
    
    info(`\n🎉 Embedding generation completed in ${duration}s!`);
    info(`📊 Final Summary: ${totalStats.processed} processed, ${totalStats.skipped} skipped, ${totalStats.errors} errors (${totalStats.total} total files)`);
    
    if (totalStats.processed > 0) {
      info('\n✅ Storage keys:');
      info('   📚 Tacit Knowledge → project keys');
      info('   🌿 Branch Notes → "branch_notes_{project}" keys');  
      info('   📋 Context Files → "context_{project}" keys');
      info('   📦 Archives → "archives" key');
      info('\n🚀 Semantic search available for ALL knowledge types!');
    }
    
    if (totalStats.errors > 0) {
      info(`\n⚠️  ${totalStats.errors} errors occurred. Use --verbose to see details.`);
    }
    
  } catch (error) {
    info('❌ Failed to generate embeddings:', error.message);
    process.exit(1);
  }
}

main();
