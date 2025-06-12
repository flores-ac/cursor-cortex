# Cursor-Cortex Usage Guide for AI Assistants

## Overview

This document provides guidelines for AI assistants on how to effectively use Cursor-Cortex tools to access and manage information across projects.

## Finding Information Across Projects

### 1. Listing All Projects

To identify all available projects, run:

```javascript
mcp_cursor-cortex_list_context_files(
  projectName="cursor-cortex",  // Your current project
  listAll=true
)
```

### 2. Finding Tacit Knowledge 

#### Method 1: Search by Keyword (Recommended)
To search for specific information across projects:

```javascript
// Search in one project:
mcp_cursor-cortex_read_tacit_knowledge(
  projectName="project-name",
  searchTerm="your search term"
)

// Repeat for each relevant project
```

#### Method 2: List All Documents 
To list all tacit knowledge documents in a specific project:

```javascript
mcp_cursor-cortex_read_tacit_knowledge(
  projectName="project-name",
  documentName="list"
)
```


### 3. Reading Branch Notes

To read branch notes for a project:

```javascript
mcp_cursor-cortex_read_branch_note(
  branchName="branch-name",  // e.g., "main"
  projectName="project-name"
)
```

To filter branch notes (e.g., All work committed or not):

```javascript
mcp_cursor-cortex_filter_branch_note(
  branchName="branch-name",
  projectName="project-name",
  uncommittedOnly=false  // Show all branch notes, default is to show only uncommited.
)
```

### 4. Reading Context Files

To understand a project's purpose and goals:

```javascript
mcp_cursor-cortex_read_context_file(
  branchName="branch-name",  // e.g., "main" 
  projectName="project-name"
)
```

## Maintaining Project Documentation

### 1. Updating Branch Notes

After making changes to code:

```javascript
mcp_cursor-cortex_update_branch_note(
  branchName="branch-name",
  projectName="project-name",
  message="Detailed description of changes made"
)
```

### 2. Adding Commit Separators

After commits, add a separator automatically with Git hooks or manually:

```javascript
mcp_cursor-cortex_add_commit_separator(
  branchName="branch-name",
  projectName="project-name",
  commitHash="hash-of-commit",
  commitMessage="commit message"
)
```

### 3. Creating Tacit Knowledge

To document important insights:

```javascript
mcp_cursor-cortex_create_tacit_knowledge(
  title="Descriptive Title",
  author="Author Name",
  projectName="project-name",
  problemStatement="Description of the problem",
  approach="How the problem was solved",
  outcome="Results achieved"
)
```

### 4. Setting Up Commit Separators in New Projects

To set up automatic commit separators in a project:

1. Create a `hooks` directory with a `post-commit` script:
   ```bash
   #!/bin/bash
   BRANCH_NAME=$(git branch --show-current)
   COMMIT_HASH=$(git rev-parse HEAD)
   COMMIT_MESSAGE=$(git log -1 --pretty=%B)
   PROJECT_NAME=${CURSOR_CORTEX_PROJECT:-$(basename $(git rev-parse --show-toplevel))}
   cursor-cortex add_commit_separator --branchName="$BRANCH_NAME" --projectName="$PROJECT_NAME" --commitHash="$COMMIT_HASH" --commitMessage="$COMMIT_MESSAGE"
   ```

2. Install the hook with a setup script:
   ```javascript
   #!/usr/bin/env node
   import fs from 'fs/promises';
   import path from 'path';
   import { execSync } from 'child_process';
   
   async function setupHooks() {
     const gitRoot = execSync('git rev-parse --show-toplevel').toString().trim();
     const hooksDir = path.join(gitRoot, '.git', 'hooks');
     try {
       await fs.access(hooksDir);
     } catch (error) {
       await fs.mkdir(hooksDir, { recursive: true });
     }
     const sourcePostCommitHook = path.join(gitRoot, 'hooks', 'post-commit');
     const targetPostCommitHook = path.join(hooksDir, 'post-commit');
     await fs.copyFile(sourcePostCommitHook, targetPostCommitHook);
     await fs.chmod(targetPostCommitHook, 0o755);
   }
   
   setupHooks();
   ```

## Best Practices

1. **Always Update Branch Notes**: Document all changes in branch notes before committing
2. **Create Tacit Knowledge**: Document solutions to complex problems and important insights
3. **Search Before Creating**: Check if knowledge already exists before creating new documents
4. **Use Context Files**: Maintain updated context files for each project branch
5. **Organize by Tags**: Use consistent tags when creating tacit knowledge documents

## Troubleshooting

1. **Cross-Project Search Not Working**: Search each project separately
2. **Commit Separators Not Added**: Ensure Git hooks are properly installed
3. **Missing Projects**: Confirm correct project name spelling

## Examples

### Finding Knowledge About Specific Topics

```javascript
// First list all projects
const projects = ["cursor-cortex", "clip-databricks-dashboards", "another-project"];

// Search for knowledge about "commit separators" in each project
for (const project of projects) {
  mcp_cursor-cortex_read_tacit_knowledge(
    projectName=project,
    searchTerm="commit separator"
  );
}
```

### Documenting Code Changes

```javascript
// After making code changes
mcp_cursor-cortex_update_branch_note(
  branchName="feature-branch",
  projectName="my-project",
  message="Implemented new feature X with improved error handling and tests"
);

// When ready to commit
mcp_cursor-cortex_generate_commit_message(
  branchName="feature-branch",
  projectName="my-project"
);
``` 