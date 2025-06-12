#!/usr/bin/env node

import { exec } from 'child_process';
import readline from 'readline';
import path from 'path';

// Main function to handle CLI operations
async function main() {
  // Parse command-line arguments for direct tool invocation
  const args = process.argv.slice(2);

  // Check if a specific tool is being called directly
  if (args.length > 0) {
    const toolName = args[0];
    const toolArgs = args.slice(1);
    
    // Convert arguments to a format suitable for the MCP tool
    const formattedArgs = toolArgs.map(arg => {
      // Handle --param=value format
      if (arg.startsWith('--') && arg.includes('=')) {
        const [param, value] = arg.slice(2).split('=');
        return `--${param}="${value}"`;
      }
      // Handle individual parameters (assume they are values if they don't start with --)
      else if (!arg.startsWith('--')) {
        return `"${arg}"`;
      }
      return arg;
    }).join(' ');
    
    // Execute the command directly
    exec(`node index.js ${toolName} ${formattedArgs}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      }
      if (stderr) {
        console.error(stderr);
      }
      console.log(stdout);
      process.exit(0);
    });
    
    // Exit early - we're not launching the interactive CLI
    return;
  }

  // If no direct tool invocation, launch the interactive CLI
  await launchInteractiveCLI();
}

// Launch the interactive CLI
async function launchInteractiveCLI() {
  // Create readline interface for user interaction
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Helper function to get current branch name
  async function getCurrentBranch() {
    return new Promise((resolve) => {
      exec('git branch --show-current', (error, stdout, stderr) => {
        if (error) {
          console.warn('Warning: Not in a git repository. Using "main" as default branch.');
          resolve('main');
        } else {
          if (stderr) console.warn('Git stderr:', stderr);
          resolve(stdout.trim() || 'main');
        }
      });
    });
  }

  // Helper function to get current project name from directory
  function getProjectName() {
    // Get the current directory name as project name
    const dirName = path.basename(process.cwd());
    return dirName || 'default-project';
  }

  // Helper to prompt user with a question
  function prompt(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  // Helper to prompt for multi-line input
  async function promptMultiLine(question) {
    console.log(question);
    console.log('(Type "END" on a new line to finish)');
    
    let lines = [];
    let line;
    
    while (true) {
      line = await prompt('> ');
      if (line === 'END') break;
      lines.push(line);
    }
    
    return lines.join('\n');
  }

  // Function to capture tacit knowledge
  async function captureTacitKnowledge() {
    console.log('\n=== Tacit Knowledge Capture ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${currentBranch}`);
    
    const title = await prompt('Knowledge Title: ');
    const author = await prompt('Author: ');
    const tags = await prompt('Tags (comma-separated): ');
    
    console.log('\nProblem Statement:');
    const problemStatement = await promptMultiLine('Describe the problem or situation that required expertise:');
    
    console.log('\nEnvironment/Conditions:');
    const environment = await promptMultiLine('Describe relevant environmental factors (systems, versions, etc.):');
    
    console.log('\nConstraints:');
    const constraints = await promptMultiLine('List any limitations or constraints that influenced the approach:');
    
    console.log('\nApproach:');
    const approach = await promptMultiLine('Explain your approach to solving the problem:');
    
    console.log('\nOutcome:');
    const outcome = await promptMultiLine('Describe the result of applying this knowledge:');
    
    console.log('\nRelated Documentation:');
    const relatedDocumentation = await promptMultiLine('Links to related documentation, tickets, or resources:');
    
    // Call the MCP tool
    try {
      const command = `node index.js create_tacit_knowledge --title="${title}" --author="${author}" --projectName="${projectName}" --branchName="${currentBranch}" ${tags ? `--tags="${tags}"` : ''} --problemStatement="${problemStatement}" ${environment ? `--environment="${environment}"` : ''} ${constraints ? `--constraints="${constraints}"` : ''} --approach="${approach}" --outcome="${outcome}" ${relatedDocumentation ? `--relatedDocumentation="${relatedDocumentation}"` : ''}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to create completion checklist
  async function createCompletionChecklist() {
    console.log('\n=== Completion Checklist Creation ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${currentBranch}`);
    
    const featureName = await prompt('Feature/Module Name: ');
    const owner = await prompt('Owner: ');
    const jiraTicket = await prompt('Jira Ticket (if applicable): ');
    
    console.log('\nObjectives:');
    console.log('(Enter one objective per line)');
    const objectives = await promptMultiLine('Main objectives of this feature:');
    
    console.log('\nRequirements:');
    console.log('(Enter one requirement per line)');
    const requirements = await promptMultiLine('Key requirements that need to be met:');
    
    console.log('\nTest Criteria:');
    console.log('(Enter one test criterion per line)');
    const testCriteria = await promptMultiLine('Criteria for successful testing:');
    
    console.log('\nKnowledge Items:');
    console.log('(Enter one knowledge item per line)');
    const knowledgeItems = await promptMultiLine('List of knowledge items that should be documented:');
    
    // Call the MCP tool
    try {
      const command = `node index.js create_completion_checklist --projectName="${projectName}" --featureName="${featureName}" --owner="${owner}" --requirements="${requirements}" --objectives="${objectives}" ${testCriteria ? `--testCriteria="${testCriteria}"` : ''} ${knowledgeItems ? `--knowledgeItems="${knowledgeItems}"` : ''} ${jiraTicket ? `--jiraTicket="${jiraTicket}"` : ''}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to update branch note
  async function updateBranchNote() {
    console.log('\n=== Update Branch Note ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    // Using the current branch without asking if it's available (which it always should be now)
    const branchName = currentBranch;
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${branchName}`);
    
    console.log('\nChange Message:');
    const message = await promptMultiLine('Describe the changes made:');
    
    // Call the MCP tool
    try {
      const command = `node index.js update_branch_note --branchName="${branchName}" --projectName="${projectName}" --message="${message}"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to filter branch notes
  async function filterBranchNotes() {
    console.log('\n=== Filter Branch Notes ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${currentBranch}`);
    
    console.log('\nFilter Options:');
    console.log('1. Show uncommitted work only');
    console.log('2. Filter by date range');
    console.log('3. Filter by commit hash');
    console.log('4. Show all entries');
    
    const filterChoice = await prompt('\nSelect a filter option (1-4): ');
    
    let filterArgs = '';
    
    switch (filterChoice) {
    case '1':
      filterArgs = '--uncommittedOnly=true';
      break;
    case '2':
      const afterDate = await prompt('After date (YYYY-MM-DD, leave empty for no limit): ');
      const beforeDate = await prompt('Before date (YYYY-MM-DD, leave empty for no limit): ');
        
      if (afterDate) {
        filterArgs += ` --afterDate="${afterDate}"`;
      }
        
      if (beforeDate) {
        filterArgs += ` --beforeDate="${beforeDate}"`;
      }
      break;
    case '3':
      const commitHash = await prompt('Commit hash (full or partial): ');
      if (commitHash) {
        filterArgs += ` --commitHash="${commitHash}"`;
      }
      break;
    case '4':
      // No additional arguments needed
      break;
    default:
      console.log('Invalid option selected. Showing all entries.');
      break;
    }
    
    // Call the MCP tool
    try {
      const command = `node index.js filter_branch_note --branchName="${currentBranch}" --projectName="${projectName}" ${filterArgs}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to generate Jira comment
  async function generateJiraComment() {
    console.log('\n=== Generate Jira Comment ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    const ticketId = await prompt('Jira Ticket ID: ');
    // Using the current branch without asking if it's available
    const branchName = currentBranch;
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${branchName}`);
    const jiraBaseUrl = await prompt('Jira Base URL (optional): ');
    
    // Call the MCP tool
    try {
      const command = `node index.js generate_jira_comment --ticketId="${ticketId}" --branchName="${branchName}" --projectName="${projectName}" ${jiraBaseUrl ? `--jiraBaseUrl="${jiraBaseUrl}"` : ''}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to archive branch note
  async function archiveBranchNote() {
    console.log('\n=== Archive Branch Note ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${currentBranch}`);
    
    const confirmArchive = await prompt('Are you sure you want to archive the branch note? This will move it to an archive file and delete the original. (y/n): ');
    
    if (confirmArchive.toLowerCase() !== 'y') {
      console.log('Archive cancelled.');
      return;
    }
    
    const customDate = await prompt('Enter archive date (YYYY-MM-DD) or press Enter for today: ');
    const dateArg = customDate ? `--archiveDate="${customDate}"` : '';
    
    // Call the MCP tool
    try {
      const command = `node index.js archive_branch_note --branchName="${currentBranch}" --projectName="${projectName}" ${dateArg}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Function to clear branch note
  async function clearBranchNote() {
    console.log('\n=== Clear Branch Note ===\n');
    
    const currentBranch = await getCurrentBranch();
    const projectName = getProjectName();
    
    console.log(`Project: ${projectName}`);
    console.log(`Branch: ${currentBranch}`);
    
    const confirmClear = await prompt('Are you sure you want to clear the branch note? This will remove all entries. (y/n): ');
    
    if (confirmClear.toLowerCase() !== 'y') {
      console.log('Clear operation cancelled.');
      return;
    }
    
    const createArchive = await prompt('Create an archive before clearing? (y/n): ');
    const keepHeader = await prompt('Keep the branch note header? (y/n): ');
    
    // Call the MCP tool
    try {
      const command = `node index.js clear_branch_note --branchName="${currentBranch}" --projectName="${projectName}" --createArchive=${createArchive.toLowerCase() === 'y'} --keepHeader=${keepHeader.toLowerCase() === 'y'}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) console.warn('Command stderr:', stderr);
        console.log('\n' + stdout);
      });
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }

  // Main menu function
  async function mainMenu() {
    while (true) {
      console.log('\n=== Cursor-Cortex Knowledge Management System ===');
      console.log('1. Capture Tacit Knowledge');
      console.log('2. Create Completion Checklist');
      console.log('3. Update Branch Note');
      console.log('4. Filter Branch Notes');
      console.log('5. Generate Jira Comment');
      console.log('6. Archive Branch Note');
      console.log('7. Clear Branch Note');
      console.log('0. Exit');
      
      const choice = await prompt('\nSelect an option: ');
      
      switch (choice) {
      case '1':
        await captureTacitKnowledge();
        break;
      case '2':
        await createCompletionChecklist();
        break;
      case '3':
        await updateBranchNote();
        break;
      case '4':
        await filterBranchNotes();
        break;
      case '5':
        await generateJiraComment();
        break;
      case '6':
        await archiveBranchNote();
        break;
      case '7':
        await clearBranchNote();
        break;
      case '0':
        console.log('Exiting Cursor-Cortex CLI.');
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid option. Please try again.');
      }
    }
  }

  // Start the application
  await mainMenu();
}

// Start the application
main(); 