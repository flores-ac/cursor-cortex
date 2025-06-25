# Contributing to Cursor-Cortex

Thank you for your interest in contributing to Cursor-Cortex! This project provides structured memory for AI assistants and welcomes contributions from the community.

## 📋 Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) before contributing.

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- Git
- Cursor IDE (for testing)

### Setup Development Environment
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/cursor-cortex.git`
3. Install dependencies: `npm install`
4. Set up git hooks: `node setup-hooks.js`
5. Test the setup: `node index.js`

## 🔄 Development Workflow

### Branch Strategy
- `main` - Production releases
- `stage` - Pre-production testing
- `feature/*` - New features
- `fix/*` - Bug fixes

### Making Changes
1. Create a feature branch from `stage`: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Commit with clear messages
6. Push and create a Pull Request

### Commit Message Format
```
type: brief description

Longer explanation if needed
- Bullet points for details
- Reference issues: #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🐛 Reporting Issues

### Bug Reports
Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, Cursor version)
- Error messages or logs

### Feature Requests
Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:
- Problem you're trying to solve
- Proposed solution
- Alternative solutions considered
- Additional context

## 🔧 Development Guidelines

### Code Style
- Follow existing code patterns
- Use ESLint: `npm run lint`
- Write clear, descriptive variable names
- Add comments for complex logic

### Testing
- Test your changes manually
- Verify MCP tools work correctly
- Test with actual Cursor IDE integration
- Check that git hooks function properly

### Documentation
- Update README.md for new features
- Add entries to CHANGELOG.md
- Update MCP tool descriptions
- Include code comments for complex functions

## 📝 Pull Request Process

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] No merge conflicts with target branch

### PR Requirements
- Clear title and description
- Reference related issues
- Include testing steps
- Update CHANGELOG.md if needed
- Maintain backward compatibility

### Review Process
1. Automated checks must pass
2. Code review by maintainers
3. Address feedback
4. Final approval and merge

## 🏗️ Architecture Overview

### Core Components
- **MCP Server** (`index.js`) - Main server handling tool requests
- **Branch Notes** - Development progress tracking
- **Tacit Knowledge** - Institutional knowledge storage
- **Context Files** - Project documentation system
- **Checklists** - Project completion tracking

### Key Directories
- `.github/` - GitHub templates and workflows
- `hooks/` - Git hooks for automation
- `~/.cursor-cortex/` - User data storage (runtime)

## 🔒 License Compliance

Cursor-Cortex uses the **Parachute Public License (PPL) v1.0**, an ethical open source license.

### Important Notes
- Contributions are welcome from individuals and ethical organizations
- The PPL restricts use by government, military, surveillance, and other harmful entities
- By contributing, you agree your contributions will be licensed under PPL v1.0
- Read the full license at [parachute.pub](https://parachute.pub)

### Contributor License Agreement
By submitting a contribution, you:
- Grant the project maintainers perpetual rights to use your contribution
- Confirm you have the right to submit the contribution
- Agree your contribution will be licensed under PPL v1.0

## 🤝 Community

### Getting Help
- Open an issue for bugs or questions
- Check existing issues and documentation first
- Be respectful and constructive in discussions

### Recognition
Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special thanks in documentation

## 📞 Contact

- **Maintainer**: Manuel Flores (@flores-ac)
- **Issues**: [GitHub Issues](https://github.com/flores-ac/cursor-cortex/issues)
- **License Questions**: See [PPL FAQ](https://parachute.pub/faq)

Thank you for contributing to Cursor-Cortex! 🚀 