# Compeek

A lightweight command-line tool for reviewing Git commit differences with a GitHub-like interface, inspired by [difit](https://github.com/yoshiko-pg/difit).

## Name Origin

**Compeek** is a portmanteau of "**Compare**" and "**Peek**" - perfectly capturing what this tool does: it lets you **compare** Git commits and **peek** into the differences with an intuitive interface. Just like taking a quick peek at your code changes, Compeek provides a fast and elegant way to review your Git history.

## Features

- **Zero Config**: Just run `npx compeek` and it works
- **GitHub-like Interface**: Clean, modern web UI for diff viewing
- **Smart Diff Modes**: Support for various comparison modes (working, staged, commits)
- **Responsive Design**: Works on desktop and mobile
- **Fast**: Built with modern web technologies (React, TypeScript, Vite)
- **Syntax Highlighting**: Code syntax highlighting for better readability

## Quick Start

```bash
npx compeek    # View the latest commit diff
```

## Usage

### Basic Usage

```bash
npx compeek <target>                    # View single commit diff
npx compeek <target> [compare-with]     # Compare two commits/branches
```

### Single commit review

```bash
npx compeek          # HEAD (latest) commit
npx compeek 6f4a9b7  # Specific commit
npx compeek feature  # Latest commit on feature branch
```

### Compare two commits

```bash
npx compeek HEAD main      # Compare HEAD with main branch
npx compeek @ main         # Compare HEAD with main branch (@ is alias for HEAD)
npx compeek @^ @~3         # Compare previous commit with 3 commits ago
npx compeek feature main   # Compare branches
npx compeek . origin/main  # Compare working directory with remote main
```

### Special Arguments

compeek supports special keywords for common diff scenarios:

```bash
npx compeek .        # All uncommitted changes (staging area + unstaged)
npx compeek staged   # Staging area changes
npx compeek working  # Unstaged changes only
```

## CLI Options

| Flag             | Default      | Description                                                         |
| ---------------- | ------------ | ------------------------------------------------------------------- |
| `<target>`       | HEAD         | Commit hash, tag, HEAD~n, branch, or special arguments              |
| `[compare-with]` | -            | Optional second commit to compare with (shows diff between the two) |
| `--port <port>`  | 3000         | Preferred port; falls back to +1 if occupied                        |
| `--host <host>`  | 127.0.0.1    | Host address to bind server to (use 0.0.0.0 for external access)    |
| `--no-open`      | false        | Don't automatically open browser                                    |
| `--mode <mode>`  | side-by-side | Display mode: `inline` or `side-by-side`                            |
| `--clean`        | false        | Start with a clean slate by clearing all existing comments          |

## Architecture

- **CLI**: Commander.js for argument parsing with comprehensive validation
- **Backend**: Hono server with simple-git for diff processing
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 with GitHub-like dark theme
- **Build System**: TypeScript + Vite for modern bundling

## Development

```bash
# Install dependencies
pnpm install

# Start development server (with hot reload)
pnpm run dev

# Build and start production server
pnpm run start <target>

# Build for production
pnpm run build

# Run tests
pnpm test

# Lint and format
pnpm run lint
pnpm run format
pnpm run typecheck
```

### Project Structure

```
src/
├── cli/           # CLI entry point and utilities
├── server/        # Hono server and git diff parsing
├── client/        # React frontend application
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities
```

## Requirements

- Node.js 16+
- Git repository

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
