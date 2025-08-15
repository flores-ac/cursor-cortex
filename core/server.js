/**
 * Core MCP server setup and initialization for Cursor-Cortex
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs/promises';
import path from 'path';
import { SERVER_CONFIG, STORAGE_PATHS } from '../config/constants.js';
import { getStorageRoot } from '../lib/utils.js';

/**
 * Initialize the MCP server with configuration
 */
export function initializeServer() {
  return new Server(
    {
      name: SERVER_CONFIG.name,
      version: SERVER_CONFIG.version,
    },
    {
      capabilities: SERVER_CONFIG.capabilities,
    }
  );
}

/**
 * Setup storage directories
 */
export async function setupStorageDirectories() {
  const storageRoot = getStorageRoot();
  
  try {
    // Create all required storage directories
    await fs.mkdir(storageRoot, { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'branch_notes'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'context'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'knowledge'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'checklists'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'embeddings'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'critical-thinking'), { recursive: true });
    
    console.error(`Storage directory created at ${storageRoot}`);
  } catch (error) {
    console.error(`Failed to create storage directory: ${error.message}`);
    throw error;
  }
}

/**
 * Start the MCP server with transport
 */
export async function startServer(server) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Complete server initialization and startup
 */
export async function createAndStartServer(toolDefinitions, toolHandlers) {
  // Initialize server
  const server = initializeServer();
  
  // Setup storage
  await setupStorageDirectories();
  
  // Register tool definitions
  server.setRequestHandler(toolDefinitions.ListToolsRequestSchema, toolDefinitions.listToolsHandler);
  
  // Register tool call handlers  
  server.setRequestHandler(toolHandlers.CallToolRequestSchema, toolHandlers.callToolHandler);
  
  // Start server
  await startServer(server);
  
  return server;
}
