# Critical Rules for AI Assistants Using Cursor-Cortex

## Safety and Scope Rules

1. **Directory Safety**
   - NEVER read, search, or execute commands outside user's specified development directories
   - ALL file operations must stay within current project context or explicitly approved directories
   - ALWAYS start investigation in immediate context
   - REQUEST user permission before expanding search scope

2. **Checklist Management**
   - BEFORE modifying checklists:
     - Explain what the checklist is in two sentences
     - Verify accuracy
     - Run tests if needed
   - BEFORE signing off:
     - Explain what you're signing off and why it's ready
     - Get user confirmation
     - Execute sign-off
     - Confirm completion and project impact

## Tool Usage Rules

1. **Parameter Formatting**
   - NEVER use direct strings as arguments
   - ALWAYS use named parameters with proper quoting
   ```javascript
   // ❌ INCORRECT
   mcp_cursor-cortex_create_tacit_knowledge("My Document")
   
   // ✅ CORRECT
   mcp_cursor-cortex_create_tacit_knowledge(
     title="My Document",
     author="Author Name",
     projectName="project-name"
   )
   ```

2. **Cross-Project Knowledge**
   - For tacit knowledge search: crossProject=true parameter DOES work reliably
   - For context files: use listAll=true parameter instead
   - Alternative approach for tacit knowledge:
     1. List all projects using list_context_files
     2. Search each relevant project separately
     3. Use searchTerm parameter for targeted searches

3. **Branch Note Management**
   - ALWAYS update branch notes before committing changes
   - ALWAYS add commit separators after commits
   - VERIFY current branch before operations
   - USE filter_branch_note for specific queries

4. **Documentation Requirements**
   - CREATE tacit knowledge for:
     - Complex problem solutions
     - Important insights
     - Reusable patterns
   - MAINTAIN context files for each project branch
   - USE consistent tags for knowledge organization

## Workflow Rules

1. **Before Making Changes**
   - CHECK current branch
   - READ context file
   - VERIFY existing branch notes

2. **After Code Changes**
   - UPDATE branch notes immediately
   - CREATE tacit knowledge if relevant
   - GENERATE commit message from notes

3. **For Commits (When Requested)**
   - GENERATE message from branch notes
   - GET user confirmation
   - USE terminal for git commands
   - UPDATE related documentation

4. **For Knowledge Creation**
   - SEARCH before creating new documents
   - USE consistent tag patterns
   - INCLUDE all required parameters
   - LINK related knowledge when relevant

## Error Prevention

1. **Required Parameters**
   - update_branch_note: branchName, projectName, message
   - read_branch_note: branchName, projectName
   - create_tacit_knowledge: title, author, projectName, problemStatement, approach, outcome
   - update_context_file: branchName, projectName, title, description

2. **Common Pitfalls**
   - AVOID direct string arguments
   - VERIFY parameter names exactly match requirements
   - CHECK project and branch names exist
   - ENSURE proper quoting of all string values

## Best Practices

1. **Knowledge Management**
   - USE tacit knowledge for important insights
   - MAINTAIN clear documentation trails
   - LINK related information
   - TAG consistently

2. **Project Organization**
   - KEEP context files updated
   - MAINTAIN clean branch notes
   - USE commit separators
   - ORGANIZE by project boundaries

3. **User Interaction**
   - GET confirmation for significant actions
   - EXPLAIN changes before making them
   - PROVIDE clear error messages
   - SUGGEST improvements when relevant 