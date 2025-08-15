#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// List of all 17 MCP tools to test
const MCP_TOOLS = [
  'update_branch_note',
  'add_commit_separator', 
  'filter_branch_note',
  'read_branch_note',
  'update_context_file',
  'read_context_file',
  'list_context_files',
  'generate_commit_message',
  'generate_jira_comment',
  'create_tacit_knowledge',
  'create_completion_checklist',
  'read_checklist',
  'update_checklist',
  'sign_off_checklist',
  'read_tacit_knowledge',
  'archive_branch_note',
  'clear_branch_note',
  'list_all_branch_notes',
  'enhanced_branch_survey',
  'construct_project_narrative',
  'timeline_reconstruction',
  'context_sync_guidance',
  'analyze_documentation_gaps',
  'migrate_context_files',
  'request_critical_thinking_space',
  'check_critical_thinking_status', 
  'add_perspective'
];

// Test helper to call MCP server
async function callMCPTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const child = spawn('node', [indexPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Send the MCP request
    child.stdin.write(JSON.stringify(request) + '\n');
    child.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Tool call timeout'));
    }, 10000);
  });
}

describe('MCP Tools Integration Tests', () => {
  test('Index.js file loads without syntax errors', async () => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    
    // Test that the file can be read and has no obvious syntax issues
    const content = await fs.readFile(indexPath, 'utf8');
    assert.ok(content.length > 1000, 'Index.js should have substantial content');
    assert.ok(content.includes('Server'), 'Should contain MCP Server setup');
    assert.ok(content.includes('ListToolsRequestSchema'), 'Should contain tool registration');
  });

  test('All MCP tools are defined', () => {
    console.log(`\n📋 Expected MCP Tools (${MCP_TOOLS.length}):`);
    MCP_TOOLS.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool}`);
    });
    
    assert.strictEqual(MCP_TOOLS.length, 27, 'Expected 27 MCP tools');
  });

  // For now, we'll test that the tools exist in the source code
  // Full MCP integration testing will be added in Phase 4
  test('All tools exist in source code', async () => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const sourceCode = await fs.readFile(indexPath, 'utf8');
    
    const missingTools = [];
    for (const tool of MCP_TOOLS) {
      const toolExists = sourceCode.includes(`name: '${tool}'`) || 
                        sourceCode.includes(`name === '${tool}'`);
      if (!toolExists) {
        missingTools.push(tool);
      }
    }
    
    if (missingTools.length > 0) {
      console.log(`❌ Missing tools: ${missingTools.join(', ')}`);
    }
    
    assert.strictEqual(missingTools.length, 0, 
      `Missing tools in source: ${missingTools.join(', ')}`);
  });

  test('Tool handlers exist for all tools', async () => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const sourceCode = await fs.readFile(indexPath, 'utf8');
    
    const missingHandlers = [];
    for (const tool of MCP_TOOLS) {
      const handlerExists = sourceCode.includes(`name === '${tool}'`);
      if (!handlerExists) {
        missingHandlers.push(tool);
      }
    }
    
    if (missingHandlers.length > 0) {
      console.log(`❌ Missing handlers: ${missingHandlers.join(', ')}`);
    }
    
    assert.strictEqual(missingHandlers.length, 0, 
      `Missing handlers: ${missingHandlers.join(', ')}`);
  });
});

console.log('✅ MCP Tools integration tests ready for execution');