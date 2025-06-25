# Security Policy

## 🔒 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | ✅ Yes            |
| 1.0.x   | ❌ No (EOL)       |

## 🚨 Reporting a Vulnerability

We take the security of Cursor-Cortex seriously. If you discover a security vulnerability, please report it responsibly.

### 📧 How to Report

**DO NOT** open a public issue for security vulnerabilities.

Instead, please email security reports to:
- **Email**: [Create a private security advisory on GitHub]
- **GitHub**: Use [GitHub Security Advisories](https://github.com/flores-ac/cursor-cortex/security/advisories/new)

### 📋 What to Include

Please include the following information in your report:
- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** and severity assessment
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### 🔄 Response Process

1. **Acknowledgment**: We'll acknowledge receipt within 48 hours
2. **Assessment**: We'll assess the vulnerability within 5 business days
3. **Fix Development**: We'll work on a fix with appropriate priority
4. **Disclosure**: We'll coordinate disclosure timing with you
5. **Credit**: We'll credit you in the security advisory (unless you prefer anonymity)

### ⏱️ Response Timeline

- **Critical**: 24-48 hours
- **High**: 3-5 business days
- **Medium**: 1-2 weeks
- **Low**: 2-4 weeks

## 🛡️ Security Considerations

### Data Storage
Cursor-Cortex stores data locally in:
- `~/.cursor-cortex/` directory
- Local file system only (no cloud storage)
- No sensitive credentials stored

### MCP Server
- Runs locally on user's machine
- No external network connections required
- Communicates only with Cursor IDE via local IPC

### Git Integration
- Uses standard git hooks
- No modification of git security settings
- Respects existing git permissions

## 🔐 Best Practices for Users

### Installation Security
- Download only from official sources (GitHub releases, npm)
- Verify package integrity when possible
- Use latest supported version

### Configuration Security
- Review MCP configuration in `~/.cursor/mcp.json`
- Ensure proper file permissions on Cursor-Cortex directory
- Regularly update to latest version

### Data Protection
- Branch notes and knowledge documents are stored locally
- Consider backup encryption for sensitive project information
- Be mindful of what information you store in tacit knowledge

## 🚫 Out of Scope

The following are generally not considered security vulnerabilities:
- Issues requiring physical access to the user's machine
- Social engineering attacks
- Vulnerabilities in dependencies (report to respective projects)
- Issues in Cursor IDE itself (report to Cursor team)

## 📜 License Compliance

Security fixes will be provided under the same Parachute Public License (PPL) v1.0 terms as the main project.

## 🤝 Responsible Disclosure

We believe in responsible disclosure and will:
- Work with you to understand and address the issue
- Provide credit for your discovery (unless you prefer anonymity)
- Coordinate timing of public disclosure
- Not pursue legal action against good-faith security researchers

Thank you for helping keep Cursor-Cortex secure! 🛡️ 