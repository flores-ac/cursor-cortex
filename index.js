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
      {
        name: 'timeline_reconstruction',
        description: 'Phase 2.2: Timeline Reconstruction Tool - Extracts chronological timeline data from branch notes and commit separators for reality sync analysis',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Name of the project to analyze (optional - if not provided, analyzes all projects)' },
            branchName: { type: 'string', description: 'Specific branch to analyze (optional - if not provided, analyzes all branches)' },
            dateRange: { type: 'string', description: 'Date range filter in format "YYYY-MM-DD,YYYY-MM-DD" (optional)' },
            includeCommits: { type: 'boolean', description: 'Include commit separators in timeline (default: true)' },
            includeEntries: { type: 'boolean', description: 'Include branch note entries in timeline (default: true)' },
          },
          required: [],
        },
      },
      {
        name: 'context_sync_guidance',
        description: 'Provides contextual guidance for syncing project contexts based on timeline data and sync type',
        inputSchema: {
          type: 'object',
          properties: {
            syncType: { type: 'string', description: 'Type of sync: "new-branch", "stage", "main", or "general"' },
            projectName: { type: 'string', description: 'Name of the project' },
            branchName: { type: 'string', description: 'Name of the branch (optional, used for branch-specific guidance)' },
            timelineData: { type: 'string', description: 'Timeline data from timeline_reconstruction tool (optional)' },
          },
          required: ['syncType', 'projectName'],
        },
      },
      {
        name: 'analyze_documentation_gaps',
        description: 'Analyzes folder structure to identify documentation needs and create knowledge capture checklists. Phase 2.3 of Knowledge Archaeology & Reality Sync Engine.',
        inputSchema: {
          type: 'object',
          properties: {
            folderPath: { type: 'string', description: 'Path to the folder to analyze for documentation gaps' },
            projectName: { type: 'string', description: 'Name of the project for context and checklist generation' },
            includeTests: { type: 'boolean', description: 'Whether to include test files in analysis (default: false)' },
            includeNodeModules: { type: 'boolean', description: 'Whether to include node_modules in analysis (default: false)' },
            maxDepth: { type: 'number', description: 'Maximum directory traversal depth (default: 5)' },
            fileExtensions: { type: 'string', description: 'Comma-separated list of file extensions to analyze (default: "js,ts,py,md,json,yml,yaml")' },
            createChecklist: { type: 'boolean', description: 'Whether to auto-generate a Cursor-Cortex completion checklist (default: true)' },
          },
          required: ['folderPath', 'projectName'],
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
        console.error(`DEBUG: Branch notes length: ${branchNotes.length} chars`);
        console.error(`DEBUG: Branch notes preview: ${branchNotes.substring(0, 200)}...`);
        
        // Get knowledge documents for the project
        const knowledgeDocs = includeKnowledge ? await getKnowledgeDocumentsForProject(projectName) : '';
        console.error(`DEBUG: Knowledge docs length: ${knowledgeDocs.length} chars`);
        console.error(`DEBUG: Knowledge docs preview: ${knowledgeDocs.substring(0, 200)}...`);
        
        // Get context information for the project
        const contextInfo = includeContext ? await getContextInfoForProject(projectName) : null;
        console.error(`DEBUG: Context info:`, contextInfo);
        
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
        console.error(`Error constructing project narrative: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
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
    } else if (name === 'timeline_reconstruction') {
      try {
        const { 
          projectName, 
          branchName, 
          dateRange, 
          includeCommits = true, 
          includeEntries = true 
        } = toolArgs;
        
        console.error(`Timeline reconstruction for project: ${projectName || 'ALL'}, branch: ${branchName || 'ALL'}`);
        
        const timeline = await reconstructTimeline(projectName, branchName, dateRange, includeCommits, includeEntries);
        
        return {
          content: [
            {
              type: 'text',
              text: timeline,
            },
          ],
        };
      } catch (error) {
        console.error(`Error reconstructing timeline: ${error.message}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error reconstructing timeline: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'context_sync_guidance') {
      try {
        const { syncType, projectName, branchName, timelineData } = toolArgs;
        
        console.error(`Context sync guidance for type: ${syncType}, project: ${projectName}`);
        
        const guidance = await generateContextSyncGuidance(syncType, projectName, branchName, timelineData);
        
        return {
          content: [
            {
              type: 'text',
              text: guidance,
            },
          ],
        };
      } catch (error) {
        console.error(`Error generating context sync guidance: ${error.message}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error generating context sync guidance: ${error.message}`,
            },
          ],
        };
      }
    } else if (name === 'analyze_documentation_gaps') {
      try {
        const { 
          folderPath, 
          projectName, 
          includeTests = false, 
          includeNodeModules = false, 
          maxDepth = 5, 
          fileExtensions = 'js,ts,py,md,json,yml,yaml',
          createChecklist = true
        } = toolArgs;
        
        console.error(`Analyzing documentation gaps for folder: ${folderPath}, project: ${projectName}`);
        
        const analysis = await analyzeDocumentationGaps(
          folderPath, 
          projectName, 
          includeTests, 
          includeNodeModules, 
          maxDepth, 
          fileExtensions.split(','),
          createChecklist
        );
        
        return {
          content: [
            {
              type: 'text',
              text: analysis,
            },
          ],
        };
      } catch (error) {
        console.error(`Error analyzing documentation gaps: ${error.message}`);
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error analyzing documentation gaps: ${error.message}`,
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
      projectSummary: generateProjectSummary(branchNotes, knowledgeDocs, contextInfo),
      timeline: constructTimeline(branchNotes),
      technicalJourney: constructTechnicalJourney(branchNotes, knowledgeDocs),
      keyDecisions: identifyKeyDecisions(branchNotes, knowledgeDocs)
    };
    
    return formatNarrativeOutput(narrative);
  } catch (error) {
    return `❌ Narrative Construction Error: ${error.message}`;
  }
}

/**
 * Generate factual project summary from actual content
 */
function generateProjectSummary(branchNotes, knowledgeDocs, contextInfo) {
  const branchNoteLines = branchNotes.split('\n').length;
  const branchNoteWords = branchNotes.split(/\s+/).length;
  const knowledgeDocLines = knowledgeDocs.split('\n').length;
  const knowledgeDocWords = knowledgeDocs.split(/\s+/).length;
  
  // Count actual entries and commits
  const entries = branchNotes.split('## ').filter(section => 
    !section.includes('COMMIT:') && section.trim().length > 10
  ).length;
  
  const commits = (branchNotes.match(/COMMIT:/g) || []).length;
  
  return {
    title: contextInfo?.title || 'Technical Project',
    description: contextInfo?.description || 'No description available',
    relatedProjects: contextInfo?.rawContent?.match(/## Related Projects\s*\n([\s\S]*?)(?:\n##|$)/)?.[1]
      ?.split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim()) || [],
    contentStats: {
      branchNoteLines,
      branchNoteWords,
      knowledgeDocLines, 
      knowledgeDocWords,
      totalEntries: entries,
      totalCommits: commits
    }
  };
}

/**
 * Constructs chronological timeline from branch notes and commits
 */
function constructTimeline(branchNotes) {
  const events = [];
  
  // ENHANCED: Extract commit separators with dates - more flexible pattern matching
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
  
  // ENHANCED: Extract timestamped entries (our format: ## 2025-06-15 20:48:18)
  const timestampPattern = /^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/gm;
  while ((match = timestampPattern.exec(branchNotes)) !== null) {
    const timestamp = match[1];
    events.push({
      type: 'entry',
      date: timestamp,
      significance: 'medium'
    });
  }
  
  // ENHANCED: Extract major milestones from headings (more inclusive)
  const milestonePattern = /^## (.+?)$/gm;
  while ((match = milestonePattern.exec(branchNotes)) !== null) {
    const milestone = match[1];
    if (!milestone.includes('COMMIT:') && !milestone.match(/\d{4}-\d{2}-\d{2}/) && milestone.length > 3) {
      events.push({
        type: 'milestone',
        description: milestone,
        significance: 'medium'
      });
    }
  }
  
  // ENHANCED: Extract phase indicators
  const phasePattern = /(?:^|\n)(Phase \d+\.?\d*[^:\n]*)/gm;
  while ((match = phasePattern.exec(branchNotes)) !== null) {
    const phase = match[1];
    events.push({
      type: 'phase',
      description: phase,
      significance: 'high'
    });
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
    technicalDebt: [],
    crossReferences: []
  };
  
  const content = branchNotes + '\n' + knowledgeDocs;
  const lowerContent = content.toLowerCase();
  
  // Enhanced architectural pattern analysis with web exploration
  const archPatterns = [
    'microservices', 'monolith', 'api', 'database', 'cache', 'queue',
    'docker', 'kubernetes', 'serverless', 'event-driven', 'mcp', 'node.js',
    'react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'java',
    'mongodb', 'postgres', 'mysql', 'redis', 'elasticsearch', 'kafka'
  ];
  
  archPatterns.forEach(pattern => {
    if (lowerContent.includes(pattern)) {
      const contexts = extractContextAroundKeyword(content, pattern, 150);
      if (contexts.length > 0) {
        // Determine impact based on context richness and connections
        const impact = contexts.length > 3 ? 'high' : contexts.length > 1 ? 'medium' : 'low';
        journey.architecturalEvolution.push({
          technology: pattern,
          contexts: contexts,
          impact: impact,
          references: contexts.length
        });
      }
    }
  });
  
  // Enhanced problem-solution web exploration
  const problemSolutionPairs = extractProblemSolutionPairs(content);
  journey.problemSolving = problemSolutionPairs;
  
  // Extract cross-references and relationships
  const crossRefs = extractCrossReferences(content);
  journey.crossReferences = crossRefs;
  
  // Extract technology evolution timeline
  const techEvolution = extractTechnologyEvolution(content);
  journey.technologyChoices = techEvolution;
  
  return journey;
}

/**
 * Extract problem-solution pairs with web-like relationship analysis
 */
function extractProblemSolutionPairs(content) {
  const pairs = [];
  const sections = content.split(/\n## /);
  
  sections.forEach(section => {
    const problemIndicators = ['issue', 'problem', 'bug', 'error', 'challenge', 'limitation', 'difficulty'];
    const solutionIndicators = ['solved', 'fixed', 'implemented', 'resolved', 'approach', 'solution', 'workaround'];
    
    const hasProblem = problemIndicators.some(indicator => 
      section.toLowerCase().includes(indicator)
    );
    const hasSolution = solutionIndicators.some(indicator => 
      section.toLowerCase().includes(indicator)
    );
    
    if (hasProblem && hasSolution) {
      pairs.push({
        context: section.substring(0, 300) + '...',
        type: 'resolved',
        significance: 'high',
        sectionTitle: section.split('\n')[0]
      });
    } else if (hasProblem) {
      pairs.push({
        context: section.substring(0, 200) + '...',
        type: 'identified',
        significance: 'medium',
        sectionTitle: section.split('\n')[0]
      });
    }
  });
  
  return pairs;
}

/**
 * Extract cross-references and relationship patterns
 */
function extractCrossReferences(content) {
  const refs = [];
  
  // Look for explicit cross-references
  const refPatterns = [
    /see also (.+?)(?:\.|$|,)/gi,
    /related to (.+?)(?:\.|$|,)/gi,
    /builds on (.+?)(?:\.|$|,)/gi,
    /extends (.+?)(?:\.|$|,)/gi,
    /depends on (.+?)(?:\.|$|,)/gi
  ];
  
  refPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      refs.push({
        type: 'explicit',
        reference: match[1].trim(),
        context: match[0]
      });
    }
  });
  
  // Look for implicit connections (shared keywords in different sections)
  const sections = content.split(/\n## /);
  const keywords = ['implementation', 'testing', 'deployment', 'architecture', 'design'];
  
  keywords.forEach(keyword => {
    const sectionsWithKeyword = sections.filter(section => 
      section.toLowerCase().includes(keyword)
    ).length;
    
    if (sectionsWithKeyword > 1) {
      refs.push({
        type: 'implicit',
        keyword: keyword,
        connections: sectionsWithKeyword
      });
    }
  });
  
  return refs;
}

/**
 * Extract technology evolution and choices timeline
 */
function extractTechnologyEvolution(content) {
  const evolution = [];
  const techKeywords = ['chose', 'selected', 'decided', 'switched', 'migrated', 'adopted'];
  
  techKeywords.forEach(keyword => {
    const contexts = extractContextAroundKeyword(content, keyword, 120);
    contexts.forEach(context => {
      evolution.push({
        decision: context,
        type: 'technology_choice',
        confidence: 'medium'
      });
    });
  });
  
  return evolution;
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
 * Extracts relevant context around keywords for analysis
 */
function extractContextAroundKeyword(content, keyword, contextLength = 100) {
  const contexts = [];
  const regex = new RegExp(`(.{0,${contextLength}}\\b${keyword}\\b.{0,${contextLength}})`, 'gi');
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const context = match[1].trim();
    if (context.length > keyword.length + 10) { // Ensure meaningful context
      contexts.push(context);
    }
  }
  
  return contexts.slice(0, 3); // Limit to most relevant matches
}

/**
 * Formats narrative components into readable output
 */
function formatNarrativeOutput(narrative) {
  let output = '# 📖 Project Narrative - Knowledge Archaeology Report\n\n';
  
  // Project Summary
  if (narrative.projectSummary) {
    output += '## 📊 Project Summary\n\n';
    output += `**Title:** ${narrative.projectSummary.title}\n`;
    output += `**Description:** ${narrative.projectSummary.description}\n\n`;
    
    if (narrative.projectSummary.relatedProjects.length > 0) {
      output += '**Related Projects:**\n';
      narrative.projectSummary.relatedProjects.forEach(project => {
        output += `- ${project}\n`;
      });
      output += '\n';
    }
    
    output += '**Content Statistics:**\n';
    const stats = narrative.projectSummary.contentStats;
    output += `- Branch Notes: ${stats.totalEntries} entries, ${stats.branchNoteLines} lines, ${stats.branchNoteWords} words\n`;
    output += `- Knowledge Docs: ${stats.knowledgeDocLines} lines, ${stats.knowledgeDocWords} words\n`;
    output += `- Commits Tracked: ${stats.totalCommits}\n\n`;
  }
  
  // Timeline
  if (narrative.timeline && narrative.timeline.length > 0) {
    output += '## ⏰ Project Timeline\n\n';
    narrative.timeline.forEach(event => {
      if (event.type === 'commit') {
        output += `- **${event.date}** - Commit ${event.hash}\n`;
      } else if (event.type === 'milestone') {
        output += `- **Milestone:** ${event.description}\n`;
      } else if (event.type === 'phase') {
        output += `- **${event.description}**\n`;
      }
    });
    output += '\n';
  }
  
  // Technical Journey
  if (narrative.technicalJourney) {
    output += '## 🛠️ Technical Stack & Evolution\n\n';
    
    if (narrative.technicalJourney.architecturalEvolution.length > 0) {
      output += '### Technologies Used\n';
      narrative.technicalJourney.architecturalEvolution
        .sort((a, b) => b.references - a.references)
        .slice(0, 10)
        .forEach(tech => {
          output += `- **${tech.technology}**: ${tech.references} references\n`;
        });
      output += '\n';
    }
    
    if (narrative.technicalJourney.problemSolving.length > 0) {
      output += '### Problem-Solution Patterns\n';
      narrative.technicalJourney.problemSolving.slice(0, 3).forEach(problem => {
        output += `- ${problem.context.substring(0, 150)}...\n`;
      });
      output += '\n';
    }
  }
  
  // Key Decisions
  if (narrative.keyDecisions && narrative.keyDecisions.length > 0) {
    output += '## 🔑 Key Technical Decisions\n\n';
    narrative.keyDecisions.slice(0, 5).forEach(decision => {
      output += `- **Decision:** ${decision.decision}\n`;
      if (decision.reasoning && decision.reasoning !== 'Not explicitly stated') {
        output += `  - **Reasoning:** ${decision.reasoning}\n`;
      }
    });
    output += '\n';
  }
  
  output += '---\n\n';
  output += '💡 **Generated by Cursor-Cortex Knowledge Archaeology Engine**\n';
  output += '*This narrative organizes scattered documentation into a coherent overview.*\n';
  
  return output;
}

async function getBranchNotesForProject(projectName) {
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
  const branchNotesDir = path.join(storageRoot, 'branch_notes', projectName);
  
  let allBranchNotes = '';
  
  const branchFiles = await fs.readdir(branchNotesDir);
  
  for (const branchFile of branchFiles) {
    if (branchFile.endsWith('.md')) {
      const branchPath = path.join(branchNotesDir, branchFile);
      const content = await fs.readFile(branchPath, 'utf-8');
      allBranchNotes += `\n\n=== BRANCH: ${branchFile.replace('.md', '')} ===\n\n`;
      allBranchNotes += content;
    }
  }
  
  return allBranchNotes;
}

async function getKnowledgeDocumentsForProject(projectName) {
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
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
    // Return empty string instead of throwing for knowledge docs (they're optional)
  }
  
  return allKnowledgeDocs;
}

async function getContextInfoForProject(projectName) {
  try {
    const storageRoot = path.join(os.homedir(), '.cursor-cortex');
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

// =============================================================================
// TIMELINE RECONSTRUCTION TOOL (Phase 2.2)
// Knowledge Archaeology & Reality Sync Engine
// =============================================================================

/**
 * Reconstructs chronological timeline from branch notes and commit separators
 * Pure data extraction - no interpretation, just facts
 */
async function reconstructTimeline(projectName, branchName, dateRange, includeCommits, includeEntries) {
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
  const timelineEvents = [];
  
  // Parse date range if provided (format: "YYYY-MM-DD,YYYY-MM-DD")
  let startDate = null;
  let endDate = null;
  if (dateRange) {
    const [start, end] = dateRange.split(',');
    startDate = start ? new Date(start) : null;
    endDate = end ? new Date(end) : null;
  }
  
  // Helper function to check if date is in range
  const isInDateRange = (dateStr) => {
    if (!startDate && !endDate) return true; // No range = all time
    const eventDate = new Date(dateStr);
    if (isNaN(eventDate)) return true; // Invalid date = include it
    
    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;
    return true;
  };
  
  // Get projects to analyze
  const projectsToAnalyze = projectName ? [projectName] : await getAllProjectsFromBranchNotes();
  
  for (const proj of projectsToAnalyze) {
    const branchNotesDir = path.join(storageRoot, 'branch_notes', proj);
    
    try {
      const branchFiles = await fs.readdir(branchNotesDir);
      
      for (const branchFile of branchFiles) {
        if (!branchFile.endsWith('.md')) continue;
        
        const currentBranch = branchFile.replace('.md', '');
        
        // Skip if specific branch requested and this isn't it
        // Convert branchName to safe filename format for comparison
        const safeBranchName = branchName ? branchName.replace(/[^a-zA-Z0-9-_]/g, '_') : null;
        if (safeBranchName && currentBranch !== safeBranchName) continue;
        
        const branchPath = path.join(branchNotesDir, branchFile);
        const content = await fs.readFile(branchPath, 'utf-8');
        
        // Extract commit separators
        if (includeCommits) {
          const commitPattern = /---\s*\n\s*## COMMIT:\s*([a-f0-9]{7,})\s*\|\s*(.+?)\s*\n\*\*Full Hash:\*\*\s*([a-f0-9]+)\s*\n\*\*Message:\*\*\s*(.+?)\s*\n/g;
          let match;
          
          while ((match = commitPattern.exec(content)) !== null) {
            const [, shortHash, timestamp, fullHash, message] = match;
            
            if (isInDateRange(timestamp)) {
              timelineEvents.push({
                type: 'commit',
                project: proj,
                branch: currentBranch,
                timestamp: timestamp.trim(),
                shortHash: shortHash.trim(),
                fullHash: fullHash.trim(),
                message: message.trim(),
                significance: 'high'
              });
            }
          }
        }
        
        // Extract timestamped entries
        if (includeEntries) {
          const lines = content.split('\n');
          let currentTimestamp = null;
          let currentEntry = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for timestamp headers (## YYYY-MM-DD HH:MM:SS)
            const timestampMatch = line.match(/^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
            if (timestampMatch) {
              // Save previous entry if exists
              if (currentTimestamp && currentEntry.trim() && isInDateRange(currentTimestamp)) {
                timelineEvents.push({
                  type: 'entry',
                  project: proj,
                  branch: currentBranch,
                  timestamp: currentTimestamp,
                  content: currentEntry.trim(),
                  significance: 'medium'
                });
              }
              
              currentTimestamp = timestampMatch[1];
              currentEntry = '';
              continue;
            }
            
            // Check for other section headers (reset entry) - but not commit separators
            if (line.startsWith('## ') && !timestampMatch && !line.includes('COMMIT:')) {
              // Save previous entry if exists
              if (currentTimestamp && currentEntry.trim() && isInDateRange(currentTimestamp)) {
                timelineEvents.push({
                  type: 'entry',
                  project: proj,
                  branch: currentBranch,
                  timestamp: currentTimestamp,
                  content: currentEntry.trim(),
                  significance: 'medium'
                });
              }
              currentTimestamp = null;
              currentEntry = '';
              continue;
            }
            
            // Accumulate content for current entry
            if (currentTimestamp) {
              currentEntry += line + '\n';
            }
          }
          
          // Don't forget the last entry
          if (currentTimestamp && currentEntry.trim() && isInDateRange(currentTimestamp)) {
            timelineEvents.push({
              type: 'entry',
              project: proj,
              branch: currentBranch,
              timestamp: currentTimestamp,
              content: currentEntry.trim(),
              significance: 'medium'
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error reading branch notes for project ${proj}: ${error.message}`);
    }
  }
  
  // Sort chronologically
  timelineEvents.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    if (isNaN(dateA) && isNaN(dateB)) return 0;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    return dateA - dateB;
  });
  
  return formatTimelineOutput(timelineEvents, projectsToAnalyze, dateRange);
}

/**
 * Get all projects that have branch notes
 */
async function getAllProjectsFromBranchNotes() {
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
  const branchNotesRoot = path.join(storageRoot, 'branch_notes');
  
  try {
    const projects = await fs.readdir(branchNotesRoot);
    return projects.filter(async (proj) => {
      const projPath = path.join(branchNotesRoot, proj);
      const stat = await fs.stat(projPath);
      return stat.isDirectory();
    });
  } catch (error) {
    console.error(`Error reading branch notes directory: ${error.message}`);
    return [];
  }
}

/**
 * Format timeline output for display
 */
function formatTimelineOutput(events, projects, dateRange) {
  let output = '# 📅 Timeline Reconstruction Report\n\n';
  
  // Summary
  output += '## Summary\n\n';
  output += `**Projects Analyzed:** ${projects.join(', ')}\n`;
  output += `**Date Range:** ${dateRange || 'All time'}\n`;
  output += `**Total Events:** ${events.length}\n`;
  output += `**Commits:** ${events.filter(e => e.type === 'commit').length}\n`;
  output += `**Entries:** ${events.filter(e => e.type === 'entry').length}\n\n`;
  
  if (events.length === 0) {
    output += '⚠️ No timeline events found matching the criteria.\n\n';
    return output;
  }
  
  // Group by date
  const eventsByDate = {};
  events.forEach(event => {
    const date = event.timestamp.split(' ')[0]; // Get just the date part
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });
  
  output += '## Chronological Timeline\n\n';
  
  Object.keys(eventsByDate).sort().forEach(date => {
    output += `### ${date}\n\n`;
    
    eventsByDate[date].forEach(event => {
      const time = event.timestamp.split(' ')[1] || '';
      const projectBranch = `${event.project}/${event.branch}`;
      
      if (event.type === 'commit') {
        output += `**${time}** 🔄 **COMMIT** [${projectBranch}]\n`;
        output += `- Hash: \`${event.shortHash}\`\n`;
        output += `- Message: ${event.message}\n\n`;
      } else if (event.type === 'entry') {
        output += `**${time}** 📝 **ENTRY** [${projectBranch}]\n`;
        const preview = event.content.substring(0, 200).replace(/\n/g, ' ');
        output += `- ${preview}${event.content.length > 200 ? '...' : ''}\n\n`;
      }
    });
  });
  
  output += '---\n\n';
  output += '💡 **Generated by Cursor-Cortex Timeline Reconstruction Tool**\n';
  output += '*Pure chronological data extraction from branch notes and commit separators.*\n';
  
  return output;
}

// =============================================================================
// DOCUMENTATION GAP ANALYSIS ENGINE (Phase 2.3)
// Knowledge Archaeology & Reality Sync Engine
// =============================================================================

/**
 * Analyzes folder structure to identify documentation needs and create knowledge capture checklists
 * Phase 2.3 of Knowledge Archaeology & Reality Sync Engine
 */
async function analyzeDocumentationGaps(folderPath, projectName, includeTests, includeNodeModules, maxDepth, fileExtensions, createChecklist) {
  try {
    console.error(`Starting documentation gap analysis for: ${folderPath}`);
    
    // Step 1: Scan folder structure
    const fileStructure = await scanFolderStructure(folderPath, maxDepth, includeTests, includeNodeModules, fileExtensions);
    
    // Step 2: Analyze dependencies and relationships
    const dependencyMap = await analyzeDependencies(fileStructure);
    
    // Step 3: Identify entry points and complexity
    const complexityAnalysis = await assessComplexity(fileStructure);
    
    // Step 4: Detect documentation gaps
    const documentationGaps = await detectDocumentationGaps(fileStructure, dependencyMap);
    
    // Step 5: Generate prioritized recommendations
    const recommendations = generateDocumentationRecommendations(fileStructure, dependencyMap, complexityAnalysis, documentationGaps);
    
    // Step 6: Create checklist if requested
    let checklist = '';
    if (createChecklist) {
      checklist = await createDocumentationChecklist(projectName, recommendations, fileStructure);
    }
    
    // Step 7: Format comprehensive output
    return formatDocumentationAnalysis(folderPath, fileStructure, dependencyMap, complexityAnalysis, recommendations, checklist);
    
  } catch (error) {
    console.error(`Documentation gap analysis failed: ${error.message}`);
    console.error(`Stack trace:`, error.stack);
    throw error;
  }
}

/**
 * Recursively scan folder structure and collect file information
 */
async function scanFolderStructure(folderPath, maxDepth, includeTests, includeNodeModules, fileExtensions) {
  const files = [];
  
  async function scanDirectory(dirPath, currentDepth) {
    if (currentDepth > maxDepth) return;
    
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const relativePath = path.relative(folderPath, fullPath);
        
        // Skip hidden files and unwanted directories
        if (entry.startsWith('.')) continue;
        if (!includeNodeModules && entry === 'node_modules') continue;
        if (!includeTests && (entry.includes('test') || entry.includes('spec'))) continue;
        
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await scanDirectory(fullPath, currentDepth + 1);
        } else if (stat.isFile()) {
          const ext = path.extname(entry).slice(1);
          if (fileExtensions.includes(ext)) {
            files.push({
              path: fullPath,
              relativePath,
              name: entry,
              extension: ext,
              size: stat.size,
              isEntryPoint: entry === 'index.js' || entry === 'main.js' || entry === 'app.js' || entry === 'server.js'
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}: ${error.message}`);
    }
  }
  
  await scanDirectory(folderPath, 0);
  return files;
}

/**
 * Analyze import/require dependencies between files
 */
async function analyzeDependencies(fileStructure) {
  const dependencyMap = new Map();
  
  for (const file of fileStructure) {
    if (!['js', 'ts', 'py'].includes(file.extension)) continue;
    
    try {
      const content = await fs.readFile(file.path, 'utf-8');
      const dependencies = extractDependencies(content, file.extension);
      
      dependencyMap.set(file.relativePath, {
        imports: dependencies.imports,
        exports: dependencies.exports,
        internalDeps: dependencies.internal,
        externalDeps: dependencies.external,
        complexity: calculateFileComplexity(content)
      });
    } catch (error) {
      console.error(`Error analyzing dependencies for ${file.path}: ${error.message}`);
    }
  }
  
  return dependencyMap;
}

/**
 * Extract import/export statements from file content
 */
function extractDependencies(content, extension) {
  const imports = [];
  const exports = [];
  const internal = [];
  const external = [];
  
  // JavaScript/TypeScript patterns
  if (['js', 'ts'].includes(extension)) {
    // ES6 imports
    const es6ImportPattern = /import\s+(?:(?:(?:\w+|\{[^}]+\})\s+from\s+)?['"`]([^'"`]+)['"`])/gm;
    // CommonJS requires
    const cjsRequirePattern = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gm;
    // ES6 exports
    const es6ExportPattern = /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/gm;
    // CommonJS exports
    const cjsExportPattern = /(?:module\.exports|exports\.\w+)\s*=/gm;
    
    let match;
    
    // Extract imports
    while ((match = es6ImportPattern.exec(content)) !== null) {
      const dep = match[1];
      imports.push(dep);
      if (dep.startsWith('.')) internal.push(dep);
      else external.push(dep);
    }
    
    while ((match = cjsRequirePattern.exec(content)) !== null) {
      const dep = match[1];
      imports.push(dep);
      if (dep.startsWith('.')) internal.push(dep);
      else external.push(dep);
    }
    
    // Extract exports
    while ((match = es6ExportPattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    if (cjsExportPattern.test(content)) {
      exports.push('(CommonJS exports)');
    }
  }
  
  // Python patterns
  if (extension === 'py') {
    const pythonImportPattern = /(?:from\s+(\S+)\s+import|import\s+(\S+))/gm;
    let match;
    
    while ((match = pythonImportPattern.exec(content)) !== null) {
      const dep = match[1] || match[2];
      imports.push(dep);
      if (dep.startsWith('.')) internal.push(dep);
      else external.push(dep);
    }
  }
  
  return { imports, exports, internal, external };
}

/**
 * Calculate complexity score for a file
 */
function calculateFileComplexity(content) {
  const lines = content.split('\n').length;
  const functions = (content.match(/function\s+\w+|=>\s*{|def\s+\w+/g) || []).length;
  const classes = (content.match(/class\s+\w+/g) || []).length;
  const conditionals = (content.match(/if\s*\(|switch\s*\(|try\s*{|catch\s*\(/g) || []).length;
  const loops = (content.match(/for\s*\(|while\s*\(|forEach\s*\(/g) || []).length;
  
  // Simple complexity score
  const complexity = Math.min(100, (lines / 10) + (functions * 2) + (classes * 3) + (conditionals * 1.5) + (loops * 1.5));
  
  return {
    score: Math.round(complexity),
    metrics: { lines, functions, classes, conditionals, loops },
    category: complexity < 20 ? 'simple' : complexity < 50 ? 'moderate' : complexity < 80 ? 'complex' : 'very complex'
  };
}

/**
 * Assess overall complexity and identify key areas
 */
async function assessComplexity(fileStructure) {
  const analysis = {
    entryPoints: [],
    complexFiles: [],
    coreModules: [],
    utilityFiles: [],
    configFiles: []
  };
  
  for (const file of fileStructure) {
    if (file.isEntryPoint) {
      analysis.entryPoints.push(file);
    }
    
    // Categorize by path patterns
    if (file.relativePath.includes('config') || file.name.includes('config')) {
      analysis.configFiles.push(file);
    } else if (file.relativePath.includes('util') || file.relativePath.includes('helper')) {
      analysis.utilityFiles.push(file);
    } else if (['js', 'ts', 'py'].includes(file.extension)) {
      analysis.coreModules.push(file);
    }
  }
  
  return analysis;
}

/**
 * Detect documentation gaps by analyzing existing docs vs code
 */
async function detectDocumentationGaps(fileStructure, dependencyMap) {
  const gaps = {
    undocumentedFiles: [],
    missingReadme: true,
    missingApiDocs: [],
    complexWithoutDocs: [],
    entryPointsWithoutDocs: []
  };
  
  // Check for README
  const hasReadme = fileStructure.some(f => f.name.toLowerCase().startsWith('readme'));
  gaps.missingReadme = !hasReadme;
  
  // Find undocumented files
  for (const file of fileStructure) {
    if (['js', 'ts', 'py'].includes(file.extension)) {
      const deps = dependencyMap.get(file.relativePath);
      
      if (deps && deps.complexity.score > 50) {
        gaps.complexWithoutDocs.push({
          file: file.relativePath,
          complexity: deps.complexity.score,
          reason: `High complexity (${deps.complexity.score}) with ${deps.complexity.metrics.functions} functions`
        });
      }
      
      if (file.isEntryPoint) {
        gaps.entryPointsWithoutDocs.push({
          file: file.relativePath,
          reason: 'Entry point file needs documentation'
        });
      }
      
      if (deps && (deps.exports.length > 3 || deps.imports.length > 5)) {
        gaps.missingApiDocs.push({
          file: file.relativePath,
          exports: deps.exports.length,
          imports: deps.imports.length,
          reason: 'Multiple exports/imports suggest API documentation needed'
        });
      }
    }
  }
  
  return gaps;
}

/**
 * Generate prioritized documentation recommendations
 */
function generateDocumentationRecommendations(fileStructure, dependencyMap, complexityAnalysis, gaps) {
  const recommendations = [];
  
  // Priority 1: Entry points and README
  if (gaps.missingReadme) {
    recommendations.push({
      priority: 'HIGH',
      type: 'README',
      action: 'Create project README.md',
      rationale: 'Essential for project onboarding and overview',
      template: 'README template'
    });
  }
  
  // Ensure arrays exist before iterating
  if (complexityAnalysis.entryPoints && complexityAnalysis.entryPoints.length > 0) {
    complexityAnalysis.entryPoints.forEach(file => {
      recommendations.push({
        priority: 'HIGH',
        type: 'ENTRY_POINT',
        file: file.relativePath,
        action: 'Document main entry point',
        rationale: 'Critical for understanding application flow',
        template: 'Entry point documentation template'
      });
    });
  }
  
  // Priority 2: Complex files
  if (gaps.complexWithoutDocs && gaps.complexWithoutDocs.length > 0) {
    gaps.complexWithoutDocs.forEach(gap => {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'COMPLEXITY',
        file: gap.file,
        action: 'Document complex logic',
        rationale: gap.reason,
        template: 'Technical documentation template'
      });
    });
  }
  
  // Priority 3: API documentation
  if (gaps.missingApiDocs && gaps.missingApiDocs.length > 0) {
    gaps.missingApiDocs.forEach(gap => {
      recommendations.push({
        priority: 'MEDIUM',
        type: 'API',
        file: gap.file,
        action: 'Document API interfaces',
        rationale: gap.reason,
        template: 'API documentation template'
      });
    });
  }
  
  // Priority 4: Configuration files
  if (complexityAnalysis.configFiles && complexityAnalysis.configFiles.length > 0) {
    complexityAnalysis.configFiles.forEach(file => {
      recommendations.push({
        priority: 'LOW',
        type: 'CONFIG',
        file: file.relativePath,
        action: 'Document configuration options',
        rationale: 'Helps with setup and customization',
        template: 'Configuration documentation template'
      });
    });
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Create a Cursor-Cortex checklist for documentation tasks
 */
async function createDocumentationChecklist(projectName, recommendations, fileStructure) {
  const timestamp = new Date().toISOString().split('T')[0];
  const checklistName = `${timestamp}-Documentation_Gap_Analysis_Checklist`;
  
  let requirements = recommendations.slice(0, 10).map((rec, i) => 
    `${i + 1}. ${rec.action} (${rec.file || 'Project level'}) - ${rec.priority} priority`
  ).join('\n');
  
  let objectives = [
    'Close identified documentation gaps systematically',
    'Improve project onboarding and knowledge transfer',
    'Create sustainable documentation practices',
    'Establish clear architectural understanding'
  ].join('\n- ');
  
  let testCriteria = [
    'README.md provides clear project overview',
    'Entry points are well documented',
    'Complex files have explanatory comments',
    'API interfaces are clearly described',
    'Configuration options are documented'
  ].map((item, i) => `${i + 1}. ${item}`).join('\n');
  
  let knowledgeItems = [
    'Project architecture and design decisions',
    'Key algorithms and business logic',
    'Configuration and deployment procedures',
    'API usage examples and patterns',
    'Troubleshooting and debugging guides'
  ].join('\n- ');
  
  try {
    // Use existing create_completion_checklist functionality
    const checklistDir = path.join(os.homedir(), '.cursor-cortex', 'checklists', projectName.replace(/[^a-zA-Z0-9-_]/g, '_'));
    await fs.mkdir(checklistDir, { recursive: true });
    
    const checklistPath = path.join(checklistDir, `${checklistName}.md`);
    
    const checklistContent = `# Completion Checklist: Documentation Gap Analysis

## Project Information
- **Project:** ${projectName}
- **Feature/Module:** Documentation Gap Analysis Results
- **Owner:** Development Team
- **Creation Date:** ${timestamp}
- **Generated by:** Cursor-Cortex Documentation Gap Analysis Tool

## Objectives and Requirements

### Objectives
- [ ] ${objectives}

### Requirements
- [ ] ${requirements}

## Testing Criteria
- [ ] ${testCriteria}

## Knowledge Capture Requirements

### Knowledge Items to Document
- [ ] ${knowledgeItems}

## Analysis Results

### Files Analyzed: ${fileStructure.length}
### Recommendations Generated: ${recommendations.length}

## Sign-off

**Implementation Complete:** _____________ Date: _______

**Testing Complete:** _____________ Date: _______

**Knowledge Documented:** _____________ Date: _______

**Project Owner Approval:** _____________ Date: _______

---

*This checklist was generated by Cursor-Cortex Documentation Gap Analysis Tool.*
`;

    await fs.writeFile(checklistPath, checklistContent);
    return `✅ Created documentation checklist: ${checklistName}.md`;
    
  } catch (error) {
    console.error(`Error creating checklist: ${error.message}`);
    return `❌ Failed to create checklist: ${error.message}`;
  }
}

/**
 * Format the comprehensive analysis output
 */
function formatDocumentationAnalysis(folderPath, fileStructure, dependencyMap, complexityAnalysis, recommendations, checklist) {
  let output = `# 📋 Documentation Gap Analysis Report\n\n`;
  
  output += `**Folder Analyzed:** ${folderPath}\n`;
  output += `**Analysis Date:** ${new Date().toISOString().split('T')[0]}\n`;
  output += `**Files Analyzed:** ${fileStructure.length}\n\n`;
  
  // Executive Summary
  output += `## 📊 Executive Summary\n\n`;
  output += `- **Total Files**: ${fileStructure.length}\n`;
  output += `- **Code Files**: ${fileStructure.filter(f => ['js', 'ts', 'py'].includes(f.extension)).length}\n`;
  output += `- **Entry Points**: ${complexityAnalysis.entryPoints.length}\n`;
  output += `- **Documentation Gaps**: ${recommendations.length}\n`;
  output += `- **Priority Actions**: ${recommendations.filter(r => r.priority === 'HIGH').length}\n\n`;
  
  // File Structure Overview
  output += `## 🗂️ File Structure Overview\n\n`;
  const filesByType = fileStructure.reduce((acc, file) => {
    const type = file.extension || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(filesByType).forEach(([type, count]) => {
    output += `- **${type.toUpperCase()}**: ${count} files\n`;
  });
  output += `\n`;
  
  // Entry Points
  if (complexityAnalysis.entryPoints.length > 0) {
    output += `## 🚪 Entry Points Detected\n\n`;
    complexityAnalysis.entryPoints.forEach(file => {
      output += `- **${file.name}** (${file.relativePath})\n`;
    });
    output += `\n`;
  }
  
  // Dependency Analysis
  output += `## 🔗 Dependency Analysis\n\n`;
  let totalImports = 0;
  let totalExports = 0;
  let externalDeps = new Set();
  
  if (dependencyMap && dependencyMap.size > 0) {
    dependencyMap.forEach(deps => {
      if (deps) {
        totalImports += (deps.imports || []).length;
        totalExports += (deps.exports || []).length;
        if (deps.external) {
          deps.external.forEach(dep => externalDeps.add(dep));
        }
      }
    });
  }
  
  output += `- **Total Imports**: ${totalImports}\n`;
  output += `- **Total Exports**: ${totalExports}\n`;
  output += `- **External Dependencies**: ${externalDeps.size}\n\n`;
  
  if (externalDeps.size > 0) {
    output += `### Key External Dependencies:\n`;
    Array.from(externalDeps).slice(0, 10).forEach(dep => {
      output += `- ${dep}\n`;
    });
    if (externalDeps.size > 10) output += `- ... and ${externalDeps.size - 10} more\n`;
    output += `\n`;
  }
  
  // Documentation Recommendations
  output += `## 📝 Documentation Recommendations\n\n`;
  output += `### Priority Breakdown:\n`;
  output += `- **HIGH**: ${recommendations.filter(r => r.priority === 'HIGH').length} items\n`;
  output += `- **MEDIUM**: ${recommendations.filter(r => r.priority === 'MEDIUM').length} items\n`;
  output += `- **LOW**: ${recommendations.filter(r => r.priority === 'LOW').length} items\n\n`;
  
  output += `### Detailed Recommendations:\n\n`;
  recommendations.slice(0, 15).forEach((rec, i) => {
    output += `${i + 1}. **${rec.priority}** - ${rec.action}\n`;
    output += `   - File: ${rec.file || 'Project level'}\n`;
    output += `   - Rationale: ${rec.rationale}\n`;
    output += `   - Type: ${rec.type}\n\n`;
  });
  
  if (recommendations.length > 15) {
    output += `*... and ${recommendations.length - 15} more recommendations in the generated checklist.*\n\n`;
  }
  
  // Checklist Information
  if (checklist) {
    output += `## ✅ Generated Checklist\n\n${checklist}\n\n`;
  }
  
  // Next Steps
  output += `## 🚀 Recommended Next Steps\n\n`;
  output += `1. **Review High Priority Items**: Focus on entry points and README first\n`;
  output += `2. **Use Generated Checklist**: Track progress systematically\n`;
  output += `3. **Document Complex Logic**: Prioritize files with high complexity scores\n`;
  output += `4. **Create API Documentation**: Focus on files with multiple exports\n`;
  output += `5. **Establish Documentation Standards**: Create templates for consistent docs\n\n`;
  
  output += `---\n\n`;
  output += `💡 **Generated by Cursor-Cortex Documentation Gap Analysis Tool (Phase 2.3)**\n`;
  output += `*Automated analysis for strategic knowledge capture and documentation planning.*\n`;
  
  return output;
}

/**
 * Generate contextual guidance for syncing project contexts
 */
async function generateContextSyncGuidance(syncType, projectName, branchName, timelineData) {
  let output = `# 🔄 Context Sync Guidance\n\n`;
  output += `**Sync Type:** ${syncType}\n`;
  output += `**Project:** ${projectName}\n`;
  output += `**Branch:** ${branchName || 'Not specified'}\n\n`;
  
  // Get current context and branch note status
  const storageRoot = path.join(os.homedir(), '.cursor-cortex');
  
  switch (syncType) {
    case 'new-branch':
      output += await generateNewBranchGuidance(projectName, branchName, storageRoot);
      break;
    case 'stage':
      output += await generateStageGuidance(projectName, storageRoot);
      break;
    case 'main':
      output += await generateMainGuidance(projectName, storageRoot);
      break;
    case 'general':
      output += await generateGeneralGuidance(projectName, storageRoot);
      break;
    default:
      output += `❌ Unknown sync type: ${syncType}\n`;
      output += `Valid types: new-branch, stage, main, general\n`;
  }
  
  output += '\n---\n\n';
  output += '💡 **Generated by Cursor-Cortex Context Sync Guidance**\n';
  output += '*Intelligent guidance based on actual project state and timeline analysis.*\n';
  
  return output;
}

async function generateNewBranchGuidance(projectName, branchName, storageRoot) {
  let guidance = '## 🌱 New Branch Context Sync\n\n';
  
  // Check if main context exists
  const mainContextPath = path.join(storageRoot, 'context', projectName, 'main.md');
  let hasMainContext = false;
  
  try {
    await fs.access(mainContextPath);
    hasMainContext = true;
  } catch (error) {
    // Main context doesn't exist
  }
  
  if (hasMainContext) {
    guidance += '✅ **Main context found** - Can use as template\n\n';
    guidance += '### Recommended Actions:\n';
    guidance += `1. Copy main context as starting point for ${branchName}\n`;
    guidance += `2. Update title and description for new feature/branch\n`;
    guidance += `3. Clear or update objectives for this branch\n`;
    guidance += `4. Add any branch-specific requirements\n\n`;
  } else {
    guidance += '⚠️ **No main context found** - Creating from scratch\n\n';
    guidance += '### Recommended Actions:\n';
    guidance += `1. Create new context file for ${branchName}\n`;
    guidance += `2. Define project title and description\n`;
    guidance += `3. Set objectives for this branch\n`;
    guidance += `4. Document any known requirements\n\n`;
  }
  
  guidance += '### Context Template:\n';
  guidance += '```markdown\n';
  guidance += `# ${projectName} - ${branchName}\n\n`;
  guidance += '## Description\n\n';
  guidance += '[Describe what this branch/feature accomplishes]\n\n';
  guidance += '## Objectives\n\n';
  guidance += '- [Primary objective]\n';
  guidance += '- [Secondary objective]\n\n';
  guidance += '## Requirements\n\n';
  guidance += '- [Key requirement]\n';
  guidance += '- [Another requirement]\n\n';
  guidance += '## Related Projects\n\n';
  guidance += '- [Related project if any]\n';
  guidance += '```\n\n';
  
  return guidance;
}

async function generateStageGuidance(projectName, storageRoot) {
  let guidance = '## 🚀 Stage Context Sync\n\n';
  
  // Check for completed work in main branch
  const mainBranchPath = path.join(storageRoot, 'branch_notes', projectName, 'main.md');
  
  try {
    const mainContent = await fs.readFile(mainBranchPath, 'utf-8');
    const commits = (mainContent.match(/COMMIT:/g) || []).length;
    const entries = mainContent.split('## ').filter(section => 
      !section.includes('COMMIT:') && section.trim().length > 10
    ).length;
    
    guidance += `📊 **Main branch status:** ${entries} entries, ${commits} commits\n\n`;
    
    if (commits > 0) {
      guidance += '### Recommended Actions:\n';
      guidance += '1. Review completed work in main branch\n';
      guidance += '2. Update stage context with production-ready features\n';
      guidance += '3. Document any deployment considerations\n';
      guidance += '4. Update version/release notes if applicable\n\n';
    } else {
      guidance += '⚠️ **No commits found** - May be too early for stage sync\n\n';
    }
  } catch (error) {
    guidance += '❌ **No main branch notes found**\n\n';
  }
  
  return guidance;
}

async function generateMainGuidance(projectName, storageRoot) {
  let guidance = '## 🎯 Main Context Sync\n\n';
  
  // Check for work across all branches
  const branchNotesDir = path.join(storageRoot, 'branch_notes', projectName);
  
  try {
    const branchFiles = await fs.readdir(branchNotesDir);
    const branches = branchFiles.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
    
    guidance += `📊 **Active branches:** ${branches.join(', ')}\n\n`;
    
    guidance += '### Recommended Actions:\n';
    guidance += '1. Review work across all branches\n';
    guidance += '2. Update main context with completed features\n';
    guidance += '3. Consolidate learnings and decisions\n';
    guidance += '4. Update project objectives based on progress\n\n';
    
    // Check for feature branches that might be ready to merge
    for (const branch of branches) {
      if (branch !== 'main' && branch !== 'stage') {
        const branchPath = path.join(branchNotesDir, `${branch}.md`);
        const content = await fs.readFile(branchPath, 'utf-8');
        const commits = (content.match(/COMMIT:/g) || []).length;
        
        if (commits > 0) {
          guidance += `🔄 **${branch}** has ${commits} commits - consider merging\n`;
        }
      }
    }
    guidance += '\n';
    
  } catch (error) {
    guidance += '❌ **No branch notes directory found**\n\n';
  }
  
  return guidance;
}

async function generateGeneralGuidance(projectName, storageRoot) {
  let guidance = '## 🔍 General Context Sync\n\n';
  
  // Analyze overall project health
  const contextDir = path.join(storageRoot, 'context', projectName);
  const branchNotesDir = path.join(storageRoot, 'branch_notes', projectName);
  const knowledgeDir = path.join(storageRoot, 'knowledge', projectName);
  
  let contextFiles = 0;
  let branchFiles = 0;
  let knowledgeFiles = 0;
  
  try {
    const contexts = await fs.readdir(contextDir);
    contextFiles = contexts.filter(f => f.endsWith('.md')).length;
  } catch (error) {
    // No context files
  }
  
  try {
    const branches = await fs.readdir(branchNotesDir);
    branchFiles = branches.filter(f => f.endsWith('.md')).length;
  } catch (error) {
    // No branch files
  }
  
  try {
    const knowledge = await fs.readdir(knowledgeDir);
    knowledgeFiles = knowledge.filter(f => f.endsWith('.md')).length;
  } catch (error) {
    // No knowledge files
  }
  
  guidance += `📊 **Project Documentation Status:**\n`;
  guidance += `- Context files: ${contextFiles}\n`;
  guidance += `- Branch notes: ${branchFiles}\n`;
  guidance += `- Knowledge docs: ${knowledgeFiles}\n\n`;
  
  guidance += '### Recommended Actions:\n';
  
  if (contextFiles === 0) {
    guidance += '🔴 **Priority:** Create project context files\n';
  }
  
  if (branchFiles === 0) {
    guidance += '🔴 **Priority:** Start documenting work in branch notes\n';
  }
  
  if (knowledgeFiles === 0) {
    guidance += '🟡 **Suggestion:** Document key learnings in knowledge base\n';
  }
  
  if (contextFiles > 0 && branchFiles > 0) {
    guidance += '✅ **Good:** Regular sync between contexts and branch notes\n';
    guidance += '✅ **Good:** Archive completed work periodically\n';
  }
  
  guidance += '\n';
  
  return guidance;
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