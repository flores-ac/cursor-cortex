/**
 * Utility functions for Cursor-Cortex
 */

import fs from 'fs/promises';
import path from 'path';
import { STORAGE_PATHS } from '../config/constants.js';

/**
 * Get the storage root directory
 */
export function getStorageRoot() {
  return path.join(process.env.HOME || process.env.USERPROFILE, '.cursor-cortex');
}

/**
 * Get the knowledge directory for a project
 */
export function getKnowledgeDir(projectName) {
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(getStorageRoot(), 'knowledge', safeProjectName);
}

/**
 * Get the context file path for a project/branch
 */
export function getContextFilePath(projectName, branchName, scope = 'branch') {
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  if (scope === 'project') {
    return path.join(getStorageRoot(), 'context', safeProjectName, 'project_context.md');
  } else {
    // Branch-specific context (legacy format maintained for backward compatibility)
    return path.join(getStorageRoot(), 'context', safeProjectName, `${safeBranchName}_context.md`);
  }
}

/**
 * Get the branch note file path
 */
export function getBranchNoteFilePath(projectName, branchName) {
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return path.join(getStorageRoot(), 'branch_notes', safeProjectName, `${safeBranchName}.md`);
}

/**
 * Ensure directory exists, creating it if necessary
 */
export async function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * List knowledge documents for a project
 */
export async function listKnowledgeDocs(projectName) {
  const knowledgeDir = getKnowledgeDir(projectName);
  try {
    const files = await fs.readdir(knowledgeDir);
    return files.filter(file => file.endsWith('.md'));
  } catch (error) {
    return [];
  }
}

/**
 * Extract tags from document content
 */
export function extractTags(content) {
  const tagsMatch = content.match(/\*\*Tags:\*\*\s*(.*?)\s*\n/);
  if (tagsMatch && tagsMatch[1]) {
    return tagsMatch[1].split(',').map(tag => tag.trim().toLowerCase());
  }
  return [];
}

/**
 * Create safe filename from title
 */
export function createSafeFilename(title) {
  return title.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
}

/**
 * Get all project directories from storage
 */
export async function getAllProjects() {
  const knowledgeRoot = path.join(getStorageRoot(), 'knowledge');
  try {
    const dirs = await fs.readdir(knowledgeRoot);
    return dirs.filter(dir => !dir.startsWith('.'));
  } catch (error) {
    return [];
  }
}

/**
 * Format timestamp for filenames
 */
export function formatTimestamp(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}
