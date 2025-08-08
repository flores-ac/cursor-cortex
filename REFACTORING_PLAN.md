# Cursor-Cortex 7-Module Refactoring Plan

## Current Status: Phase 1 - Foundation & Analysis

### Target Architecture

```
cursor-cortex/
├── index.js                 # Entry point (~50 lines)
├── core/
│   └── server.js           # MCP server setup (~100 lines)
├── tools/
│   ├── definitions.js      # Tool schema definitions (~300 lines)
│   ├── handlers.js         # Tool execution handlers (~400 lines)
│   └── registry.js         # Tool registration logic (~100 lines)
├── lib/
│   ├── storage.js          # File system utilities (~200 lines)
│   ├── utils.js            # Helper functions (~150 lines)
│   └── analysis.js         # Complex analysis functions (~400 lines)
├── config/
│   └── constants.js        # Configuration constants (~50 lines)
└── test/
    ├── test.js             # Main test runner
    ├── unit/               # Unit tests for each module
    └── integration/        # Integration tests for MCP tools
```

### Function Mapping

**Storage Functions (→ lib/storage.js)**:
- getStorageRoot()
- getBranchNotePath()
- getBranchNoteArchivePath()
- getContextFilePath()
- getChecklistPath()
- getKnowledgeDir()
- getKnowledgeDocPath()

**Utility Functions (→ lib/utils.js)**:
- getFormattedDateTime()
- isExternalContextFile()
- calculateCompletenessScore()
- formatTimelineOutput()
- formatNarrativeOutput()

**Analysis Functions (→ lib/analysis.js)**:
- constructProjectNarrative()
- generateProjectSummary()
- constructTimeline()
- reconstructTimeline()
- analyzeDocumentationGaps()
- enhanced_branch_survey logic
- All knowledge archaeology functions

**Tool Definitions (→ tools/definitions.js)**:
- All MCP tool schemas from ListToolsRequestSchema handler

**Tool Handlers (→ tools/handlers.js)**:
- All tool execution logic from CallToolRequestSchema handler

**Core Server (→ core/server.js)**:
- Server initialization
- Transport setup
- Error handling framework

### Current Progress

✅ **Dependency Analysis**: Complete  
✅ **Testing Infrastructure**: Setup complete  
✅ **Module Directories**: Created  
⏳ **Baseline Benchmarks**: In progress  
⏳ **Integration Tests**: Pending  

### Next Steps

1. Complete Phase 1 validation
2. Begin Phase 2: Core Infrastructure extraction
3. Continue systematic module extraction

---
*Generated during systematic refactoring - feature/systematic-7-module-refactoring branch*