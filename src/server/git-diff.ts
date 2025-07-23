import { simpleGit, type SimpleGit } from 'simple-git';

import { validateDiffArguments, shortHash, createCommitRangeString } from '../cli/utils.js';
import { type DiffFile, type DiffChunk, type DiffLine, type DiffResponse } from '../types/diff.js';

export class GitDiffParser {
	private git: SimpleGit;

	constructor(repoPath = process.cwd()) {
		this.git = simpleGit(repoPath);
	}

	async parseDiff(
		targetCommitish: string,
		baseCommitish: string,
		ignoreWhitespace = false
	): Promise<DiffResponse> {
		try {
			// Validate arguments
			const validation = validateDiffArguments(targetCommitish, baseCommitish);
			if (!validation.valid) {
				throw new Error(validation.error);
			}

			let resolvedCommit: string;
			let diffArgs: string[];

			// Handle target special chars (base is always a regular commit)
			if (targetCommitish === 'working') {
				// Show unstaged changes (working vs staged)
				resolvedCommit = 'Working Directory (unstaged changes)';
				diffArgs = [];
			} else if (targetCommitish === 'staged') {
				// Show staged changes against base commit
				const baseHash = await this.git.revparse([baseCommitish]);
				resolvedCommit = `${shortHash(baseHash)} vs Staging Area (staged changes)`;
				diffArgs = ['--cached', baseCommitish];
			} else if (targetCommitish === '.') {
				// Show all uncommitted changes against base commit
				try {
					const baseHash = await this.git.revparse([baseCommitish]);
					resolvedCommit = `${shortHash(baseHash)} vs Working Directory (all uncommitted changes)`;
					diffArgs = [baseCommitish];
				} catch {
					// No commits yet, show all files as new
					resolvedCommit = 'Working Directory (all files)';
					diffArgs = ['--no-index', '/dev/null'];
				}
			} else {
				// Both are regular commits: standard commit-to-commit comparison
				const targetHash = await this.git.revparse([targetCommitish]);
				const baseHash = await this.git.revparse([baseCommitish]);
				resolvedCommit = createCommitRangeString(targetHash, baseHash);
				diffArgs = [baseCommitish, targetCommitish];
			}

			// Add whitespace ignore option if requested
			if (ignoreWhitespace) {
				diffArgs.push('--ignore-all-space');
			}

			// Get raw diff output
			let rawDiff: string;
			if (diffArgs.length === 0) {
				// Working directory changes
				rawDiff = await this.git.raw(['diff', '--unified=3']);
			} else if (diffArgs.includes('--no-index')) {
				// Show all files as new (no commits in repo)
				const status = await this.git.status();
				const allFiles = [...status.files.map((f) => f.path), ...status.not_added];
				if (allFiles.length === 0) {
					rawDiff = '';
				} else {
					// Create a synthetic diff for all files
					rawDiff = await this.createSyntheticDiffForAllFiles(allFiles);
				}
			} else {
				rawDiff = await this.git.raw(['diff', '--unified=3', ...diffArgs]);
			}

			const files = this.parseDiffOutput(rawDiff);
			const isEmpty = files.length === 0;

			return {
				files,
				commit: resolvedCommit,
				isEmpty,
			};
		} catch (error) {
			throw new Error(
				`Failed to parse diff: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	private parseDiffOutput(diffText: string): DiffFile[] {
		const files: DiffFile[] = [];
		const fileBlocks = diffText.split(/^diff --git /m).filter((block) => block.trim());

		for (const block of fileBlocks) {
			const lines = block.split('\n');
			const fileDiff = this.parseFileBlock(lines);
			if (fileDiff) {
				files.push(fileDiff);
			}
		}

		return files;
	}

	private parseFileBlock(lines: string[]): DiffFile | null {
		if (lines.length === 0) return null;

		const firstLine = lines[0];
		const fileMatch = firstLine.match(/^a\/(.+) b\/(.+)$/);
		if (!fileMatch) return null;

		const oldFilename = fileMatch[1];
		const newFilename = fileMatch[2];

		let status: DiffFile['status'] = 'modified';
		let filename = newFilename;

		const newFileMatch = lines.find((line) => line.startsWith('new file mode'));
		const deletedFileMatch = lines.find((line) => line.startsWith('deleted file mode'));
		const renameMatch = lines.find((line) => line.startsWith('rename from'));
		const binaryMatch = lines.find((line) => line.includes('Binary files'));

		if (newFileMatch) {
			status = 'added';
		} else if (deletedFileMatch) {
			status = 'deleted';
			filename = oldFilename;
		} else if (renameMatch) {
			status = 'renamed';
		}

		if (binaryMatch) {
			return {
				filename,
				oldFilename: status === 'renamed' ? oldFilename : undefined,
				status,
				additions: 0,
				deletions: 0,
				chunks: [],
				isBinary: true,
				isImage: this.isImageFile(filename),
			};
		}

		const chunks = this.parseChunks(lines);

		let additions = 0;
		let deletions = 0;

		chunks.forEach((chunk) => {
			chunk.lines.forEach((line) => {
				if (line.type === 'added') additions++;
				if (line.type === 'deleted') deletions++;
			});
		});

		return {
			filename,
			oldFilename: status === 'renamed' ? oldFilename : undefined,
			status,
			additions,
			deletions,
			chunks,
		};
	}

	private parseChunks(lines: string[]): DiffChunk[] {
		const chunks: DiffChunk[] = [];
		let currentChunk: DiffChunk | null = null;
		let oldLineNumber = 0;
		let newLineNumber = 0;

		for (const line of lines) {
			if (line.startsWith('@@')) {
				const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
				if (match) {
					if (currentChunk) {
						chunks.push(currentChunk);
					}

					const oldStart = parseInt(match[1]);
					const oldLines = parseInt(match[2] || '1');
					const newStart = parseInt(match[3]);
					const newLines = parseInt(match[4] || '1');

					currentChunk = {
						oldStart,
						oldLines,
						newStart,
						newLines,
						lines: [],
					};

					oldLineNumber = oldStart;
					newLineNumber = newStart;
				}
			} else if (
				currentChunk &&
				(line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))
			) {
				const type = line.startsWith('+') ? 'added' : line.startsWith('-') ? 'deleted' : 'context';

				const diffLine: DiffLine = {
					type,
					content: line.substring(1),
					oldLineNumber: type !== 'added' ? oldLineNumber : undefined,
					newLineNumber: type !== 'deleted' ? newLineNumber : undefined,
				};

				currentChunk.lines.push(diffLine);

				if (type !== 'added') oldLineNumber++;
				if (type !== 'deleted') newLineNumber++;
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}

	private isImageFile(filename: string): boolean {
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
		const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
		return imageExtensions.includes(ext);
	}

	private async createSyntheticDiffForAllFiles(files: string[]): Promise<string> {
		let syntheticDiff = '';

		for (const filename of files) {
			try {
				// Check if file exists and read its content
				const fs = await import('fs/promises');
				const path = await import('path');
				const filePath = path.resolve(filename);

				const stats = await fs.stat(filePath);
				if (stats.isFile()) {
					const content = await fs.readFile(filePath, 'utf-8');
					const lines = content.split('\n');

					// Create a synthetic diff showing all lines as added
					syntheticDiff += `diff --git a/${filename} b/${filename}\n`;
					syntheticDiff += `new file mode 100644\n`;
					syntheticDiff += `index 0000000..${this.generateDummyHash()}\n`;
					syntheticDiff += `--- /dev/null\n`;
					syntheticDiff += `+++ b/${filename}\n`;
					syntheticDiff += `@@ -0,0 +1,${lines.length} @@\n`;

					for (const line of lines) {
						syntheticDiff += `+${line}\n`;
					}
				}
			} catch (error) {
				// Skip files that can't be read
				console.warn(`Could not read file ${filename}:`, error);
			}
		}

		return syntheticDiff;
	}

	private generateDummyHash(): string {
		return 'f'.repeat(7);
	}

	async getCommitInfo(
		commitish: string
	): Promise<{ hash: string; message: string; author: string; date: string } | null> {
		try {
			const log = await this.git.log({ from: commitish, to: commitish, maxCount: 1 });
			const commit = log.latest;

			if (!commit) return null;

			return {
				hash: commit.hash,
				message: commit.message,
				author: commit.author_name,
				date: commit.date,
			};
		} catch (error) {
			console.error('Error getting commit info:', error);
			return null;
		}
	}
}
