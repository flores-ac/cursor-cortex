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
npm install
```

### 2. Get Full Path
```bash
pwd
# Copy the output - you'll need it for configuration
```

### 3. Configure Cursor MCP
Create or edit `~/.cursor/mcp.json`:
```json
"cursor-cortex": {
      "command": "node",
      "args": ["/YOUR/FULL/PATH/TO/cursor-cortex/index.js"],
      "tools": [
        "update_branch_note", 
        "add_commit_separator",
        "filter_branch_note",
        "read_branch_note", 
        "update_context_file", 
        "read_context_file",
        "list_context_files", 
        "generate_commit_message", 
        "generate_jira_comment", 
        "create_tacit_knowledge",
        "read_tacit_knowledge", 
        "create_completion_checklist",
        "read_checklist",
        "update_checklist",
        "sign_off_checklist",
        "archive_branch_note",
        "clear_branch_note"
      ],
      "stdio": true,
      "env": {
        "DEBUG": "true"
      }
    },
```
**Replace `/YOUR/FULL/PATH/TO/cursor-cortex/` with the output from step 2**

### 4. Restart Cursor
Close and reopen Cursor completely.

### 5. Enable MCP Server
1. Go to **Cursor Settings** (Cmd/Ctrl + ,)
2. Navigate to **Features → Model Context Protocol**
3. Find **cursor-cortex** and toggle it **ON**
4. You should see: `Storage directory created at /Users/yourname/.cursor-cortex`

### 6. Test It
In any Cursor chat, try:
```
"Update my branch notes: Testing Cursor-Cortex setup"
```

If it works, you'll see: `Successfully updated branch note with: "Testing Cursor-Cortex setup"`

### 7. Start Using
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
- `read_context_file` - Access project information
- `list_context_files` - Browse all project docs with cross-project warnings

</details>

<details>
<summary><strong>🧠 Knowledge Management</strong></summary>

- `create_tacit_knowledge` - Document solutions for future reference
- `read_tacit_knowledge` - Search knowledge across all projects with tags and content search

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

This project is licensed under the [Apache 2.0 License](./LICENSE).

© 2025 **Flores Analytics Consulting L.L.C**, Manuel Flores-Ramirez.