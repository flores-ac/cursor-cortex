# Changelog

All notable changes to Cursor-Cortex will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-06-25

### Fixed
- **CRITICAL**: Fixed timeline reconstruction tool returning 0 events due to async/await bug
  - `getAllProjectsFromBranchNotes()` function was using `Array.filter()` with async callbacks
  - Array.filter() doesn't wait for async functions, causing silent failures in project discovery
  - Replaced with proper `Promise.all()` + `map()` pattern for async operations
- **CRITICAL**: Fixed date filtering boundary logic in timeline reconstruction
  - Date ranges were not properly inclusive due to timezone boundary issues
  - Added explicit time boundaries: `T00:00:00` for start dates, `T23:59:59` for end dates
  - Date filtering now works correctly with `YYYY-MM-DD,YYYY-MM-DD` format

### Impact
- Timeline reconstruction tool now finds events correctly instead of returning 0 results
- Workflows agents and other integrations depending on timeline data now work properly
- Date filtering works as expected for all date ranges
- No breaking changes to existing API - all integrations continue to work unchanged

## [1.0.0] - 2025-06-23

### Added
- Initial release of Cursor-Cortex knowledge management system
- Branch notes with commit separator integration
- Tacit knowledge document system with cross-project search
- Context files with Smart Hybrid Context System (project + branch scopes)
- Completion checklists for project management
- Timeline reconstruction for Knowledge Archaeology
- Enhanced branch survey system with completeness scoring
- 20+ MCP tools for comprehensive knowledge management
- Git hooks integration for automated commit separators
- Cross-project knowledge discovery and relationship mapping

### Features
- **Branch Notes**: Track development progress with automatic commit separators
- **Tacit Knowledge**: Capture and search institutional knowledge across projects
- **Context Files**: Smart hybrid system with project-wide and branch-specific contexts
- **Checklists**: Project completion tracking with sign-off capabilities
- **Timeline Reconstruction**: Chronological analysis of development activities
- **Knowledge Archaeology**: Advanced branch survey and relationship detection
- **MCP Integration**: 20+ tools for seamless AI assistant integration

---

## Release Process

### Version Numbers
- **Major** (X.0.0): Breaking changes to MCP tools or core functionality
- **Minor** (1.X.0): New features, significant bug fixes, new MCP tools
- **Patch** (1.1.X): Bug fixes, documentation updates, minor improvements

### Release Checklist
1. Update version in `package.json`
2. Document changes in `CHANGELOG.md`
3. Create feature branch from `stage`
4. Test all functionality
5. Merge to `stage` → test → merge to `main`
6. Add git tag with version number
7. Update branch notes with release information 