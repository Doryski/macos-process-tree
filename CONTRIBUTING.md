# Contributing to macos-process-tree

Thank you for your interest in contributing. This guide explains how to set up the project for development and the process for submitting changes.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainer.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust (via [rustup](https://rustup.rs/))
- Xcode Command Line Tools (`xcode-select --install`)

### Setup

```bash
git clone https://github.com/doryski/macos-process-tree.git
cd macos-process-tree
pnpm install
pnpm tauri dev
```

### Running Tests

```bash
pnpm vitest run
```

## How to Contribute

### Reporting Bugs

Use the [Bug Report](https://github.com/doryski/macos-process-tree/issues/new?template=bug_report.md) issue template. Include:

- macOS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Suggesting Features

Use the [Feature Request](https://github.com/doryski/macos-process-tree/issues/new?template=feature_request.md) issue template. Describe the problem you want to solve and your proposed solution.

### Submitting Pull Requests

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** -- keep commits focused and atomic.
3. **Add or update tests** for any changed functionality.
4. **Run the test suite** to verify nothing is broken.
5. **Open a pull request** against `main` with a clear description of the change.

### Pull Request Guidelines

- Reference any related issue in the PR description (e.g., "Closes #12").
- Keep PRs small and focused on a single concern.
- Follow the existing code style and conventions.
- Ensure all tests pass before requesting review.

## Development Notes

### Frontend (React + TypeScript)

- Components live in `src/components/`
- Custom hooks live in `src/hooks/`
- Utility functions live in `src/lib/`
- The project uses React Compiler -- avoid patterns that break automatic memoization.
- Styling uses Tailwind CSS 4 with shadcn/ui components.

### Backend (Rust)

- Tauri commands are defined in `src-tauri/src/commands.rs`
- Process tree logic is in `src-tauri/src/process_tree.rs`
- The `sysinfo` crate provides system process data.

## Questions?

Open a [discussion](https://github.com/doryski/macos-process-tree/issues) or reach out via an issue.
