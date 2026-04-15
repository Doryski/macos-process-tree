# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public issue.** Instead, email the maintainer directly or use [GitHub's private vulnerability reporting](https://github.com/doryski/macos-process-tree/security/advisories/new).

Please include:

- A description of the vulnerability
- Steps to reproduce the issue
- Any potential impact

You should receive a response within 72 hours. The maintainer will work with you to understand and address the issue before any public disclosure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Considerations

This application interacts with system processes and can send signals (SIGTERM, SIGKILL) to running processes. It requires appropriate system permissions to function. The Tauri backend restricts IPC commands to the bundled frontend -- no external access is possible.
