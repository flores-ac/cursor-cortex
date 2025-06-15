#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Initialize the server
const server = new Server(
  {
    name: 'cursor-cortex',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'update_branch_note',
        description: 'Update the running note for the current branch with a new change entry',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            message: { type: 'string', description: 'Description of the changes made' },
          },
          required: ['branchName', 'projectName', 'message'],
        },
        directStringInput: {
          paramName: 'message',
          defaultParams: {
            branchName: 'main',
            projectName: 'default-project'
          }
        }
      },
      {
        name: 'add_commit_separator',
        description: 'Add a commit separator to the branch note with commit metadata',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            commitHash: { type: 'string', description: 'Git commit hash' },
            commitMessage: { type: 'string', description: 'Git commit message' },
          },
          required: ['branchName', 'projectName', 'commitHash', 'commitMessage'],
        }
      },
      {
        name: 'filter_branch_note',
        description: 'Filter branch notes - defaults to showing uncommitted work, can also filter by commit hash or date range',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            commitHash: { type: 'string', description: 'Filter to show notes for a specific commit (by hash)' },
            beforeDate: { type: 'string', description: 'Filter to show notes before this date (YYYY-MM-DD)' },
            afterDate: { type: 'string', description: 'Filter to show notes after this date (YYYY-MM-DD)' },
            uncommittedOnly: { type: 'boolean', description: 'Show only uncommitted work (notes after the last commit separator) - defaults to true' },
          },
          required: ['branchName', 'projectName'],
        }
      },
      {
        name: 'read_branch_note',
        description: 'Read the running note for the current branch',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
          },
          required: ['branchName', 'projectName'],
        },
      },
      {
        name: 'update_context_file',
        description: 'Update the context file with information about the feature or pipeline',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            title: { type: 'string', description: 'Title of the feature or pipeline' },
            description: { type: 'string', description: 'Description of what the feature or pipeline does' },
            additionalInfo: { type: 'string', description: 'Any additional information to include' },
            relatedProjects: { type: 'array', description: 'List of related projects' },
          },
          required: ['branchName', 'projectName', 'title', 'description'],
        },
      },
      {
        name: 'read_context_file',
        description: 'Read the context file for the current branch',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            currentProject: { type: 'string', description: 'Name of the current project (for cross-project warning)' },
          },
          required: ['branchName', 'projectName'],
        },
      },
      {
        name: 'list_context_files',
        description: 'List all context files for a project or across all projects',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project' },
            listAll: { type: 'boolean', description: 'List all context files across all projects' },
            currentProject: { type: 'string', description: 'Name of the current project (for cross-project indicators)' },
          },
          required: ['projectName'],
        },
      },
      {
        name: 'generate_commit_message',
        description: 'Generate a commit message based on the branch note without making the commit',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            jiraTicket: { type: 'string', description: 'Optional Jira ticket ID to include' },
          },
          required: ['branchName', 'projectName'],
        },
      },
      {
        name: 'generate_jira_comment',
        description: 'Generate a comment for a Jira ticket about the changes without updating the ticket',
        inputSchema: {
          type: 'object',
          properties: {
            ticketId: { type: 'string', description: 'Jira ticket ID to reference' },
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            jiraBaseUrl: { type: 'string', description: 'Base URL of the Jira instance (optional)' },
          },
          required: ['ticketId', 'branchName', 'projectName'],
        },
      },
      {
        name: 'create_tacit_knowledge',
        description: 'Create a tacit knowledge document based on the Cursor-Cortex template',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Concise descriptive title of the knowledge' },
            author: { type: 'string', description: 'Name of knowledge contributor' },
            projectName: { type: 'string', description: 'Project name' },
            branchName: { type: 'string', description: 'Branch name if relevant' },
            tags: { type: 'string', description: 'Comma-separated keywords' },
            problemStatement: { type: 'string', description: 'Describe the problem or situation that required expertise' },
            environment: { type: 'string', description: 'Describe relevant environmental factors: system state, configurations, versions, etc.' },
            constraints: { type: 'string', description: 'List any limitations or constraints that influenced the approach' },
            approach: { type: 'string', description: 'Explain the approach taken to solve the problem' },
            outcome: { type: 'string', description: 'Describe the result of applying this knowledge' },
            relatedDocumentation: { type: 'string', description: 'Links to related documentation, tickets, or resources' },
          },
          required: ['title', 'author', 'projectName', 'problemStatement', 'approach', 'outcome'],
        },
        directStringInput: {
          paramName: 'title',
          defaultParams: {
            author: 'User',
            projectName: 'default-project',
            problemStatement: 'No problem statement provided',
            approach: 'No approach provided',
            outcome: 'No outcome provided'
          }
        }
      },
      {
        name: 'create_completion_checklist',
        description: 'Create a project completion checklist using the Cursor-Cortex template',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Project name' },
            featureName: { type: 'string', description: 'Name of the feature or module' },
            owner: { type: 'string', description: 'Person responsible for completing this checklist' },
            requirements: { type: 'string', description: 'Key requirements that need to be met' },
            objectives: { type: 'string', description: 'Main objectives of this feature' },
            testCriteria: { type: 'string', description: 'Criteria for successful testing' },
            knowledgeItems: { type: 'string', description: 'List of knowledge items that should be documented' },
            jiraTicket: { type: 'string', description: 'Associated Jira ticket ID' },
          },
          required: ['projectName', 'featureName', 'owner', 'requirements', 'objectives'],
        },
        directStringInput: {
          paramName: 'featureName',
          defaultParams: {
            projectName: 'default-project',
            owner: 'User',
            requirements: 'No requirements provided',
            objectives: 'No objectives provided'
          }
        }
      },
      {
        name: 'read_checklist',
        description: 'Read a completion checklist for the project',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project' },
            checklistName: { type: 'string', description: 'Name of the checklist (or \'list\' to see all available checklists)' },
          },
          required: ['projectName']
        }
      },
      {
        name: 'update_checklist',
        description: 'Update checklist items based on branch context and progress',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project' },
            checklistName: { type: 'string', description: 'Name of the checklist to update' },
            itemPath: { type: 'string', description: 'Path to the item to update (e.g., \'Requirements.1\' for the first requirement)' },
            status: { type: 'boolean', description: 'New status of the item (true = completed, false = not completed)' },
            autoUpdate: { type: 'boolean', description: 'Automatically update based on branch context and notes' },
            branchName: { type: 'string', description: 'Name of the branch to use for auto-update (defaults to \'main\')' }
          },
          required: ['projectName', 'checklistName']
        }
      },
      {
        name: 'sign_off_checklist',
        description: 'Sign off on a completed checklist item',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project' },
            checklistName: { type: 'string', description: 'Name of the checklist to sign off' },
            signOffItem: { type: 'string', description: 'Which item to sign off (Implementation, Testing, Knowledge, Approval)' },
            signatureName: { type: 'string', description: 'Name of the person signing off' }
          },
          required: ['projectName', 'checklistName', 'signOffItem', 'signatureName']
        }
      },
      {
        name: 'read_tacit_knowledge',
        description: 'Read tacit knowledge documents',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project' },
            documentName: { type: 'string', description: 'Name of the document (or \'list\' to see all available documents)' },
            searchTerm: { type: 'string', description: 'Term to search for across documents' },
            searchTags: { type: 'string', description: 'Tags to filter documents by (comma-separated)' },
            crossProject: { type: 'boolean', description: 'Whether to search across all projects' }
          },
          required: ['projectName']
        }
      },
      {
        name: 'archive_branch_note',
        description: 'Archive branch notes for a project',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            archiveDate: { type: 'string', description: 'Date for the archive in YYYY-MM-DD format' },
          },
          required: ['branchName', 'projectName'],
        },
      },
      {
        name: 'clear_branch_note',
        description: 'Clear branch notes for a project, optionally creating an archive first',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: { type: 'string', description: 'Name of the branch' },
            projectName: { type: 'string', description: 'Name of the project' },
            createArchive: { type: 'boolean', description: 'Whether to create an archive before clearing (default: true)' },
            keepHeader: { type: 'boolean', description: 'Whether to keep the branch note header (default: true)' },
          },
          required: ['branchName', 'projectName'],
        },
      },
      {
        name: 'list_all_branch_notes',
        description: 'List all branch notes across all projects, grouped by branch with priority order (main, stage, then alphabetically)',
        inputSchema: {
          type: 'object',
          properties: {
            currentProject: { type: 'string', description: 'Name of the current project (for highlighting)' },
            includeEmpty: { type: 'boolean', description: 'Whether to include branches with no content (default: false)' },
          },
          required: [],
        },
      },
      {
        name: 'enhanced_branch_survey',
        description: 'Enhanced branch survey system for Knowledge Archaeology - provides comprehensive analysis of documentation across all branches with completeness scoring, relationship mapping, and production readiness assessment',
        inputSchema: {
          type: 'object',
          properties: {
            currentProject: { type: 'string', description: 'Name of the current project (for highlighting)' },
            includeAnalysis: { type: 'boolean', description: 'Include detailed analysis and scoring (default: true)' },
            minCompletenessScore: { type: 'number', description: 'Minimum completeness score to include (0-100, default: 0)' },
            detectRelationships: { type: 'boolean', description: 'Detect cross-branch relationships (default: true)' },
          },
          required: [],
        },
      },
      {
        name: 'construct_project_narrative',
        description: 'Phase 2.1: Narrative Construction Engine - Weaves scattered technical details into coherent production stories using Knowledge Archaeology techniques',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project to construct narrative for' },
            branchName: { type: 'string', description: 'Branch to analyze (defaults to main)' },
            includeKnowledge: { type: 'boolean', description: 'Include tacit knowledge documents in narrative (default: true)' },
            includeContext: { type: 'boolean', description: 'Include project context information (default: true)' },
            narrativeType: { type: 'string', description: 'Type of narrative to construct: "technical", "executive", "full" (default: full)' },
          },
          required: ['projectName'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    console.error('----------------------------------------');
    console.error(`CallToolRequestSchema handler called at ${new Date().toISOString()}`);
    
    if (!request.params) {
      console.error('ERROR: request.params is undefined or null');
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error: Request parameters are missing or invalid',
          },
        ],
      };
    }
    
    // Extract tool name
    const name = request.params.name;
    console.error('Tool name:', name);
    
    if (!name) {
      console.error('ERROR: Tool name is missing');
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Error: Tool name is missing',
          },
        ],
      };
    }
    
    // Define direct string handling for each tool type
    const directStringHandlers = {
      'create_tacit_knowledge': {
        paramName: 'title',
        defaultParams: {
          author: 'User',
          projectName: 'default-project',
          problemStatement: 'No problem statement provided',
          approach: 'No approach provided',
          outcome: 'No outcome provided'
        }
      },
      'create_completion_checklist': {
        paramName: 'featureName',
        defaultParams: {
          projectName: 'default-project',
          owner: 'User',
          requirements: 'No requirements provided',
          objectives: 'No objectives provided'
        }
      },
      'update_branch_note': {
        paramName: 'message',
        defaultParams: {
          branchName: 'main',
          projectName: 'default-project'
        }
      }
    };
    
    // Get and log the raw arguments
    const rawArgs = request.params.arguments;
    console.error('Raw arguments type:', typeof rawArgs);
    console.error('Raw arguments value:', JSON.stringify(rawArgs));
    
    // Improved approach to handle arguments
    let toolArgs = {};
    
    if (typeof rawArgs === 'object' && rawArgs !== null) {
      // Already an object, use directly
      toolArgs = rawArgs;
      console.error('Using arguments as object directly');
    } else if (typeof rawArgs === 'string') {
      console.error('Arguments received as string:', rawArgs);
      
      // First, try to parse as JSON if it looks like JSON
      if ((rawArgs.startsWith('{') && rawArgs.endsWith('}')) || 
          (rawArgs.startsWith('[') && rawArgs.endsWith(']')) ||
          (rawArgs.startsWith('"') && rawArgs.endsWith('"'))) {
        try {
          const parsed = JSON.parse(rawArgs);
          console.error('Successfully parsed string as JSON, result type:', typeof parsed);
          
          // If we parsed a string from a JSON string, check if it's actually JSON again
          if (typeof parsed === 'string' && 
             (parsed.startsWith('{') && parsed.endsWith('}') || 
              parsed.startsWith('[') && parsed.endsWith(']'))) {
            try {
              const doubleUnwrapped = JSON.parse(parsed);
              console.error('Successfully parsed double-wrapped JSON');
              toolArgs = doubleUnwrapped;
            } catch (error) {
              console.error('Failed to parse double-wrapped JSON:', error.message);
              toolArgs = parsed;
            }
          } else {
            toolArgs = parsed;
          }
        } catch (error) {
          console.error('Failed to parse string as JSON:', error.message);
          
          // If parsing fails and tool has a direct string handler, use that
          if (directStringHandlers[name]) {
            const { paramName, defaultParams } = directStringHandlers[name];
            toolArgs = { ...defaultParams, [paramName]: rawArgs };
            console.error(`Using direct string input for parameter "${paramName}" with value:`, rawArgs);
          } else {
            console.error(`Tool "${name}" doesn't support direct string input but received string:`, rawArgs);
            toolArgs = {};
          }
        }
      } else {
        // Plain string not in JSON format - use direct string handler if available
        if (directStringHandlers[name]) {
          const { paramName, defaultParams } = directStringHandlers[name];
          toolArgs = { ...defaultParams, [paramName]: rawArgs };
          console.error(`Using direct string input for parameter "${paramName}" with value:`, rawArgs);
        } else {
          console.error(`Tool "${name}" doesn't support direct string input but received string:`, rawArgs);
          toolArgs = {};
        }
      }
    } else {
      // Neither object nor string, create an empty object
      toolArgs = {};
      console.error('Arguments are neither object nor string, using empty object');
    }
    
    console.error('Final arguments:', JSON.stringify(toolArgs));
    
    // Use the processed arguments for the rest of the function
    // Get root storage directory for cursor-cortex files
    function getStorageRoot() {
      return path.join(os.homedir(), '.cursor-cortex');
    }

    // Get path to branch note file
    function getBranchNotePath(projectName, branchName) {
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
      return path.join(getStorageRoot(), 'branch_notes', safeProjectName, `${safeBranchName}.md`);
    }
    
    // Get path to branch note archive file
    function getBranchNoteArchivePath(projectName, branchName, archiveDate) {
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const archiveFileName = `${safeBranchName}_${archiveDate.replace(/-/g, '')}.md`;
      return path.join(getStorageRoot(), 'branch_notes', safeProjectName, 'archives', archiveFileName);
    }
    
    // Get list of archives for a branch (currently unused but kept for future use)
    // async function getBranchNoteArchives(projectName, branchName) {
    //   const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
    //   const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
    //   const archiveDir = path.join(getStorageRoot(), 'branch_notes', safeProjectName, 'archives');
    //   
    //   try {
    //     await fs.access(archiveDir);
    //   } catch (error) {
    //     // Archives directory doesn't exist yet
    //     return [];
    //   }
    //   
    //   const files = await fs.readdir(archiveDir);
    //   return files.filter(file => file.startsWith(`${safeBranchName}_`) && file.endsWith('.md'))
    //     .map(file => {
    //       const dateStr = file.slice(safeBranchName.length + 1, -3);
    //       const year = dateStr.slice(0, 4);
    //       const month = dateStr.slice(4, 6);
    //       const day = dateStr.slice(6, 8);
    //       return {
    //         fileName: file,
    //         date: `${year}-${month}-${day}`,
    //         path: path.join(archiveDir, file)
    //       };
    //     })
    //     .sort((a, b) => b.date.localeCompare(a.date)); // Newest first
    // }
    
    // Get path to context file
    function getContextFilePath(projectName, branchName) {
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
      return path.join(getStorageRoot(), 'context', safeProjectName, `${safeBranchName}_context.md`);
    }

    // Get all context files for a project
    async function listContextFiles(projectName) {
      const contextDir = path.join(getStorageRoot(), 'context', projectName.replace(/[^a-zA-Z0-9-_]/g, '_'));
      try {
        const files = await fs.readdir(contextDir);
        return files.filter(file => file.endsWith('_context.md'));
      } catch (error) {
        if (error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    }

    // Get all context projects
    async function getAllContextProjects() {
      const contextRoot = path.join(getStorageRoot(), 'context');
      try {
        const dirs = await fs.readdir(contextRoot);
        return dirs;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
    }

    // Check if context file is from a different project than current
    function isExternalContextFile(currentProject, fileProject) {
      return currentProject !== fileProject && currentProject !== 'all';
    }

    // Ensure directory exists
    async function ensureDirectoryExists(filePath) {
      const dir = path.dirname(filePath);
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }

    // Format current date and time
    function getFormattedDateTime() {
      return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    // Extract latest entry from branch note (currently unused but kept for future use)
    // async function getLatestBranchNoteEntry(filePath) {
    //   try {
    //     const content = await fs.readFile(filePath, 'utf-8');
    //     const entries = content.split('## ').filter(Boolean);
    //     if (entries.length > 0) {
    //       const latestEntry = entries[entries.length - 1];
    //       const lines = latestEntry.split('\n').slice(1).filter(line => line.trim() !== '');
    //       return lines.join(' ');
    //     }
    //     return null;
    //   } catch (error) {
    //     if (error.code === 'ENOENT') {
    //       return null;
    //     }
    //     throw error;
    //   }
    // }

    // Get entries since last commit separator
    async function getEntriesSinceLastCommit(filePath) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Split by section headers
        const sections = content.split('## ').filter(Boolean);
        
        if (sections.length === 0) {
          return null;
        }
        
        // Reverse to find the last commit separator
        const reversedSections = [...sections].reverse();
        
        // Find index of the last commit separator - look for literal string "COMMIT:" which appears in all separators
        const lastCommitIndex = reversedSections.findIndex(section => 
          section.includes('COMMIT:')
        );
        
        if (lastCommitIndex === -1) {
          // No commit separator found, return the latest entry
          const latestEntry = sections[sections.length - 1];
          const lines = latestEntry.split('\n').slice(1).filter(line => line.trim() !== '');
          return '#IMPORTANT: Before generating any commit message, generate a better commit message that summarizes these changes into a single phrase:\n\n' + lines.join(' ');
        }
        
        // Get all entries after the last commit
        const entriesSinceCommit = reversedSections.slice(0, lastCommitIndex).reverse();
        
        if (entriesSinceCommit.length === 0) {
          return 'No changes since last commit';
        }
        
        // For concise commit messages, use the latest entry plus a count of other entries
        if (entriesSinceCommit.length === 1) {
          // Just one entry - use it directly
          const lines = entriesSinceCommit[0].split('\n').slice(1).filter(line => line.trim() !== '');
          return '#IMPORTANT: Before generating any commit message, generate a better commit message that summarizes these changes into a single phrase:\n\n' + lines.join(' ');
        } else {
          // Multiple entries - use the most recent one plus a count
          const mostRecentEntry = entriesSinceCommit[entriesSinceCommit.length - 1];
          const lines = mostRecentEntry.split('\n').slice(1).filter(line => line.trim() !== '');
          const message = lines.join(' ');
          
          // Calculate character count of all entries for reference
          const totalEntries = entriesSinceCommit.length;
          
          // Get all entries for context
          const allEntries = entriesSinceCommit.map(entry => {
            const lines = entry.split('\n').slice(1).filter(line => line.trim() !== '');
            return lines.join(' ');
          }).join('\n- ');
          
          // Create a concise summary with AI instruction
          return `#IMPORTANT: Before generating any commit message, generate a better commit message that summarizes these changes into a single phrase:

Latest change: ${message}
Total changes since last commit: ${totalEntries}

All changes:
- ${allEntries}`;
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          return null;
        }
        throw error;
      }
    }

    // Add this function near the other utility functions
    async function getChecklistPath(projectName, checklistName) {
      const checklistDir = path.join(getStorageRoot(), 'checklists', projectName.replace(/[^a-zA-Z0-9-_]/g, '_'));
      
      if (checklistName === 'list') {
        // Return the directory to list all checklists
        return checklistDir;
      }
      
      // Handle exact match on the full path if provided
      if (checklistName.endsWith('.md')) {
        return path.join(checklistDir, checklistName);
      }
      
      // Otherwise, try to find the checklist by partial name
      try {
        const files = await fs.readdir(checklistDir);
        const matchingFile = files.find(file => 
          file.includes(checklistName) && file.endsWith('-checklist.md')
        );
        
        if (matchingFile) {
          return path.join(checklistDir, matchingFile);
        }
      } catch {
        // Directory doesn't exist, which will be handled in the read function
      }
      
      // If we didn't find a match, just return the path with the name as-is
      return path.join(checklistDir, `${checklistName}-checklist.md`);
    }

    if (name === 'update_branch_note') {
      try {
        const { branchName = 'main', projectName = 'default-project', message = '' } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        await ensureDirectoryExists(filePath);
        
        console.error(`Updating branch note at ${filePath}`);
        
        let content = '';
        try {
          content = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          // File doesn't exist yet, create a new one with header
          content = `# Branch Note: ${branchName} (${projectName})\n\n`;
        }
        
        // Add the new entry with timestamp
        const timestamp = getFormattedDateTime();
        const newEntry = `## ${timestamp}\n${message}\n\n`;
        
        await fs.writeFile(filePath, content + newEntry);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated branch note with: "${message}"`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating branch note: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'read_branch_note') {
      try {
        const { branchName, projectName } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        
        console.error(`Reading branch note from ${filePath}`);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return {
            content: [
              {
                type: 'text',
                text: content,
              },
            ],
          };
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: `No branch note exists yet for branch "${branchName}" in project "${projectName}". Use update_branch_note to create one.`,
                },
              ],
            };
          }
          throw error;
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error reading branch note: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'update_context_file') {
      try {
        const { branchName, projectName, title, description, additionalInfo, relatedProjects } = toolArgs;
        const filePath = getContextFilePath(projectName, branchName);
        await ensureDirectoryExists(filePath);
        
        console.error(`Updating context file at ${filePath}`);
        
        // Format the context file
        let content = `# ${title}\n\n`;
        content += `## Description\n${description}\n\n`;
        
        if (additionalInfo) {
          content += `## Additional Information\n${additionalInfo}\n\n`;
        }
        
        // Add related projects section if provided
        if (relatedProjects && Array.isArray(relatedProjects) && relatedProjects.length > 0) {
          content += `## Related Projects\n`;
          relatedProjects.forEach(project => {
            content += `- ${project}\n`;
          });
          content += `\n`;
        }
        
        // Add metadata
        content += `---\nLast Updated: ${getFormattedDateTime()}\n`;
        content += `Branch: ${branchName}\n`;
        content += `Project: ${projectName}\n`;
        
        await fs.writeFile(filePath, content);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated context file for "${title}"`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating context file: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'read_context_file') {
      try {
        const { branchName, projectName, currentProject } = toolArgs;
        const filePath = getContextFilePath(projectName, branchName);
        
        console.error(`Reading context file from ${filePath}`);
        
        // Check if accessing external project context
        const isExternal = currentProject && isExternalContextFile(currentProject, projectName);
        
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Prepare response content
          const responseContent = [];
          
          // Add warning if accessing external project
          if (isExternal) {
            responseContent.push({
              type: 'text',
              text: `⚠️ WARNING: You are accessing a context file from project "${projectName}" while working in project "${currentProject}". ⚠️\n\n`,
            });
          }
          
          // Add the actual content with project label
          responseContent.push({
            type: 'text',
            text: `[Project: ${projectName}]\n${content}`,
          });
          
          return {
            content: responseContent,
          };
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: `No context file exists yet for branch "${branchName}" in project "${projectName}". Use update_context_file to create one.`,
                },
              ],
            };
          }
          throw error;
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error reading context file: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'list_context_files') {
      try {
        const { projectName, listAll = false, currentProject } = toolArgs;
        
        // Determine which projects to list
        const projects = listAll ? 
          await getAllContextProjects() : 
          [projectName];
        
        const allContextFiles = [];
        
        // Collect context files from all relevant projects
        for (const project of projects) {
          const files = await listContextFiles(project);
          for (const file of files) {
            // Extract branch name from filename
            const branchName = file.replace('_context.md', '');
            
            // Get file path
            const filePath = path.join(getStorageRoot(), 'context', project, file);
            
            // Read file to extract title
            let title = branchName;
            try {
              const content = await fs.readFile(filePath, 'utf-8');
              const titleMatch = content.match(/# (.+?)\n/);
              if (titleMatch) {
                title = titleMatch[1];
              }
            } catch (error) {
              console.error(`Error reading context file ${file}: ${error.message}`);
            }
            
            // Add to results
            allContextFiles.push({
              project,
              branch: branchName,
              title,
              path: filePath,
              isExternal: currentProject ? isExternalContextFile(currentProject, project) : false
            });
          }
        }
        
        // Group by project
        const filesByProject = {};
        for (const file of allContextFiles) {
          if (!filesByProject[file.project]) {
            filesByProject[file.project] = [];
          }
          filesByProject[file.project].push(file);
        }
        
        // Format output
        let resultText = `# Available Context Files\n\n`;
        
        if (Object.keys(filesByProject).length === 0) {
          resultText = `No context files found${projectName ? ` for project "${projectName}"` : ''}.`;
        } else {
          for (const project in filesByProject) {
            const files = filesByProject[project];
            const isExternalProject = currentProject ? isExternalContextFile(currentProject, project) : false;
            
            // Add project header with warning if external
            resultText += `## Project: ${project}${isExternalProject ? ' (EXTERNAL PROJECT)' : ''}\n\n`;
            
            // List files for this project
            for (const file of files) {
              resultText += `- Branch: ${file.branch}, Title: ${file.title}\n`;
            }
            
            resultText += '\n';
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: resultText,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing context files: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'generate_commit_message') {
      try {
        const { branchName, projectName, jiraTicket } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        
        console.error(`Generating commit message from ${filePath}`);
        
        // Generate commit message from branch note
        const entriesSinceLastCommit = await getEntriesSinceLastCommit(filePath);
        
        if (!entriesSinceLastCommit) {
          return {
            content: [
              {
                type: 'text',
                text: 'No branch note entries found. Please add an entry with update_branch_note first.',
              },
            ],
          };
        }
        
        // Format with Jira ticket if provided
        let commitMessage = entriesSinceLastCommit;
        if (jiraTicket && !commitMessage.includes(jiraTicket)) {
          commitMessage = `[${jiraTicket}] ${commitMessage}`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: commitMessage,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating commit message: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'generate_jira_comment') {
      try {
        const { ticketId, branchName, projectName, jiraBaseUrl } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        
        console.error(`Generating Jira comment for ticket ${ticketId} based on branch note`);
        
        // Get branch note content
        let branchNoteContent;
        try {
          branchNoteContent = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `No branch note exists yet for branch "${branchName}" in project "${projectName}". Cannot generate Jira comment.`,
                },
              ],
            };
          }
          throw error;
        }
        
        // Extract entries from branch note
        const entries = branchNoteContent.split('## ').filter(Boolean);
        if (entries.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Branch note exists but has no entries. Cannot generate Jira comment.`,
              },
            ],
          };
        }
        
        // Format the comment
        let comment = `*Updates from branch: ${branchName}*\n\n`;
        entries.forEach(entry => {
          const lines = entry.split('\n');
          const timestamp = lines[0].trim();
          const changes = lines.slice(1).filter(line => line.trim() !== '').join('\n');
          
          comment += `h5. ${timestamp}\n${changes}\n\n`;
        });
        
        // Add link to Jira if base URL is provided
        let ticketUrl = '';
        if (jiraBaseUrl) {
          ticketUrl = `${jiraBaseUrl.replace(/\/$/, '')}/browse/${ticketId}`;
          comment += `\n[View ticket|${ticketUrl}]`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: comment,
            },
            {
              type: 'text',
              text: ticketUrl ? `\nTicket URL: ${ticketUrl}` : '',
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating Jira comment: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'add_commit_separator') {
      try {
        const { branchName, projectName, commitHash, commitMessage } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        
        console.error(`Adding commit separator to branch note at ${filePath}`);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `No branch note exists yet for branch "${branchName}" in project "${projectName}". Create one with update_branch_note first.`,
                },
              ],
            };
          }
          throw error;
        }
        
        // Read the current content
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Format the commit separator
        const timestamp = getFormattedDateTime();
        const separator = `\n---\n\n## COMMIT: ${commitHash.substring(0, 8)} | ${timestamp}\n**Full Hash:** ${commitHash}\n**Message:** ${commitMessage}\n\n---\n\n`;
        
        // Add the separator to the branch note
        await fs.writeFile(filePath, content + separator);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully added commit separator for commit ${commitHash.substring(0, 8)} to branch note.`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error adding commit separator: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'create_tacit_knowledge') {
      try {
        console.error('create_tacit_knowledge called with args:', JSON.stringify(toolArgs, null, 2));
        
        const { 
          title, 
          author, 
          projectName, 
          branchName, 
          tags, 
          problemStatement, 
          environment, 
          constraints, 
          approach, 
          outcome, 
          relatedDocumentation 
        } = toolArgs;
        
        console.error(`Creating tacit knowledge document for "${title}"`);
        
        // Format current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Create the knowledge directory path
        const knowledgeDir = path.join(getStorageRoot(), 'knowledge', projectName.replace(/[^a-zA-Z0-9-_]/g, '_'));
        await ensureDirectoryExists(path.join(knowledgeDir, 'placeholder.txt'));
        
        // Create a safe filename based on title
        const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filePath = path.join(knowledgeDir, `${currentDate}-${safeTitle}.md`);
        
        // Generate the tacit knowledge document using the template
        const content = `# Tacit Knowledge Capture

## Overview
This document captures tacit knowledge related to ${title}.

## Knowledge Details

### Basic Information
**Title:** ${title}  
**Date Captured:** ${currentDate}  
**Author:** ${author}  
**Project:** ${projectName}  
${branchName ? `**Branch:** ${branchName}  ` : ''}
${tags ? `**Tags:** ${tags}  ` : ''}

### Context
**Problem Statement:**  
${problemStatement}

${environment ? `**Environment/Conditions:**  
${environment}` : ''}

${constraints ? `**Constraints:**  
${constraints}` : ''}

---

## Knowledge Content

### Approach
${approach}

---

## Outcomes and Learning

### Results
**Outcome:**  
${outcome}

${relatedDocumentation ? `### Knowledge Connection
**Related Documentation:**  
${relatedDocumentation}` : ''}

---

*This knowledge document was created using the Cursor-Cortex knowledge management system.*
`;
        
        await fs.writeFile(filePath, content);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created tacit knowledge document: ${filePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating tacit knowledge document: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'create_completion_checklist') {
      try {
        console.error('create_completion_checklist called with args:', JSON.stringify(toolArgs, null, 2));
        
        const { 
          projectName, 
          featureName, 
          owner, 
          requirements, 
          objectives, 
          testCriteria, 
          knowledgeItems,
          jiraTicket
        } = toolArgs;
        
        console.error(`Creating completion checklist for "${featureName}" in project "${projectName}"`);
        
        // Format current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Create the checklist directory path
        const checklistDir = path.join(getStorageRoot(), 'checklists', projectName.replace(/[^a-zA-Z0-9-_]/g, '_'));
        await ensureDirectoryExists(path.join(checklistDir, 'placeholder.txt'));
        
        // Create a safe filename based on feature name
        const safeFeatureName = featureName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filePath = path.join(checklistDir, `${currentDate}-${safeFeatureName}-checklist.md`);
        
        // Generate the completion checklist using the template
        const content = `# Completion Checklist: ${featureName}

## Project Information
- **Project:** ${projectName}
- **Feature/Module:** ${featureName}
- **Owner:** ${owner}
- **Creation Date:** ${currentDate}
${jiraTicket ? `- **Jira Ticket:** ${jiraTicket}` : ''}

## Objectives and Requirements

### Objectives
${objectives.split('\n').map(obj => `- [ ] ${obj}`).join('\n')}

### Requirements
${requirements.split('\n').map(req => `- [ ] ${req}`).join('\n')}

${testCriteria ? `## Testing Criteria
${testCriteria.split('\n').map(test => `- [ ] ${test}`).join('\n')}` : ''}

## Knowledge Capture Requirements

${knowledgeItems ? `### Knowledge Items to Document
${knowledgeItems.split('\n').map(item => `- [ ] ${item}`).join('\n')}` : `### Knowledge Items to Document
- [ ] Technical decisions and their rationale
- [ ] Implementation challenges and solutions
- [ ] Lessons learned during development
- [ ] Areas for future improvement`}

## Sign-off

**Implementation Complete:** _____________ Date: _______

**Testing Complete:** _____________ Date: _______

**Knowledge Documented:** _____________ Date: _______

**Project Owner Approval:** _____________ Date: _______

---

*This checklist was created using the Cursor-Cortex knowledge management system.*
`;
        
        await fs.writeFile(filePath, content);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully created completion checklist: ${filePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating completion checklist: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'read_checklist') {
      try {
        const { projectName, checklistName = 'list' } = toolArgs;
        
        console.error(`Reading checklist for project "${projectName}": ${checklistName}`);
        
        if (checklistName === 'list') {
          // List all available checklists for the project
          const checklistDir = await getChecklistPath(projectName, 'list');
          
          try {
            const files = await fs.readdir(checklistDir);
            const checklists = files.filter(file => file.endsWith('-checklist.md'));
            
            if (checklists.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No checklists found for project ${projectName}.`,
                  },
                ],
              };
            }
            
            const formattedList = checklists.map(file => `- ${file}`).join('\n');
            
            return {
              content: [
                {
                  type: 'text',
                  text: `# Available Checklists for ${projectName}\n\n${formattedList}`,
                },
              ],
            };
          } catch (error) {
            if (error.code === 'ENOENT') {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No checklists found for project ${projectName}.`,
                  },
                ],
              };
            }
            throw error;
          }
        } else {
          // Read a specific checklist
          const checklistPath = await getChecklistPath(projectName, checklistName);
          
          try {
            const content = await fs.readFile(checklistPath, 'utf8');
            
            return {
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            };
          } catch (error) {
            if (error.code === 'ENOENT') {
              return {
                isError: true,
                content: [
                  {
                    type: 'text',
                    text: `Checklist not found: ${checklistName} for project ${projectName}.`,
                  },
                ],
              };
            }
            throw error;
          }
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error reading checklist: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'update_checklist') {
      try {
        const { 
          projectName, 
          checklistName, 
          itemPath, 
          status, 
          autoUpdate = false,
          branchName = 'main'
        } = toolArgs;
        
        console.error(`Updating checklist "${checklistName}" for project "${projectName}"`);
        
        // Read the existing checklist
        const checklistPath = await getChecklistPath(projectName, checklistName);
        
        try {
          let content = await fs.readFile(checklistPath, 'utf8');
          let updated = false;
          let updateReport = '';
          
          // Parse content into lines once, outside all conditional blocks
          const lines = content.split('\n');
          let updatedLines = [...lines];
          
          if (autoUpdate) {
            // Read branch context and notes
            const contextFilePath = getContextFilePath(projectName, branchName);
            const branchNotePath = getBranchNotePath(projectName, branchName);
            
            let contextContent = '';
            let branchNoteContent = '';
            
            try {
              contextContent = await fs.readFile(contextFilePath, 'utf8');
            } catch (error) {
              console.error(`No context file found for ${branchName}: ${error.message}`);
            }
            
            try {
              branchNoteContent = await fs.readFile(branchNotePath, 'utf8');
            } catch (error) {
              console.error(`No branch note found for ${branchName}: ${error.message}`);
            }
            
            // Define patterns to look for in branch notes and context
            const patterns = {
              // Reading tools patterns
              'reading branch notes': ['read branch note', 'read_branch_note', 'branch notes', 'viewing branch notes'],
              'reading context files': ['read context file', 'read_context_file', 'context files', 'viewing context'],
              'reading checklists': ['read checklist', 'read_checklist', 'viewing checklist'],
              
              // Knowledge patterns
              'technical decisions': ['architecture decision', 'technical choice', 'design decision', 'technical approach'],
              'implementation challenges': ['challenge', 'obstacle', 'difficulty', 'problem solved', 'workaround'],
              'lessons learned': ['lesson', 'learning', 'insight', 'discovered', 'realization'],
              'future improvements': ['improvement', 'enhancement', 'future work', 'todo', 'next steps']
            };
            
            // Combine content for searching
            const allContent = (contextContent + branchNoteContent).toLowerCase();
            
            // Process the checklist
            // REMOVED: const lines = content.split('\n');
            // REMOVED: const updatedLines = [...lines];
            
            // Track what was updated
            const updates = [];
            
            // Process each line with a checkbox
            lines.forEach((line, index) => {
              const checkboxMatch = line.match(/- \[([ x])\] (.*)/);
              if (checkboxMatch) {
                const isChecked = checkboxMatch[1] === 'x';
                const itemText = checkboxMatch[2];
                
                // Don't modify already checked items
                if (isChecked) return;
                
                // Check for matches against our patterns
                for (const [key, patternList] of Object.entries(patterns)) {
                  if (patternList.some(pattern => allContent.includes(pattern.toLowerCase()))) {
                    // If the item text contains our key or is very similar
                    if (itemText.toLowerCase().includes(key.toLowerCase()) || 
                        patternList.some(pattern => itemText.toLowerCase().includes(pattern))) {
                      // Update the checkbox to checked
                      updatedLines[index] = line.replace('- [ ]', '- [x]');
                      updates.push(itemText.trim());
                      updated = true;
                      break;
                    }
                  }
                }
              }
            });
            
            if (updates.length > 0) {
              updateReport = `Auto-updated ${updates.length} items based on branch context and notes:\n- ${updates.join('\n- ')}`;
            } else {
              updateReport = 'No items were auto-updated. No matching activities found in branch context and notes.';
            }
          } else if (itemPath && status !== undefined) {
            // Manual update of a specific item by path
            // REMOVED: const lines = content.split('\n');
            // REMOVED: const updatedLines = [...lines];
            
            // Parse the item path (e.g., "Requirements.1" for the first requirement)
            const [section, indexStr] = itemPath.split('.');
            const index = parseInt(indexStr, 10) - 1; // Convert to 0-based index
            
            if (isNaN(index) || index < 0) {
              throw new Error(`Invalid item path: ${itemPath}. Format should be 'Section.Number' (e.g., 'Requirements.1')`);
            }
            
            // Find the section
            let inTargetSection = false;
            let sectionItemCount = 0;
            let targetLineIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              // Check for section headers
              if (line.startsWith('###') || line.startsWith('##')) {
                // Reset section tracking when we encounter a header
                inTargetSection = line.toLowerCase().includes(section.toLowerCase());
                sectionItemCount = 0;
                continue;
              }
              
              // If we're in the target section, count checkbox items
              if (inTargetSection && line.trim().match(/- \[[ x]\]/)) {
                if (sectionItemCount === index) {
                  targetLineIndex = i;
                  break;
                }
                sectionItemCount++;
              }
            }
            
            if (targetLineIndex === -1) {
              throw new Error(`Could not find item at path ${itemPath}`);
            }
            
            // Update the checkbox
            if (status) {
              updatedLines[targetLineIndex] = updatedLines[targetLineIndex].replace('- [ ]', '- [x]');
            } else {
              updatedLines[targetLineIndex] = updatedLines[targetLineIndex].replace('- [x]', '- [ ]');
            }
            
            updated = true;
            updateReport = `Updated item at ${itemPath} to ${status ? 'completed' : 'not completed'}`;
          } else {
            throw new Error('Must specify either autoUpdate=true or provide itemPath and status');
          }
          
          if (updated) {
            // Write the updated content back
            await fs.writeFile(checklistPath, updatedLines.join('\n'));
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `${updated ? 'Successfully updated' : 'No updates made to'} checklist: ${checklistName}\n\n${updateReport}`,
              },
            ],
          };
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Checklist not found: ${checklistName} for project ${projectName}.`,
                },
              ],
            };
          }
          throw error;
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error updating checklist: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'sign_off_checklist') {
      try {
        const { 
          projectName, 
          checklistName, 
          signOffItem,
          signatureName
        } = toolArgs;
        
        console.error(`Signing off ${signOffItem} for checklist "${checklistName}" in project "${projectName}"`);
        
        // Read the existing checklist
        const checklistPath = await getChecklistPath(projectName, checklistName);
        
        try {
          let content = await fs.readFile(checklistPath, 'utf8');
          
          // Map of sign-off items to their regex patterns
          const signOffMap = {
            'Implementation': /\*\*Implementation Complete:\*\* _+ Date: _+/,
            'Testing': /\*\*Testing Complete:\*\* _+ Date: _+/,
            'Knowledge': /\*\*Knowledge Documented:\*\* _+ Date: _+/,
            'Approval': /\*\*Project Owner Approval:\*\* _+ Date: _+/
          };
          
          // Check if the sign-off item is valid
          if (!signOffMap[signOffItem]) {
            throw new Error(`Invalid sign-off item: ${signOffItem}. Valid options are: Implementation, Testing, Knowledge, Approval`);
          }
          
          // Get current date
          const currentDate = new Date().toISOString().split('T')[0];
          
          // Replace the sign-off line with the signature and date
          const updatedContent = content.replace(
            signOffMap[signOffItem], 
            `**${signOffItem} Complete:** ${signatureName} Date: ${currentDate}`
          );
          
          // Write the updated content back
          await fs.writeFile(checklistPath, updatedContent);
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully signed off ${signOffItem} for checklist: ${checklistName} by ${signatureName} on ${currentDate}`,
              },
            ],
          };
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Checklist not found: ${checklistName} for project ${projectName}.`,
                },
              ],
            };
          }
          throw error;
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error signing off checklist: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'read_tacit_knowledge') {
      try {
        const { projectName, documentName = 'list', searchTerm, searchTags, crossProject = true } = toolArgs;
        
        console.error(`Reading tacit knowledge documents for project "${projectName}"`);
        
        // Get knowledge directory path for a project
        function getKnowledgeDir(projectName) {
          const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
          return path.join(getStorageRoot(), 'knowledge', safeProjectName);
        }
        
        // Get all project directories in the knowledge root
        async function getAllProjectDirs() {
          const knowledgeRoot = path.join(getStorageRoot(), 'knowledge');
          try {
            const dirs = await fs.readdir(knowledgeRoot);
            return dirs;
          } catch (error) {
            if (error.code === 'ENOENT') {
              return [];
            }
            throw error;
          }
        }
        
        // Get knowledge document path
        async function getKnowledgeDocPath(projectName, docName) {
          const knowledgeDir = getKnowledgeDir(projectName);
          
          // Handle exact match on the full path if provided
          if (docName.endsWith('.md')) {
            return path.join(knowledgeDir, docName);
          }
          
          // Otherwise, try to find the document by partial name
          try {
            const files = await fs.readdir(knowledgeDir);
            const matchingFile = files.find(file => 
              file.includes(docName) && file.endsWith('.md')
            );
            
            if (matchingFile) {
              return path.join(knowledgeDir, matchingFile);
            }
          } catch {
            // Directory doesn't exist, which will be handled in the read function
          }
          
          // If we didn't find a match, just return the path with the name as-is
          return path.join(knowledgeDir, `${docName}.md`);
        }
        
        // List all knowledge documents for a project
        async function listKnowledgeDocs(projectName) {
          const knowledgeDir = getKnowledgeDir(projectName);
          try {
            const files = await fs.readdir(knowledgeDir);
            return files.filter(file => file.endsWith('.md'));
          } catch {
            // Directory doesn't exist, which will be handled in the read function
          }
        }
        
        // Extract tags from knowledge document content
        function extractTags(content) {
          const tagsMatch = content.match(/\*\*Tags:\*\*\s*(.*?)\s*\n/);
          if (tagsMatch && tagsMatch[1]) {
            return tagsMatch[1].split(',').map(tag => tag.trim().toLowerCase());
          }
          return [];
        }
        
        // Search for documents matching search term and tags
        async function searchKnowledgeDocs(projects, searchTerm, searchTags) {
          const results = [];
          
          // Parse search tags if provided
          const tags = searchTags ? searchTags.split(',').map(tag => tag.trim().toLowerCase()) : [];
          
          for (const project of projects) {
            const docs = await listKnowledgeDocs(project);
            
            for (const doc of docs) {
              try {
                const docPath = path.join(getKnowledgeDir(project), doc);
                const content = await fs.readFile(docPath, 'utf8');
                
                // Check for search term in content if provided
                const matchesSearchTerm = !searchTerm || content.toLowerCase().includes(searchTerm.toLowerCase());
                
                // Check for tags if provided
                const docTags = extractTags(content);
                const matchesTags = !searchTags || tags.some(tag => docTags.includes(tag));
                
                // Extract title from content
                const titleMatch = content.match(/\*\*Title:\*\*\s*(.*?)\s*\n/);
                const title = titleMatch ? titleMatch[1] : doc.replace('.md', '');
                
                // If matches search criteria, add to results
                if (matchesSearchTerm && matchesTags) {
                  results.push({
                    project,
                    document: doc,
                    title,
                    tags: docTags,
                    path: docPath
                  });
                }
              } catch {
                // Directory doesn't exist, which will be handled in the read function
              }
            }
          }
          
          return results;
        }
        
        // If we're listing all documents or searching
        if (documentName === 'list' || searchTerm || searchTags) {
          // Determine which projects to search
          const projects = crossProject ? 
            await getAllProjectDirs() : 
            [projectName];
          
          if (searchTerm || searchTags) {
            // Perform search across specified projects
            const searchResults = await searchKnowledgeDocs(projects, searchTerm || '', searchTags || '');
            
            if (searchResults.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No knowledge documents found matching the search criteria.`,
                  },
                ],
              };
            }
            
            // Format search results
            let resultContent = `# Knowledge Search Results\n\n`;
            resultContent += `Found ${searchResults.length} document(s) matching your criteria:\n\n`;
            
            resultContent += searchResults.map(result => {
              const relativePath = result.document;
              const tagsStr = result.tags.length > 0 ? ` [Tags: ${result.tags.join(', ')}]` : '';
              return `- **${result.title}** (${result.project}/${relativePath})${tagsStr}`;
            }).join('\n');
            
            return {
              content: [
                {
                  type: 'text',
                  text: resultContent,
                },
              ],
            };
          } else {
            // List all documents for the project(s)
            if (crossProject) {
              // List documents from all projects
              const allDocs = [];
              for (const project of projects) {
                const docs = await listKnowledgeDocs(project);
                for (const doc of docs) {
                  allDocs.push({
                    project,
                    document: doc,
                    title: doc.replace('.md', '')
                  });
                }
              }
              
              if (allDocs.length === 0) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: `No knowledge documents found across all projects.`,
                    },
                  ],
                };
              }
            
              // Group by project
              const docsByProject = {};
              for (const doc of allDocs) {
                if (!docsByProject[doc.project]) {
                  docsByProject[doc.project] = [];
                }
                docsByProject[doc.project].push(doc);
              }
              
              let resultContent = `# Available Knowledge Documents (All Projects)\n\n`;
              resultContent += `Found ${allDocs.length} document(s) across ${Object.keys(docsByProject).length} project(s):\n\n`;
              
              for (const project in docsByProject) {
                resultContent += `## Project: ${project}\n\n`;
                const docs = docsByProject[project];
                for (const doc of docs) {
                  resultContent += `- ${doc.document}\n`;
                }
                resultContent += '\n';
              }
            
              return {
                content: [
                  {
                    type: 'text',
                    text: resultContent,
                  },
                ],
              };
            } else {
              // List documents for single project
              const docs = await listKnowledgeDocs(projectName);
          
              if (docs.length === 0) {
                return {
                  content: [
                    {
                      type: 'text',
                      text: `No knowledge documents found for project ${projectName}.`,
                    },
                  ],
                };
              }
              
              const formattedList = docs.map(doc => `- ${doc}`).join('\n');
              
              return {
                content: [
                  {
                    type: 'text',
                    text: `# Available Knowledge Documents for ${projectName}\n\n${formattedList}`,
                  },
                ],
              };
            }
          }
        } else {
          // Read a specific knowledge document
          const docPath = await getKnowledgeDocPath(projectName, documentName);
          
          try {
            const content = await fs.readFile(docPath, 'utf8');
            
            return {
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            };
          } catch {
            // Directory doesn't exist, which will be handled in the read function
          }
        }
      } catch {
        // Directory doesn't exist, which will be handled in the read function
      }
    } else if (name === 'filter_branch_note') {
      try {
        const { branchName, projectName, commitHash, beforeDate, afterDate, uncommittedOnly = true } = toolArgs;
        
        console.error(`Filtering branch notes for project "${projectName}", uncommittedOnly: ${uncommittedOnly}`);
        
        // Get branch note path
        const branchNotePath = getBranchNotePath(projectName, branchName);
        
        // Read branch note content
        let branchNoteContent;
        try {
          branchNoteContent = await fs.readFile(branchNotePath, 'utf-8');
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: `No branch note exists yet for branch "${branchName}" in project "${projectName}".`,
                },
              ],
            };
          }
          throw error;
        }
        
        // For uncommitted work, we need to process this differently
        if (uncommittedOnly) {
          console.error('Filtering for uncommitted work');
          
          // Split by section headers (## format in Markdown)
          const sections = branchNoteContent.split('## ').filter(Boolean);
          
          if (sections.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Branch note exists but has no entries.`,
                },
              ],
            };
          }
          
          // Log section headers to help debug
          console.error(`Found ${sections.length} sections`);
          
          // Find the last commit separator by looking for the string "COMMIT:"
          const reversedSections = [...sections].reverse();
          const lastCommitIndex = reversedSections.findIndex(section => 
            section.includes('COMMIT:')
          );
          
          console.error(`Last commit separator found at index ${lastCommitIndex}`);
          
          if (lastCommitIndex === -1) {
            // No commit separator found, return all entries
            let resultContent = `# Uncommitted Work in Branch Notes for ${projectName}\n\n`;
            resultContent += `*Note: No commit separators found. Showing all entries.*\n\n`;
            
            for (let i = 0; i < sections.length; i++) {
              const lines = sections[i].split('\n');
              const timestamp = lines[0].trim();
              const content = lines.slice(1).join('\n');
              resultContent += `## ${timestamp}\n${content}\n\n`;
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: resultContent,
                },
              ],
            };
          }
          
          // Get only entries after the last commit separator
          const entriesSinceCommit = reversedSections.slice(0, lastCommitIndex).reverse();
          
          console.error(`Found ${entriesSinceCommit.length} entries since last commit`);
          
          if (entriesSinceCommit.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No uncommitted work found in branch notes for "${branchName}". All changes have been committed.`,
                },
              ],
            };
          }
          
          let resultContent = `# Uncommitted Work in Branch Notes for ${projectName}\n\n`;
          resultContent += `*Showing ${entriesSinceCommit.length} entries since last commit*\n\n`;
          
          for (const entry of entriesSinceCommit) {
            const lines = entry.split('\n');
            const timestamp = lines[0].trim();
            const content = lines.slice(1).join('\n');
            resultContent += `## ${timestamp}\n${content}\n\n`;
          }
          
          // Return only the uncommitted entries
          return {
            content: [
              {
                type: 'text',
                text: resultContent,
              },
            ],
          };
        }
        
        // For other types of filtering
        // Extract entries from branch note
        const entries = branchNoteContent.split('## ').filter(Boolean);
        if (entries.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Branch note exists but has no entries.`,
              },
            ],
          };
        }
        
        // Filter entries based on criteria
        const filteredEntries = entries.filter((entry) => {
          // Skip commit separator entries
          if (entry.includes('COMMIT:')) {
            return false;
          }
          
          // Filter by commit hash
          if (commitHash && !entry.includes(commitHash)) {
            return false;
          }
          
          // Filter by date range
          const lines = entry.split('\n');
          const timestamp = lines[0].trim();
          
          let entryDate;
          try {
            entryDate = new Date(timestamp);
            const before = beforeDate ? new Date(beforeDate) >= entryDate : true;
            const after = afterDate ? new Date(afterDate) <= entryDate : true;
            
            return before && after;
          } catch (error) {
            // If we can't parse the date, include the entry by default for safety
            console.error('Failed to parse date:', timestamp, error.message);
            return true;
          }
        });
        
        if (filteredEntries.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No branch notes found matching the filter criteria.`,
              },
            ],
          };
        }
        
        // Format filtered branch notes with appropriate title
        let resultContent;
        if (commitHash) {
          resultContent = `# Branch Notes for Commit ${commitHash} in ${projectName}\n\n`;
        } else if (beforeDate || afterDate) {
          resultContent = `# Branch Notes for ${projectName} (${afterDate || 'start'} to ${beforeDate || 'now'})\n\n`;
        } else {
          resultContent = `# Filtered Branch Notes for ${projectName}\n\n`;
        }
        
        resultContent += filteredEntries.map(entry => {
          const lines = entry.split('\n');
          const timestamp = lines[0].trim();
          const changes = lines.slice(1).filter(line => line.trim() !== '').join('\n');
          return `## ${timestamp}\n${changes}\n\n`;
        }).join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: resultContent,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error filtering branch notes: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'archive_branch_note') {
      try {
        const { branchName, projectName, archiveDate = new Date().toISOString().split('T')[0] } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        const archiveFilePath = getBranchNoteArchivePath(projectName, branchName, archiveDate);
        
        // Ensure the archives directory exists
        await ensureDirectoryExists(archiveFilePath);
        
        console.error(`Archiving branch note at ${filePath} to ${archiveFilePath}`);
        
        // Read the current content
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Archive the branch note
        await fs.writeFile(archiveFilePath, content);
        
        // Delete the original branch note
        await fs.unlink(filePath);
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully archived branch note from ${filePath} to ${archiveFilePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error archiving branch note: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'clear_branch_note') {
      try {
        const { branchName, projectName, createArchive = true, keepHeader = true } = toolArgs;
        const filePath = getBranchNotePath(projectName, branchName);
        const archiveFilePath = getBranchNoteArchivePath(projectName, branchName, new Date().toISOString().split('T')[0]);
        
        // Check if the file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: `No branch note exists yet for branch "${branchName}" in project "${projectName}".`,
                },
              ],
            };
          }
          throw error;
        }
        
        console.error(`Clearing branch note at ${filePath}`);
        
        // Read the current content
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Archive the branch note if requested
        if (createArchive) {
          // Ensure the archives directory exists
          await ensureDirectoryExists(archiveFilePath);
          console.error(`Archiving to ${archiveFilePath} before clearing`);
          await fs.writeFile(archiveFilePath, content);
        }
        
        // Clear the branch note
        await fs.writeFile(filePath, keepHeader ? `# Branch Note: ${branchName} (${projectName})\n\n` : '');
        
        return {
          content: [
            {
              type: 'text',
              text: `Successfully cleared branch note for ${branchName} in project ${projectName}${createArchive ? ' (archived first)' : ''}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error clearing branch note: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'list_all_branch_notes') {
      try {
        const { currentProject, includeEmpty = false } = toolArgs;
        const storageRoot = getStorageRoot();
        const branchNotesDir = path.join(storageRoot, 'branch_notes');
        
        console.error('Listing all branch notes from', branchNotesDir);
        
        // Get all project directories
        let projectDirs = [];
        try {
          projectDirs = await fs.readdir(branchNotesDir);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No branch notes directory found. Create some branch notes first.',
                },
              ],
            };
          }
          throw error;
        }
        
        // Collect all branch notes organized by branch name
        const branchGroups = {};
        const projectBranchCounts = {};
        
        for (const projectName of projectDirs) {
          const projectPath = path.join(branchNotesDir, projectName);
          const stat = await fs.stat(projectPath);
          
          if (!stat.isDirectory()) continue;
          
          projectBranchCounts[projectName] = 0;
          
          try {
            const branchFiles = await fs.readdir(projectPath);
            
            for (const branchFile of branchFiles) {
              if (!branchFile.endsWith('.md')) continue;
              
              const branchName = branchFile.replace('.md', '');
              const branchFilePath = path.join(projectPath, branchFile);
              
              // Read file to check if it has content (optional)
              let hasContent = true;
              if (!includeEmpty) {
                try {
                  const content = await fs.readFile(branchFilePath, 'utf-8');
                  // Check if file has content beyond just header
                  const lines = content.split('\n').filter(line => line.trim());
                  hasContent = lines.length > 1; // More than just header
                } catch (error) {
                  hasContent = false;
                }
              }
              
              if (hasContent || includeEmpty) {
                if (!branchGroups[branchName]) {
                  branchGroups[branchName] = [];
                }
                
                branchGroups[branchName].push({
                  projectName,
                  branchName,
                  filePath: branchFilePath,
                  isCurrentProject: currentProject === projectName
                });
                
                projectBranchCounts[projectName]++;
              }
            }
          } catch (error) {
            console.error(`Error reading project ${projectName}:`, error.message);
          }
        }
        
        // Sort branches by priority: main, stage, then alphabetically
        const sortedBranchNames = Object.keys(branchGroups).sort((a, b) => {
          if (a === 'main') return -1;
          if (b === 'main') return 1;
          if (a === 'stage') return -1;
          if (b === 'stage') return 1;
          return a.localeCompare(b);
        });
        
        // Build response
        let response = '# All Branch Notes\n\n';
        
        // Summary
        const totalBranches = sortedBranchNames.length;
        const totalProjects = Object.keys(projectBranchCounts).length;
        const totalFiles = Object.values(branchGroups).flat().length;
        
        response += `**Summary:** ${totalFiles} branch notes across ${totalBranches} branches in ${totalProjects} projects\n\n`;
        
        // Project breakdown
        response += '**Projects:**\n';
        Object.entries(projectBranchCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([project, count]) => {
            const marker = currentProject === project ? ' ← Current' : '';
            response += `- ${project}: ${count} branches${marker}\n`;
          });
        response += '\n---\n\n';
        
        // List by branch
        for (const branchName of sortedBranchNames) {
          const branches = branchGroups[branchName];
          response += `## Branch: ${branchName}\n\n`;
          
          // Sort projects within each branch alphabetically
          branches.sort((a, b) => a.projectName.localeCompare(b.projectName));
          
          branches.forEach(branch => {
            const currentMarker = branch.isCurrentProject ? ' ★' : '';
            response += `- **${branch.projectName}**${currentMarker}\n`;
            response += `  - Path: \`${branch.filePath}\`\n`;
          });
          
          response += '\n';
        }
        
        if (totalFiles === 0) {
          response = 'No branch notes found. Create some branch notes first using update_branch_note.';
        }
        
        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing branch notes: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'enhanced_branch_survey') {
      try {
        const { currentProject, includeAnalysis = true, minCompletenessScore = 0, detectRelationships = true } = toolArgs;
        const storageRoot = getStorageRoot();
        const branchNotesDir = path.join(storageRoot, 'branch_notes');
        
        console.error('Running enhanced branch survey with knowledge archaeology...');
        
        // Get all project directories
        let projectDirs = [];
        try {
          projectDirs = await fs.readdir(branchNotesDir);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No branch notes directory found. Create some branch notes first.',
                },
              ],
            };
          }
          throw error;
        }
        
        // Enhanced analysis functions
        function calculateCompletenessScore(content) {
          const lines = content.split('\n').filter(line => line.trim());
          const entries = content.split('## ').filter(Boolean);
          const wordCount = content.split(/\s+/).length;
          const hasCommitSeparators = content.includes('COMMIT:');
          const hasTimestamps = /\d{4}-\d{2}-\d{2}/.test(content);
          
          let score = 0;
          score += Math.min(entries.length * 5, 30); // Up to 30 points for entries
          score += Math.min(wordCount / 10, 25); // Up to 25 points for content depth
          score += hasCommitSeparators ? 20 : 0; // 20 points for commit tracking
          score += hasTimestamps ? 15 : 0; // 15 points for proper timestamps
          score += lines.length > 10 ? 10 : 0; // 10 points for substantial content
          
          return Math.min(score, 100);
        }
        
        function assessProductionReadiness(content) {
          const lowerContent = content.toLowerCase();
          const productionIndicators = [
            'completed', 'deployed', 'merged', 'production', 'released', 'finished',
            'implemented', 'tested', 'validated', 'approved', 'live'
          ];
          const developmentIndicators = [
            'working on', 'in progress', 'todo', 'draft', 'testing', 'prototype',
            'experimenting', 'trying', 'investigating', 'planning'
          ];
          
          const prodScore = productionIndicators.filter(word => lowerContent.includes(word)).length;
          const devScore = developmentIndicators.filter(word => lowerContent.includes(word)).length;
          
          if (prodScore > devScore * 1.5) return 'Production';
          if (devScore > prodScore * 1.5) return 'Development';
          return 'Mixed';
        }
        
        function detectRelationshipPatterns(content, branchName, projectName) {
          const relationships = [];
          const lowerContent = content.toLowerCase();
          
          // Ticket pattern detection (CLIP-1234, JIRA-123, etc.)
          const ticketMatches = content.match(/[A-Z]+-\d+/g) || [];
          ticketMatches.forEach(ticket => {
            relationships.push({
              type: 'ticket',
              value: ticket,
              confidence: 'high'
            });
          });
          
          // Feature pattern detection
          const featurePatterns = ['feature', 'enhancement', 'improvement', 'fix', 'bug'];
          featurePatterns.forEach(pattern => {
            if (lowerContent.includes(pattern)) {
              relationships.push({
                type: 'feature_type',
                value: pattern,
                confidence: 'medium'
              });
            }
          });
          
          // Technology stack detection
          const techStack = ['sql', 'python', 'databricks', 'docker', 'git', 'mcp', 'node.js', 'javascript'];
          techStack.forEach(tech => {
            if (lowerContent.includes(tech)) {
              relationships.push({
                type: 'technology',
                value: tech,
                confidence: 'medium'
              });
            }
          });
          
          return relationships;
        }
        
        // Collect enhanced branch analysis
        const branchAnalysis = [];
        const projectStats = {};
        const globalRelationships = {};
        
        for (const projectName of projectDirs) {
          const projectPath = path.join(branchNotesDir, projectName);
          const stat = await fs.stat(projectPath);
          
          if (!stat.isDirectory()) continue;
          
          projectStats[projectName] = {
            branches: 0,
            totalCompleteness: 0,
            productionReady: 0,
            inDevelopment: 0,
            averageScore: 0
          };
          
          try {
            const branchFiles = await fs.readdir(projectPath);
            
            for (const branchFile of branchFiles) {
              if (!branchFile.endsWith('.md')) continue;
              
              const branchName = branchFile.replace('.md', '');
              const branchFilePath = path.join(projectPath, branchFile);
              
              try {
                const content = await fs.readFile(branchFilePath, 'utf-8');
                const lines = content.split('\n').filter(line => line.trim());
                
                if (lines.length <= 1) continue; // Skip empty files
                
                const completenessScore = includeAnalysis ? calculateCompletenessScore(content) : 0;
                const productionReadiness = includeAnalysis ? assessProductionReadiness(content) : 'Unknown';
                const relationships = detectRelationships ? detectRelationshipPatterns(content, branchName, projectName) : [];
                
                // Skip if below minimum completeness score
                if (completenessScore < minCompletenessScore) continue;
                
                const analysis = {
                  projectName,
                  branchName,
                  filePath: branchFilePath,
                  isCurrentProject: currentProject === projectName,
                  completenessScore,
                  productionReadiness,
                  relationships,
                  entryCount: content.split('## ').filter(Boolean).length,
                  wordCount: content.split(/\s+/).length,
                  hasCommitSeparators: content.includes('COMMIT:'),
                  lastModified: (await fs.stat(branchFilePath)).mtime
                };
                
                branchAnalysis.push(analysis);
                
                // Update project stats
                projectStats[projectName].branches++;
                projectStats[projectName].totalCompleteness += completenessScore;
                if (productionReadiness === 'Production') projectStats[projectName].productionReady++;
                if (productionReadiness === 'Development') projectStats[projectName].inDevelopment++;
                
                // Track global relationships
                relationships.forEach(rel => {
                  const key = `${rel.type}:${rel.value}`;
                  if (!globalRelationships[key]) {
                    globalRelationships[key] = {
                      type: rel.type,
                      value: rel.value,
                      branches: []
                    };
                  }
                  globalRelationships[key].branches.push({
                    project: projectName,
                    branch: branchName,
                    confidence: rel.confidence
                  });
                });
                
              } catch (error) {
                console.error(`Error analyzing ${branchFile}:`, error.message);
              }
            }
            
            // Calculate average score
            if (projectStats[projectName].branches > 0) {
              projectStats[projectName].averageScore = Math.round(
                projectStats[projectName].totalCompleteness / projectStats[projectName].branches
              );
            }
            
          } catch (error) {
            console.error(`Error reading project ${projectName}:`, error.message);
          }
        }
        
        // Sort analysis by completeness score (highest first)
        branchAnalysis.sort((a, b) => b.completenessScore - a.completenessScore);
        
        // Build comprehensive response
        let response = '# 🔍 Enhanced Branch Survey - Knowledge Archaeology Report\n\n';
        
        // Executive Summary
        const totalBranches = branchAnalysis.length;
        const totalProjects = Object.keys(projectStats).length;
        const avgCompleteness = Math.round(
          branchAnalysis.reduce((sum, b) => sum + b.completenessScore, 0) / totalBranches
        );
        const productionReadyCount = branchAnalysis.filter(b => b.productionReadiness === 'Production').length;
        
        response += `## 📊 Executive Summary\n\n`;
        response += `- **${totalBranches} branches** analyzed across **${totalProjects} projects**\n`;
        response += `- **Average Completeness Score**: ${avgCompleteness}/100\n`;
        response += `- **Production Ready**: ${productionReadyCount} branches (${Math.round(productionReadyCount/totalBranches*100)}%)\n\n`;
        
        // Project Breakdown
        response += `## 🏗️ Project Analysis\n\n`;
        Object.entries(projectStats)
          .sort(([,a], [,b]) => b.averageScore - a.averageScore)
          .forEach(([project, stats]) => {
            const marker = currentProject === project ? ' ⭐ Current' : '';
            response += `### ${project}${marker}\n`;
            response += `- **Branches**: ${stats.branches}\n`;
            response += `- **Avg Completeness**: ${stats.averageScore}/100\n`;
            response += `- **Production Ready**: ${stats.productionReady} | **In Development**: ${stats.inDevelopment}\n\n`;
          });
        
        // Relationship Analysis
        if (detectRelationships && Object.keys(globalRelationships).length > 0) {
          response += `## 🔗 Cross-Branch Relationship Analysis\n\n`;
          
          const ticketRels = Object.values(globalRelationships).filter(r => r.type === 'ticket');
          if (ticketRels.length > 0) {
            response += `### 🎫 Tickets Found Across Branches\n`;
            ticketRels.forEach(rel => {
              if (rel.branches.length > 1) {
                response += `- **${rel.value}**: Found in ${rel.branches.length} branches\n`;
                rel.branches.forEach(b => {
                  response += `  - ${b.project}/${b.branch}\n`;
                });
              }
            });
            response += '\n';
          }
          
          const techRels = Object.values(globalRelationships).filter(r => r.type === 'technology');
          if (techRels.length > 0) {
            response += `### 🛠️ Technology Stack Distribution\n`;
            techRels.sort((a, b) => b.branches.length - a.branches.length).slice(0, 5).forEach(rel => {
              response += `- **${rel.value}**: ${rel.branches.length} branches\n`;
            });
            response += '\n';
          }
        }
        
        // Detailed Branch Analysis
        response += `## 📋 Detailed Branch Analysis\n\n`;
        
        const highScoreBranches = branchAnalysis.filter(b => b.completenessScore >= 70);
        if (highScoreBranches.length > 0) {
          response += `### 🏆 High-Quality Documentation (Score ≥ 70)\n`;
          highScoreBranches.forEach(branch => {
            const marker = branch.isCurrentProject ? ' ⭐' : '';
            response += `- **${branch.projectName}/${branch.branchName}**${marker} - Score: ${branch.completenessScore}/100\n`;
            response += `  - Status: ${branch.productionReadiness} | Entries: ${branch.entryCount} | Words: ${branch.wordCount}\n`;
            if (branch.relationships.length > 0) {
              response += `  - Related: ${branch.relationships.map(r => r.value).join(', ')}\n`;
            }
          });
          response += '\n';
        }
        
        const mediumScoreBranches = branchAnalysis.filter(b => b.completenessScore >= 30 && b.completenessScore < 70);
        if (mediumScoreBranches.length > 0) {
          response += `### 📝 Medium Documentation (Score 30-69)\n`;
          mediumScoreBranches.slice(0, 10).forEach(branch => {
            const marker = branch.isCurrentProject ? ' ⭐' : '';
            response += `- **${branch.projectName}/${branch.branchName}**${marker} - Score: ${branch.completenessScore}/100 (${branch.productionReadiness})\n`;
          });
          if (mediumScoreBranches.length > 10) {
            response += `- ... and ${mediumScoreBranches.length - 10} more\n`;
          }
          response += '\n';
        }
        
        const lowScoreBranches = branchAnalysis.filter(b => b.completenessScore < 30);
        if (lowScoreBranches.length > 0) {
          response += `### ⚠️ Needs Attention (Score < 30)\n`;
          response += `Found ${lowScoreBranches.length} branches with minimal documentation\n`;
          lowScoreBranches.slice(0, 5).forEach(branch => {
            response += `- ${branch.projectName}/${branch.branchName} (Score: ${branch.completenessScore})\n`;
          });
          response += '\n';
        }
        
        // Recommendations
        response += `## 💡 Knowledge Archaeology Recommendations\n\n`;
        if (productionReadyCount > 0) {
          response += `1. **Production Consolidation**: ${productionReadyCount} branches contain production-ready work that could be consolidated into main branch documentation\n`;
        }
        if (Object.values(globalRelationships).some(r => r.branches.length > 1)) {
          response += `2. **Cross-Branch Synthesis**: Multiple branches work on related tickets/features - consider consolidating related work\n`;
        }
        if (lowScoreBranches.length > 0) {
          response += `3. **Documentation Enhancement**: ${lowScoreBranches.length} branches need documentation improvement for better knowledge capture\n`;
        }
        
        response += '\n';
        
        response += '---\n\n';
        response += '💡 **Next Steps**: Use findings to improve documentation completeness and production readiness across projects.\n';
        
        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error running enhanced branch survey: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'construct_project_narrative') {
      try {
        const { projectName, branchName = 'main', includeKnowledge = true, includeContext = true, narrativeType = 'full' } = toolArgs;
        
        console.error(`Constructing project narrative for project "${projectName}"`);
        
        // Get root storage directory for cursor-cortex files
        const storageRoot = getStorageRoot();
        
        // Get branch notes for the project
        const branchNotes = await getBranchNotesForProject(projectName);
        
        // Get knowledge documents for the project
        const knowledgeDocs = includeKnowledge ? await getKnowledgeDocumentsForProject(projectName) : [];
        
        // Get context information for the project
        const contextInfo = includeContext ? await getContextInfoForProject(projectName) : null;
        
        // Construct the narrative
        const narrative = constructProjectNarrative(branchNotes, knowledgeDocs, contextInfo);
        
        return {
          content: [
            {
              type: 'text',
              text: narrative,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error constructing project narrative: ${error.message}`,
            },
          ],
        };
      }
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error processing tool request: ${error.message}`,
        },
      ],
    };
  }
});

// =============================================================================
// NARRATIVE CONSTRUCTION ENGINE (Phase 2.1)
// Knowledge Archaeology & Reality Sync Engine
// =============================================================================

/**
 * Constructs cohesive narratives from scattered technical details
 * Part of Knowledge Archaeology & Reality Sync Engine
 */
function constructProjectNarrative(branchNotes, knowledgeDocs, contextInfo) {
  try {
    const narrative = {
      timeline: constructTimeline(branchNotes),
      technicalJourney: constructTechnicalJourney(branchNotes, knowledgeDocs),
      businessValue: extractBusinessValue(branchNotes, knowledgeDocs, contextInfo),
      keyDecisions: identifyKeyDecisions(branchNotes, knowledgeDocs),
      productionStory: constructProductionStory(branchNotes, knowledgeDocs),
      executiveSummary: generateExecutiveSummary(branchNotes, knowledgeDocs, contextInfo)
    };
    
    return formatNarrativeOutput(narrative);
  } catch (error) {
    return `❌ Narrative Construction Error: ${error.message}`;
  }
}

/**
 * Constructs chronological timeline from branch notes and commits
 */
function constructTimeline(branchNotes) {
  const events = [];
  
  // Extract commit separators with dates
  const commitPattern = /(?:^|\n)---\n.*?COMMIT:\s*([a-f0-9]{7,})\s*\|\s*(.+?)(?:\n|$)/gm;
  let match;
  
  while ((match = commitPattern.exec(branchNotes)) !== null) {
    const [, hash, timestamp] = match;
    events.push({
      type: 'commit',
      date: timestamp.trim(),
      hash: hash,
      significance: 'high'
    });
  }
  
  // Extract major milestones from headings
  const milestonePattern = /^## (.+?)$/gm;
  while ((match = milestonePattern.exec(branchNotes)) !== null) {
    const milestone = match[1];
    if (!milestone.includes('COMMIT:') && milestone.length > 3) {
      events.push({
        type: 'milestone',
        description: milestone,
        significance: 'medium'
      });
    }
  }
  
  // Sort by date where available
  events.sort((a, b) => {
    if (a.date && b.date) {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (!isNaN(dateA) && !isNaN(dateB)) {
        return dateA - dateB;
      }
    }
    return 0;
  });
  
  return events;
}

/**
 * Traces the technical evolution and key architectural decisions
 */
function constructTechnicalJourney(branchNotes, knowledgeDocs) {
  const journey = {
    architecturalEvolution: [],
    technologyChoices: [],
    problemSolving: [],
    technicalDebt: []
  };
  
  // Analyze architectural patterns
  const archPatterns = [
    'microservices', 'monolith', 'api', 'database', 'cache', 'queue',
    'docker', 'kubernetes', 'serverless', 'event-driven', 'mcp', 'node.js'
  ];
  
  const content = branchNotes + '\n' + knowledgeDocs;
  const lowerContent = content.toLowerCase();
  
  archPatterns.forEach(pattern => {
    if (lowerContent.includes(pattern)) {
      const contexts = extractContextAroundKeyword(content, pattern, 100);
      if (contexts.length > 0) {
        journey.architecturalEvolution.push({
          technology: pattern,
          contexts: contexts,
          impact: 'medium'
        });
      }
    }
  });
  
  // Extract problem-solution pairs
  const problemIndicators = ['issue', 'problem', 'bug', 'error', 'challenge', 'limitation'];
  const solutionIndicators = ['solved', 'fixed', 'implemented', 'resolved', 'approach', 'solution'];
  
  problemIndicators.forEach(indicator => {
    const problems = extractContextAroundKeyword(content, indicator, 150);
    problems.forEach(problem => {
      const hasSolution = solutionIndicators.some(sol => 
        problem.toLowerCase().includes(sol)
      );
      if (hasSolution) {
        journey.problemSolving.push({
          context: problem,
          type: 'resolved',
          significance: 'high'
        });
      }
    });
  });
  
  return journey;
}

/**
 * Extracts business value and impact from technical work
 */
function extractBusinessValue(branchNotes, knowledgeDocs, contextInfo) {
  const businessValue = {
    objectives: [],
    impacts: [],
    stakeholderValue: [],
    outcomes: []
  };
  
  const content = branchNotes + '\n' + knowledgeDocs;
  
  // Extract objectives from context or requirements
  if (contextInfo && contextInfo.description) {
    businessValue.objectives.push({
      description: contextInfo.description,
      source: 'context',
      confidence: 'high'
    });
  }
  
  // Look for business impact keywords
  const impactKeywords = [
    'efficiency', 'performance', 'scalability', 'reliability', 'security',
    'user experience', 'cost reduction', 'automation', 'productivity'
  ];
  
  impactKeywords.forEach(keyword => {
    const contexts = extractContextAroundKeyword(content, keyword, 100);
    contexts.forEach(context => {
      businessValue.impacts.push({
        type: keyword,
        description: context,
        confidence: 'medium'
      });
    });
  });
  
  return businessValue;
}

/**
 * Identifies and contextualizes key technical decisions
 */
function identifyKeyDecisions(branchNotes, knowledgeDocs) {
  const decisions = [];
  
  const content = branchNotes + '\n' + knowledgeDocs;
  
  // Look for decision patterns
  const decisionPatterns = [
    /decided to (.+?)(?:\.|$)/gi,
    /chose (.+?) because (.+?)(?:\.|$)/gi,
    /approach[ed]? (.+?) by (.+?)(?:\.|$)/gi,
    /implemented (.+?) to (.+?)(?:\.|$)/gi
  ];
  
  decisionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      decisions.push({
        decision: match[1],
        reasoning: match[2] || 'Not explicitly stated',
        context: match[0],
        significance: 'medium'
      });
    }
  });
  
  return decisions;
}

/**
 * Constructs the production deployment story
 */
function constructProductionStory(branchNotes, knowledgeDocs) {
  const story = {
    readiness: 'unknown',
    deploymentPath: [],
    prerequisites: [],
    risks: [],
    successCriteria: []
  };
  
  const content = branchNotes + '\n' + knowledgeDocs;
  
  // Assess production readiness signals
  const productionSignals = [
    'deployed', 'production', 'live', 'released', 'shipping',
    'testing', 'qa', 'staging', 'integration'
  ];
  
  const readinessScore = productionSignals.reduce((score, signal) => {
    return score + (content.toLowerCase().includes(signal) ? 1 : 0);
  }, 0);
  
  if (readinessScore >= 4) story.readiness = 'high';
  else if (readinessScore >= 2) story.readiness = 'medium';
  else story.readiness = 'low';
  
  // Extract deployment-related information
  const deploymentKeywords = ['deploy', 'release', 'launch', 'rollout'];
  deploymentKeywords.forEach(keyword => {
    const contexts = extractContextAroundKeyword(content, keyword, 100);
    story.deploymentPath.push(...contexts.map(ctx => ({
      step: ctx,
      keyword: keyword
    })));
  });
  
  return story;
}

/**
 * Generates executive summary suitable for stakeholders
 */
function generateExecutiveSummary(branchNotes, knowledgeDocs, contextInfo) {
  const wordCount = (branchNotes + knowledgeDocs).split(/\s+/).length;
  const complexity = wordCount > 5000 ? 'high' : wordCount > 1000 ? 'medium' : 'low';
  
  const summary = {
    projectOverview: contextInfo?.title || 'Technical Implementation Project',
    keyAchievements: [],
    businessImpact: [],
    technicalHighlights: [],
    nextSteps: [],
    complexity: complexity,
    documentationHealth: wordCount > 500 ? 'good' : 'needs attention'
  };
  
  // Extract key achievements from commits and milestones
  const commitPattern = /COMMIT:\s*[a-f0-9]{7,}\s*\|\s*(.+?)$/gm;
  let match;
  while ((match = commitPattern.exec(branchNotes)) !== null) {
    const achievement = match[1].trim();
    if (!summary.keyAchievements.includes(achievement) && achievement.length > 5) {
      summary.keyAchievements.push(achievement);
    }
  }
  
  return summary;
}

/**
 * Helper function to extract context around keywords
 */
function extractContextAroundKeyword(content, keyword, contextLength = 100) {
  const contexts = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      const start = Math.max(0, index - 1);
      const end = Math.min(lines.length, index + 2);
      const context = lines.slice(start, end).join(' ').trim();
      
      if (context.length > 10 && context.length <= contextLength * 2) {
        contexts.push(context);
      }
    }
  });
  
  return contexts;
}

/**
 * Formats narrative output into readable structure
 */
function formatNarrativeOutput(narrative) {
  let output = '# 📖 Project Narrative Construction\n\n';
  
  // Executive Summary
  output += '## 🎯 Executive Summary\n\n';
  output += `**Project**: ${narrative.executiveSummary.projectOverview}\n`;
  output += `**Complexity**: ${narrative.executiveSummary.complexity}\n`;
  output += `**Documentation Health**: ${narrative.executiveSummary.documentationHealth}\n\n`;
  
  if (narrative.executiveSummary.keyAchievements.length > 0) {
    output += '**Key Achievements**:\n';
    narrative.executiveSummary.keyAchievements.slice(0, 5).forEach(achievement => {
      output += `- ${achievement}\n`;
    });
    output += '\n';
  }
  
  // Timeline
  if (narrative.timeline.length > 0) {
    output += '## ⏱️ Project Timeline\n\n';
    narrative.timeline.forEach(event => {
      if (event.type === 'commit') {
        output += `- **${event.date}**: Commit ${event.hash}\n`;
      } else {
        output += `- **Milestone**: ${event.description}\n`;
      }
    });
    output += '\n';
  }
  
  // Technical Journey
  output += '## 🛠️ Technical Journey\n\n';
  if (narrative.technicalJourney.architecturalEvolution.length > 0) {
    output += '**Architecture & Technology**:\n';
    narrative.technicalJourney.architecturalEvolution.forEach(tech => {
      output += `- **${tech.technology}**: Used in project context\n`;
    });
    output += '\n';
  }
  
  if (narrative.technicalJourney.problemSolving.length > 0) {
    output += '**Problem Solving Highlights**:\n';
    narrative.technicalJourney.problemSolving.slice(0, 3).forEach(problem => {
      output += `- ${problem.context.substring(0, 150)}...\n`;
    });
    output += '\n';
  }
  
  // Business Value
  if (narrative.businessValue.impacts.length > 0) {
    output += '## 💼 Business Value\n\n';
    narrative.businessValue.impacts.slice(0, 5).forEach(impact => {
      output += `- **${impact.type}**: ${impact.description.substring(0, 100)}...\n`;
    });
    output += '\n';
  }
  
  // Production Story
  output += '## 🚀 Production Readiness\n\n';
  output += `**Status**: ${narrative.productionStory.readiness} readiness\n`;
  if (narrative.productionStory.deploymentPath.length > 0) {
    output += '**Deployment Context**:\n';
    narrative.productionStory.deploymentPath.slice(0, 3).forEach(step => {
      output += `- ${step.step.substring(0, 100)}...\n`;
    });
  }
  output += '\n';
  
  // Key Decisions
  if (narrative.keyDecisions.length > 0) {
    output += '## 🎯 Key Technical Decisions\n\n';
    narrative.keyDecisions.slice(0, 5).forEach(decision => {
      output += `- **Decision**: ${decision.decision}\n`;
      if (decision.reasoning !== 'Not explicitly stated') {
        output += `  - **Reasoning**: ${decision.reasoning}\n`;
      }
    });
    output += '\n';
  }
  
  output += '---\n\n';
  output += '💡 **Generated by Knowledge Archaeology & Reality Sync Engine v1.0**\n';
  
  return output;
}

/**
 * Helper functions for narrative construction data gathering
 */
async function getBranchNotesForProject(projectName) {
  try {
    const storageRoot = getStorageRoot();
    const branchNotesDir = path.join(storageRoot, 'branch_notes', projectName);
    
    let allBranchNotes = '';
    
    try {
      const branchFiles = await fs.readdir(branchNotesDir);
      
      for (const branchFile of branchFiles) {
        if (branchFile.endsWith('.md')) {
          const branchPath = path.join(branchNotesDir, branchFile);
          const content = await fs.readFile(branchPath, 'utf-8');
          allBranchNotes += `\n\n=== BRANCH: ${branchFile.replace('.md', '')} ===\n\n`;
          allBranchNotes += content;
        }
      }
    } catch (error) {
      console.error(`No branch notes found for project ${projectName}: ${error.message}`);
    }
    
    return allBranchNotes;
  } catch (error) {
    console.error(`Error getting branch notes for ${projectName}: ${error.message}`);
    return '';
  }
}

async function getKnowledgeDocumentsForProject(projectName) {
  try {
    const storageRoot = getStorageRoot();
    const knowledgeDir = path.join(storageRoot, 'knowledge', projectName);
    
    let allKnowledgeDocs = '';
    
    try {
      const knowledgeFiles = await fs.readdir(knowledgeDir);
      
      for (const knowledgeFile of knowledgeFiles) {
        if (knowledgeFile.endsWith('.md')) {
          const knowledgePath = path.join(knowledgeDir, knowledgeFile);
          const content = await fs.readFile(knowledgePath, 'utf-8');
          allKnowledgeDocs += `\n\n=== KNOWLEDGE: ${knowledgeFile.replace('.md', '')} ===\n\n`;
          allKnowledgeDocs += content;
        }
      }
    } catch (error) {
      console.error(`No knowledge documents found for project ${projectName}: ${error.message}`);
    }
    
    return allKnowledgeDocs;
  } catch (error) {
    console.error(`Error getting knowledge documents for ${projectName}: ${error.message}`);
    return '';
  }
}

async function getContextInfoForProject(projectName) {
  try {
    const storageRoot = getStorageRoot();
    const contextDir = path.join(storageRoot, 'context', projectName);
    
    try {
      const contextFiles = await fs.readdir(contextDir);
      
      // Look for main context file or use first available
      let contextFile = contextFiles.find(f => f.includes('main') || f.includes('master')) || contextFiles[0];
      
      if (contextFile && contextFile.endsWith('.md')) {
        const contextPath = path.join(contextDir, contextFile);
        const content = await fs.readFile(contextPath, 'utf-8');
        
        // Parse context file for structured info
        const titleMatch = content.match(/^# (.+)$/m);
        const descMatch = content.match(/## Description\s*\n\n(.+?)(?:\n##|$)/s);
        
        return {
          title: titleMatch ? titleMatch[1] : projectName,
          description: descMatch ? descMatch[1].trim() : 'No description available',
          rawContent: content
        };
      }
    } catch (error) {
      console.error(`No context files found for project ${projectName}: ${error.message}`);
    }
    
    return {
      title: projectName,
      description: 'No context information available',
      rawContent: ''
    };
  } catch (error) {
    console.error(`Error getting context info for ${projectName}: ${error.message}`);
    return null;
  }
}

// Start the server
async function main() {
  // Check if we're being called as a CLI tool with arguments
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // CLI mode - parse arguments and execute tool directly
    const toolName = args[0];
    const toolArgs = {};
    
    // Parse --param=value arguments
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--') && arg.includes('=')) {
        const [param, value] = arg.slice(2).split('=');
        // Remove quotes if present
        toolArgs[param] = value.replace(/^"(.*)"$/, '$1');
      }
    }
    
    console.error(`CLI mode: calling ${toolName} with args:`, toolArgs);
    
    try {
      // Create storage directories first
      const storageRoot = path.join(os.homedir(), '.cursor-cortex');
      await fs.mkdir(storageRoot, { recursive: true });
      await fs.mkdir(path.join(storageRoot, 'branch_notes'), { recursive: true });
      await fs.mkdir(path.join(storageRoot, 'context'), { recursive: true });
      await fs.mkdir(path.join(storageRoot, 'knowledge'), { recursive: true });
      await fs.mkdir(path.join(storageRoot, 'checklists'), { recursive: true });
      
      // Direct tool execution for CLI mode
      if (toolName === 'add_commit_separator') {
        const { branchName, projectName, commitHash, commitMessage } = toolArgs;
        
        // Get utility functions
        function getBranchNotePath(projectName, branchName) {
          const safeProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
          const safeBranchName = branchName.replace(/[^a-zA-Z0-9-_]/g, '_');
          return path.join(storageRoot, 'branch_notes', safeProjectName, `${safeBranchName}.md`);
        }
        
        function getFormattedDateTime() {
          return new Date().toISOString().replace('T', ' ').substring(0, 19);
        }
        
        const filePath = getBranchNotePath(projectName, branchName);
        
        // Check if file exists
        try {
          await fs.access(filePath);
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.error(`No branch note exists yet for branch "${branchName}" in project "${projectName}".`);
            process.exit(1);
          }
          throw error;
        }
        
        // Read the current content
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Format the commit separator
        const timestamp = getFormattedDateTime();
        const separator = `\n---\n\n## COMMIT: ${commitHash.substring(0, 8)} | ${timestamp}\n**Full Hash:** ${commitHash}\n**Message:** ${commitMessage}\n\n---\n\n`;
        
        // Add the separator to the branch note
        await fs.writeFile(filePath, content + separator);
        
        console.log(`Successfully added commit separator for commit ${commitHash.substring(0, 8)} to branch note.`);
        process.exit(0);
        
      } else {
        console.error(`CLI mode: Tool not supported: ${toolName}`);
        console.error('Supported tools: add_commit_separator');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Error executing tool:', error.message);
      process.exit(1);
    }
    return;
  }
  
  // MCP Server mode - start the server
  // Make sure the root storage directory exists
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
  try {
    await fs.mkdir(storageRoot, { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'branch_notes'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'context'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'knowledge'), { recursive: true });
    await fs.mkdir(path.join(storageRoot, 'checklists'), { recursive: true });
    console.error(`Storage directory created at ${storageRoot}`);
  } catch (error) {
    console.error(`Failed to create storage directory: ${error.message}`);
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Error starting the server:', error);
}); 