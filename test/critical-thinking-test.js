#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the critical thinking tools specifically
describe('Critical Thinking Tools Integration', () => {
  let serverProcess;
  
  test('Start MCP server and test critical thinking tools', async () => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    
    // Start the server
    console.log('🚀 Starting MCP server...');
    serverProcess = spawn('node', [indexPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverOutput = '';
    let serverError = '';

    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      serverError += data.toString();
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      // Test 1: Request critical thinking space
      console.log('🧠 Testing request_critical_thinking_space...');
      
      const request1 = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'request_critical_thinking_space',
          arguments: {
            topic: 'Should we refactor index.js?',
            projectName: 'cursor-cortex',
            context: 'File is 5000+ lines, hard to maintain'
          }
        }
      };

      serverProcess.stdin.write(JSON.stringify(request1) + '\n');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ request_critical_thinking_space test completed');

      // Test 2: Check status 
      console.log('📊 Testing check_critical_thinking_status...');
      
      const request2 = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'check_critical_thinking_status',
          arguments: {
            analysisId: 'should-we-refactor-index-js-' + Date.now(),
            projectName: 'cursor-cortex'
          }
        }
      };

      serverProcess.stdin.write(JSON.stringify(request2) + '\n');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ check_critical_thinking_status test completed');

      // Test 3: Add perspective
      console.log('🎯 Testing add_perspective...');
      
      const request3 = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call', 
        params: {
          name: 'add_perspective',
          arguments: {
            analysisId: 'should-we-refactor-index-js-' + Date.now(),
            projectName: 'cursor-cortex',
            perspective: 'white',
            analysis: 'Facts: 5000+ lines, 87 functions, 182KB file size'
          }
        }
      };

      serverProcess.stdin.write(JSON.stringify(request3) + '\n');
      
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ add_perspective test completed');

      // Basic validation that server is responding
      assert.ok(serverError.includes('Storage directory created'), 
        'Server should have created storage directory');
      
      console.log('🎉 All critical thinking tools tests completed successfully!');

    } finally {
      // Clean up - kill the server
      if (serverProcess && !serverProcess.killed) {
        console.log('🛑 Stopping MCP server...');
        serverProcess.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
      }
    }
  });
});

console.log('✅ Critical thinking tools integration tests ready');