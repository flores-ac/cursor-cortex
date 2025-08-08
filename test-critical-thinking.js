#!/usr/bin/env node

// Simple demo script to test our critical thinking tools
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

console.log('🧠 Testing Critical Thinking System...\n');

// Simulate the file-based semaphore system
const testProjectName = 'cursor-cortex';
const testAnalysisId = 'refactoring-decision-test-' + Date.now();
const testTopic = 'Should we refactor index.js into 7 modules?';

const storageRoot = path.join(os.homedir(), '.cursor-cortex');
const analysisDir = path.join(storageRoot, 'critical_thinking', testProjectName, testAnalysisId);

async function testCriticalThinkingSystem() {
  try {
    // 1. Create analysis workspace (simulating request_critical_thinking_space)
    console.log('1️⃣ Creating critical thinking workspace...');
    
    await fs.mkdir(analysisDir, { recursive: true });
    
    const semaphore = {
      analysisId: testAnalysisId,
      topic: testTopic,
      projectName: testProjectName,
      context: '5000+ lines, 87 functions, hard to maintain',
      createdAt: new Date().toISOString(),
      perspectives: {
        white: { completed: false, completedAt: null },
        red: { completed: false, completedAt: null },
        black: { completed: false, completedAt: null },
        yellow: { completed: false, completedAt: null },
        green: { completed: false, completedAt: null },
        blue: { completed: false, completedAt: null }
      },
      isComplete: false,
      completedAt: null
    };
    
    await fs.writeFile(
      path.join(analysisDir, 'semaphore.json'),
      JSON.stringify(semaphore, null, 2)
    );
    
    console.log(`✅ Workspace created: ${analysisDir}`);
    
    // 2. Check initial status (simulating check_critical_thinking_status)
    console.log('\n2️⃣ Checking initial status...');
    
    const initialStatus = await fs.readFile(path.join(analysisDir, 'semaphore.json'), 'utf8');
    const status = JSON.parse(initialStatus);
    
    const completed = Object.entries(status.perspectives).filter(([_, data]) => data.completed);
    const missing = Object.entries(status.perspectives).filter(([_, data]) => !data.completed);
    
    console.log(`📊 Progress: ${completed.length}/6 perspectives completed`);
    console.log(`❌ Missing: ${missing.map(([p]) => p).join(', ')}`);
    
    // 3. Add some perspectives (simulating add_perspective)
    console.log('\n3️⃣ Adding perspectives...');
    
    const perspectives = [
      {
        name: 'white',
        title: 'White Hat - Facts & Data',
        analysis: 'Facts: 5000+ lines, 87 functions, 182KB file size, takes 2ms to load, uses 35MB memory. Current structure makes it hard for new developers to understand the codebase.'
      },
      {
        name: 'red',
        title: 'Red Hat - Emotions & Intuition',
        analysis: 'Gut feeling: This refactoring feels necessary but scary. The file has grown organically and now feels overwhelming. There\'s anxiety about breaking something, but also excitement about cleaner code.'
      },
      {
        name: 'black',
        title: 'Black Hat - Caution & Problems',
        analysis: 'Risks: Major refactoring could introduce bugs, break existing functionality, take significant time. Need to ensure all 27 MCP tools still work. Could impact performance or introduce new dependencies.'
      }
    ];
    
    for (const perspective of perspectives) {
      // Update semaphore
      status.perspectives[perspective.name] = {
        completed: true,
        completedAt: new Date().toISOString()
      };
      
      // Save perspective file
      const perspectiveContent = `# ${perspective.title}

**Analysis ID:** ${testAnalysisId}  
**Topic:** ${testTopic}  
**Added:** ${new Date().toISOString()}

## Analysis

${perspective.analysis}

---
*Part of Six Thinking Hats critical thinking analysis*
`;
      
      await fs.writeFile(
        path.join(analysisDir, `${perspective.name}_hat.md`),
        perspectiveContent
      );
      
      console.log(`✅ Added ${perspective.name.toUpperCase()} Hat perspective`);
    }
    
    // Update semaphore
    await fs.writeFile(
      path.join(analysisDir, 'semaphore.json'),
      JSON.stringify(status, null, 2)
    );
    
    // 4. Check updated status
    console.log('\n4️⃣ Checking updated status...');
    
    const updatedStatus = JSON.parse(await fs.readFile(path.join(analysisDir, 'semaphore.json'), 'utf8'));
    const newCompleted = Object.entries(updatedStatus.perspectives).filter(([_, data]) => data.completed);
    const newMissing = Object.entries(updatedStatus.perspectives).filter(([_, data]) => !data.completed);
    
    console.log(`📊 Progress: ${newCompleted.length}/6 perspectives completed`);
    console.log(`✅ Completed: ${newCompleted.map(([p]) => p).join(', ')}`);
    console.log(`❌ Still needed: ${newMissing.map(([p]) => p).join(', ')}`);
    
    if (newMissing.length > 0) {
      console.log(`\n⚠️  Analysis incomplete - ${newMissing.length} perspectives remaining`);
      console.log('🚫 Final decision blocked until all hats complete');
    } else {
      console.log('\n🎉 All perspectives complete! Ready for final analysis.');
    }
    
    console.log('\n5️⃣ File structure created:');
    const files = await fs.readdir(analysisDir);
    files.forEach(file => {
      console.log(`   📄 ${file}`);
    });
    
    console.log('\n🎯 Critical Thinking System Test Complete!');
    console.log(`📁 Analysis saved to: ${analysisDir}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCriticalThinkingSystem();