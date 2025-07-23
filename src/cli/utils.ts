import * as readline from 'readline';
import { type SimpleGit } from 'simple-git';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDiffArguments(
  target: string,
  compareWith?: string
): ValidationResult {
  // Allow special arguments
  const specialArgs = ['working', 'staged', '.'];
  
  if (specialArgs.includes(target)) {
    return { valid: true };
  }

  // Basic validation for commit-ish strings
  if (!target || target.trim() === '') {
    return { valid: false, error: 'Target commit cannot be empty' };
  }

  if (compareWith !== undefined && (!compareWith || compareWith.trim() === '')) {
    return { valid: false, error: 'Compare-with commit cannot be empty' };
  }

  return { valid: true };
}

export function shortHash(hash: string): string {
  return hash.substring(0, 7);
}

export function createCommitRangeString(target: string, base: string): string {
  if (target === 'working') {
    return 'Working Directory (unstaged changes)';
  }
  if (target === 'staged') {
    return `${shortHash(base)} vs Staging Area (staged changes)`;
  }
  if (target === '.') {
    return `${shortHash(base)} vs Working Directory (all uncommitted changes)`;
  }
  return `${shortHash(base)}..${shortHash(target)}`;
}

export async function findUntrackedFiles(git: SimpleGit): Promise<string[]> {
  try {
    const status = await git.status();
    return status.not_added.filter(file => !file.startsWith('.'));
  } catch (error) {
    console.error('Error checking for untracked files:', error);
    return [];
  }
}

export async function markFilesIntentToAdd(git: SimpleGit, files: string[]): Promise<void> {
  try {
    await git.raw(['add', '--intent-to-add', ...files]);
  } catch (error) {
    throw new Error(`Failed to add files with --intent-to-add: ${error}`);
  }
}

export async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      const normalizedAnswer = answer.toLowerCase().trim();
      resolve(normalizedAnswer === '' || normalizedAnswer === 'y' || normalizedAnswer === 'yes');
    });
  });
}