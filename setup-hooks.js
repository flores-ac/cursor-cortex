#!/usr/bin/env node

/**
 * Setup script for Cursor-Cortex Git hooks
 * This script installs the post-commit hook to automatically add commit separators
 * and the pre-commit hook to run linting before commits
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

async function setupHooks() {
  try {
    console.log('Setting up Cursor-Cortex Git hooks...');
    
    // Get Git repository root
    const gitRoot = execSync('git rev-parse --show-toplevel').toString().trim();
    
    // Create .git/hooks directory if it doesn't exist
    const hooksDir = path.join(gitRoot, '.git', 'hooks');
    try {
      await fs.access(hooksDir);
    } catch (error) {
      console.log('Creating hooks directory due to:', error.message);
      await fs.mkdir(hooksDir, { recursive: true });
    }
    
    // Copy our post-commit hook
    const sourcePostCommitHook = path.join(gitRoot, 'hooks', 'post-commit');
    const targetPostCommitHook = path.join(hooksDir, 'post-commit');
    
    console.log(`Copying post-commit hook from ${sourcePostCommitHook} to ${targetPostCommitHook}...`);
    await fs.copyFile(sourcePostCommitHook, targetPostCommitHook);
    await fs.chmod(targetPostCommitHook, 0o755); // Make executable
    
    // Copy our pre-commit hook
    const sourcePreCommitHook = path.join(gitRoot, 'hooks', 'pre-commit');
    const targetPreCommitHook = path.join(hooksDir, 'pre-commit');
    
    console.log(`Copying pre-commit hook from ${sourcePreCommitHook} to ${targetPreCommitHook}...`);
    await fs.copyFile(sourcePreCommitHook, targetPreCommitHook);
    await fs.chmod(targetPreCommitHook, 0o755); // Make executable
    
    console.log('Git hooks installed successfully!');
    console.log('Now, when you make commits, linting will be performed before the commit');
    console.log('and branch notes will automatically get commit separators.');
  } catch (error) {
    console.error('Error setting up Git hooks:', error.message);
    process.exit(1);
  }
}

setupHooks(); 