#!/usr/bin/env node

import { performance } from 'node:perf_hooks';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Performance Baseline Measurements...\n');

// Measure module loading time
const loadStart = performance.now();
const indexPath = path.join(__dirname, '..', 'index.js');

try {
  // Test file reading performance
  const fileReadStart = performance.now();
  const indexContent = await fs.readFile(indexPath, 'utf8');
  const fileReadEnd = performance.now();
  const fileReadTime = fileReadEnd - fileReadStart;
  
  console.log(`📖 File Read Performance:`);
  console.log(`   - File size: ${indexContent.length} characters`);
  console.log(`   - Lines: ${indexContent.split('\n').length}`);
  console.log(`   - Read time: ${fileReadTime.toFixed(3)}ms\n`);
  
  // Test function counting
  const functionCountStart = performance.now();
  const functions = indexContent.match(/^(async )?function /gm) || [];
  const arrowFunctions = indexContent.match(/=>\s*{/g) || [];
  const functionCountEnd = performance.now();
  const functionCountTime = functionCountEnd - functionCountStart;
  
  console.log(`🔍 Code Analysis Performance:`);
  console.log(`   - Regular functions: ${functions.length}`);
  console.log(`   - Arrow functions: ${arrowFunctions.length}`);
  console.log(`   - Analysis time: ${functionCountTime.toFixed(3)}ms\n`);
  
  // Test memory usage
  const memUsage = process.memoryUsage();
  console.log(`💾 Memory Usage Baseline:`);
  console.log(`   - RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB\n`);
  
  const loadEnd = performance.now();
  const totalTime = loadEnd - loadStart;
  
  console.log(`⏱️  Total Benchmark Time: ${totalTime.toFixed(3)}ms`);
  console.log(`✅ Baseline measurements complete!`);
  
  // Save baseline data for comparison
  const baseline = {
    timestamp: new Date().toISOString(),
    fileSize: indexContent.length,
    lineCount: indexContent.split('\n').length,
    fileReadTime,
    functionCountTime,
    totalFunctions: functions.length + arrowFunctions.length,
    memoryUsage: memUsage,
    totalTime
  };
  
  const baselinePath = path.join(__dirname, 'baseline.json');
  await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2));
  console.log(`📊 Baseline saved to: ${baselinePath}`);
  
} catch (error) {
  console.error('❌ Performance baseline failed:', error.message);
  process.exit(1);
}