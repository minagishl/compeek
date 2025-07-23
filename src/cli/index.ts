#!/usr/bin/env node

import { Command } from 'commander';
import { simpleGit, type SimpleGit } from 'simple-git';

import pkg from '../../package.json' with { type: 'json' };
import { startServer } from '../server/server.js';

import {
	findUntrackedFiles,
	markFilesIntentToAdd,
	promptUser,
	validateDiffArguments,
} from './utils.js';

type SpecialArg = 'working' | 'staged' | '.';

function isSpecialArg(arg: string): arg is SpecialArg {
	return arg === 'working' || arg === 'staged' || arg === '.';
}

interface CliOptions {
	port?: number;
	host?: string;
	open: boolean;
	mode: string;
	clean?: boolean;
}

const program = new Command();

program
	.name('compeek')
	.description('A lightweight Git diff viewer with GitHub-like interface')
	.version(pkg.version)
	.argument(
		'[commit-ish]',
		'Git commit, tag, branch, HEAD~n reference, or "working"/"staged"/"."',
		'HEAD'
	)
	.argument(
		'[compare-with]',
		'Optional: Compare with this commit/branch (shows diff between commit-ish and compare-with)'
	)
	.option('--port <port>', 'preferred port (auto-assigned if occupied)', parseInt)
	.option('--host <host>', 'host address to bind', '')
	.option('--no-open', 'do not automatically open browser')
	.option('--mode <mode>', 'diff mode (side-by-side or inline)', 'side-by-side')
	.option('--clean', 'start with a clean slate by clearing all existing comments')
	.action(async (commitish: string, compareWith: string | undefined, options: CliOptions) => {
		try {
			// Determine target and base commitish
			let targetCommitish = commitish;
			let baseCommitish: string;

			if (compareWith) {
				// If compareWith is provided, use it as base
				baseCommitish = compareWith;
			} else {
				// Handle special arguments
				if (commitish === 'working') {
					// working compares working directory with staging area
					baseCommitish = 'staged';
				} else if (isSpecialArg(commitish)) {
					baseCommitish = 'HEAD';
				} else {
					// Check if HEAD exists, if not, use working directory changes
					const git = simpleGit();
					try {
						await git.revparse(['HEAD']);
						baseCommitish = commitish + '^';
					} catch {
						// No commits yet, use working directory changes
						targetCommitish = '.';
						baseCommitish = 'HEAD';
					}
				}
			}

			if (commitish === 'working' || commitish === '.') {
				const git = simpleGit();
				await handleUntrackedFiles(git);
			}

			const validation = validateDiffArguments(targetCommitish, compareWith);
			if (!validation.valid) {
				console.error(`Error: ${validation.error}`);
				process.exit(1);
			}

			const { url, port, isEmpty } = await startServer({
				targetCommitish,
				baseCommitish,
				preferredPort: options.port,
				host: options.host,
				openBrowser: options.open,
				mode: options.mode,
				clearComments: options.clean,
			});

			console.log(`\ncompeek server started on ${url}`);
			console.log(`Reviewing: ${targetCommitish}`);

			if (options.clean) {
				console.log('Starting with a clean slate - all existing comments will be cleared');
			}

			if (isEmpty) {
				console.log(
					'\n! \x1b[33mNo differences found. Browser will not open automatically.\x1b[0m'
				);
				console.log(`   Server is running at ${url} if you want to check manually.\n`);
			} else if (options.open) {
				console.log('Opening browser...\n');
			} else {
				console.log('Use --open to automatically open browser\n');
			}

			process.on('SIGINT', async () => {
				console.log('\nShutting down compeek server...');

				// Try to fetch comments before shutting down
				try {
					const response = await fetch(`http://localhost:${port}/api/comments-output`);
					if (response.ok) {
						const data = await response.text();
						if (data.trim()) {
							console.log(data);
						}
					}
				} catch {
					// Silently ignore fetch errors during shutdown
				}

				process.exit(0);
			});
		} catch (error) {
			console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
			process.exit(1);
		}
	});

program.parse();

// Check for untracked files and prompt user to add them for diff visibility
async function handleUntrackedFiles(git: SimpleGit): Promise<void> {
	const files = await findUntrackedFiles(git);
	if (files.length === 0) {
		return;
	}

	const userConsent = await promptUserToIncludeUntracked(files);
	if (userConsent) {
		await markFilesIntentToAdd(git, files);
		console.log('Files added with --intent-to-add');
		const filesAsArgs = files.join(' ');
		console.log(`   To undo this, run \`git reset -- ${filesAsArgs}\``);
	} else {
		console.log('i Untracked files will not be shown in diff');
	}
}

async function promptUserToIncludeUntracked(files: string[]): Promise<boolean> {
	console.log(`\nFound ${files.length} untracked file(s):`);
	for (const file of files) {
		console.log(`    - ${file}`);
	}

	return await promptUser(
		'\nWould you like to include these untracked files in the diff review? (Y/n): '
	);
}
