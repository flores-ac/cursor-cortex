# Cursor-Cortex: Structured Memory for AI Assistants

**Solve AI assistant memory loss and context confusion.** Cursor-Cortex gives your AI the structured thinking and long-term memory it needs to actually help you build software.

## 🧠 The Problem with AI Assistants

LLM-based AI assistants are amazing at **generating code** and **explaining concepts**, but they struggle with:

- **❌ Memory Loss**: "What were we working on yesterday?"
- **❌ Context Switching**: "Wait, what is this project about again?"  
- **❌ Agent Failures**: Getting lost, hallucinating, losing track of goals
- **❌ No Structure**: Jumping between ideas without systematic thinking
- **❌ Knowledge Gaps**: No access to company-specific or project-specific insights

**Result**: You spend more time explaining context than actually solving problems.

## 🎯 The Cursor-Cortex Solution

Cursor-Cortex provides your AI with **structured external memory**:

### **📋 Context Files** → "What is this project about?"
Your AI always knows the project goals, architecture decisions, and current focus.

### **📝 Branch Notes** → "What have we been working on?"  
Continuous development log so your AI can pick up exactly where you left off.

### **🧠 Tacit Knowledge** → "How do we solve this type of problem?"
Company-specific solutions, patterns, and hard-won insights that LLMs don't know.

### **✅ Checklists** → "What's our systematic approach?"
Structured thinking frameworks that keep AI (and you) organized and thorough.

## 💡 Before vs After

### **❌ Without Cursor-Cortex:**
```
You: "Help me continue the authentication work"
AI: "I need more context. What authentication system? What issues were you facing?"
You: "Ugh, let me explain everything again..."
```

### **✅ With Cursor-Cortex:**
```
You: "Help me continue the authentication work"  
AI: *reads context + branch notes + knowledge base*
"I see you're implementing JWT refresh tokens and hit CORS issues yesterday. 
Based on our company knowledge doc about API security, let's check the middleware..."
```

## 🚀 Core Benefit

**Turn your AI from a smart intern into an experienced teammate** who remembers everything, follows structured thinking, and has access to institutional knowledge.

## ⚡ Complete Setup Guide

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

> **Note:** The `--legacy-peer-deps` flag is required due to TensorFlow.js peer dependency conflicts between v3.x and v4.x versions.

### 2. Get Full Path
```bash
pwd
# Copy the output - you'll need it for configuration
```

### 3. Vector Search Setup (Optional)
For AI-powered semantic search capabilities:

**System Requirements:**
- Node.js 18+ 
- 2GB RAM for vector models
- 500MB disk space

**Setup Steps:**

```bash
# Step 1: Generate embeddings for all knowledge files
node generate-all-embeddings-cpu.js

# This creates vector embeddings for:
# - All tacit knowledge documents
# - All branch notes
# - All context files
# Duration varies by document count and system specs

# Step 2 (Optional): Force regenerate if content changes
node generate-all-embeddings-cpu.js --force

# Step 3 (Optional): View progress during generation
node generate-all-embeddings-cpu.js --verbose
```

**Why This Matters:**
- Without embeddings, semantic search falls back to text search
- Pre-computed embeddings make searches 100x faster
- Generate once, use for all semantic queries
- Embeddings stored in `~/.cursor-cortex/embeddings/`

### 4. Configure Cursor MCP
Create or edit `~/.cursor/mcp.json`:
```json
"cursor-cortex": {
      "command": "node",
      "args": ["/YOUR/FULL/PATH/TO/cursor-cortex/index.js"],
      "tools": [
        "update_branch_note", 
        "add_commit_separator",
        "read_branch_notes",
        "update_context_file", 
        "read_project_context",
        "read_branch_context", 
        "list_context_files", 
        "generate_commit_message", 
        "generate_jira_comment", 
        "create_tacit_knowledge",
        "read_tacit_knowledge", 
        "search_branch_notes",
        "create_completion_checklist",
        "read_checklist",
        "update_checklist",
        "sign_off_checklist",
        "archive_branch_note",
        "clear_branch_note",
        "list_all_branch_notes",
        "enhanced_branch_survey",
        "comprehensive_knowledge_search",
        "construct_project_narrative",
        "timeline_reconstruction",
        "context_sync_guidance",
        "analyze_documentation_gaps",
        "migrate_context_files",
        "request_critical_thinking_space",
        "check_critical_thinking_status",
        "request_thinking_guidance",
        "add_perspective",
        "request_synthesis_space",
        "request_synthesis_step_guidance",
        "complete_synthesis_step"
      ],
      "stdio": true,
      "env": {
        "DEBUG": "true"
      }
    },
```
**Replace `/YOUR/FULL/PATH/TO/cursor-cortex/` with the output from step 2**

> **Note:** This configuration is for Cursor-Cortex v1.2.0+. If you're using an older version, some tools may not be available. Check your `package.json` version and consider updating.

### 5. Restart Cursor
Close and reopen Cursor completely.

### 6. Enable MCP Server
1. Go to **Cursor Settings** (Cmd/Ctrl + ,)
2. Navigate to **Features → Model Context Protocol**
3. Find **cursor-cortex** and toggle it **ON**
4. You should see: `Storage directory created at /Users/yourname/.cursor-cortex`

### 7. Test It
In any Cursor chat, try:
```
"Update my branch notes: Testing Cursor-Cortex setup"
```

If it works, you'll see: `Successfully updated branch note with: "Testing Cursor-Cortex setup"`

## 🔧 Troubleshooting

### Common Issues:

**❌ "Tool not found" error**
- Restart Cursor completely after configuration
- Verify MCP server is enabled in settings
- Check file path in mcp.json is correct (no typos)

**❌ MCP configuration not working**
- Validate JSON syntax at [jsonlint.com](https://jsonlint.com)
- Ensure commas and quotes are correct
- Check file permissions on mcp.json

**❌ Vector search not working**
- Run `npm install` to ensure TensorFlow.js is installed
- Check system has 2GB+ RAM available
- Try text search mode if vector search fails

**Need Help?** Create an issue with your error message for quick support.

### 8. Start Using
- **"Show my uncommitted work"** - See what you've been working on
- **"Generate a commit message"** - Create commits from your notes
- **"Create tacit knowledge document"** - Save solutions for later



## 📖 Basic Usage

### **Capture Your Thoughts**
As you code, tell your AI assistant:
```
"Update branch notes: Fixed the login validation bug by adding proper error handling 
for expired tokens. Had to modify the JWT middleware."
```

### **Stay Oriented**  
When you return to work:
```
"Show me my uncommitted work"
```

### **Smart Commits**
When ready to commit:
```
"Generate a commit message"
```
*AI reads all your notes and creates: "Fix JWT token validation and error handling"*

## 🏗️ Project Structure

Cursor-Cortex organizes your knowledge into:

- **📝 Branch Notes**: What you're working on right now
- **📋 Context Files**: Project documentation and decisions  
- **🧠 Knowledge Base**: Solutions and insights for future reference
- **✅ Checklists**: Track project completion

All stored in `~/.cursor-cortex/` and accessible through AI.

---

## 🎓 Power User Features

Once you're comfortable with basics, explore these advanced capabilities:

### **Cross-Project Knowledge Search**
```
"Search all my projects for JWT authentication solutions"
```

### **Automatic Commit Tracking**
```bash
node setup-hooks.js  # Auto-separates pre/post commit work
```

### **Project Checklists**
Track requirements, testing, and sign-offs:
```
"Create a completion checklist for the user auth feature"
```

### **Team Knowledge Sharing**
Create reusable solution documents:
```
"Create tacit knowledge document about our JWT implementation approach"
```

### **Knowledge Archaeology & Project Intelligence**
Analyze and synthesize project knowledge:
```
"Survey all my branch documentation and show completeness scores"
"Construct a project narrative for the user authentication system"
"Show me a timeline of all development across projects"
"Analyze this folder structure for documentation gaps"
```

## 🛠️ All Available Tools

<details>
<summary><strong>📝 Branch Management</strong></summary>

- `update_branch_note` - Add entries to your development log
- `read_branch_note` - View your full branch history  
- `filter_branch_note` - Show uncommitted work (default) or filter by date/commit
- `add_commit_separator` - Mark commit boundaries (auto via git hooks)
- `generate_commit_message` - AI creates commits from your notes

</details>

<details>
<summary><strong>📋 Project Documentation</strong></summary>

- `update_context_file` - Document project goals and decisions
- `read_project_context` - Read branch-agnostic project context only
- `read_branch_context` - Read branch-specific context only
- `list_context_files` - Browse all project docs with cross-project warnings

</details>

<details>
<summary><strong>🧠 Knowledge Management</strong></summary>

- `create_tacit_knowledge` - Document solutions for future reference
- `read_tacit_knowledge` - Search knowledge across all projects with tags and content search
- `search_branch_notes` - Search branch notes across projects with semantic search
- `comprehensive_knowledge_search` - Global semantic search across ALL Cursor-Cortex knowledge

</details>

<details>
<summary><strong>✅ Project Tracking</strong></summary>

- `create_completion_checklist` - Track requirements and deliverables
- `read_checklist` - View progress
- `update_checklist` - Mark items completed (manual or auto-detect)
- `sign_off_checklist` - Formal approval with signatures

</details>

<details>
<summary><strong>🔧 Maintenance</strong></summary>

- `archive_branch_note` - Archive completed work
- `clear_branch_note` - Reset branch documentation
- `migrate_context_files` - Migrate existing context files to Smart Hybrid Context System

</details>

<details>
<summary><strong>🔍 Knowledge Archaeology & Reality Sync Engine</strong></summary>

- `list_all_branch_notes` - View all branch notes across all projects with priority ordering
- `enhanced_branch_survey` - Comprehensive analysis of documentation with completeness scoring and relationship mapping
- `construct_project_narrative` - Weave scattered technical details into coherent production stories
- `timeline_reconstruction` - Extract chronological timeline data from branch notes and commit separators
- `context_sync_guidance` - Get contextual guidance for syncing project contexts based on timeline data
- `analyze_documentation_gaps` - Analyze folder structure to identify documentation needs and auto-create checklists

</details>

<details>
<summary><strong>🎭 Critical Thinking & Six Thinking Hats</strong></summary>

- `request_critical_thinking_space` - Create systematic analysis workspace using Six Thinking Hats methodology
- `check_critical_thinking_status` - Check completion status of critical thinking analysis
- `request_thinking_guidance` - Get guidance for specific Six Thinking Hats perspectives
- `add_perspective` - Add specific perspective analysis to critical thinking workspace
- `request_synthesis_space` - Load perspectives into synthesis workspace for integration
- `request_synthesis_step_guidance` - Get detailed guidance for synthesis steps
- `complete_synthesis_step` - Complete specific synthesis step and update process

</details>

## 🎛️ Advanced Configuration



### **Git Integration**
Automatic commit separators require the MCP server to be running:
```bash
node setup-hooks.js  # Install git hooks
```

### **CLI Interface**
Direct access without AI:
```bash
node cursor-cortex-cli.js  # Interactive menu
```

## 🤝 Contributing

Found a bug or have an idea? Open an issue or submit a pull request — contributions are welcome!

**Author:** Manuel Flores-Ramirez

## 📄 License

This project is licensed under the [Parachute Public License (PPL) v1.0](./LICENSE).

The PPL is an ethical license that includes restrictions against use by government, military, surveillance, and other harmful entities. For full details and rationale, see [parachute.pub](https://parachute.pub).

© 2025 Manuel Flores-Ramirez.