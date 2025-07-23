#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Starting development servers...\n');

// Start Vite dev server for the client (silently)
const viteProcess = spawn('npx', ['vite', '--silent'], {
	cwd: rootDir,
	stdio: 'ignore',
	shell: true,
});

// Build and start CLI in development mode
const cliProcess = spawn('npm', ['run', 'dev:cli'], {
	cwd: rootDir,
	stdio: 'inherit',
	shell: true,
});

// Handle process cleanup
const cleanup = () => {
	console.log('\nShutting down development servers...');
	viteProcess.kill();
	cliProcess.kill();
	process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process exits
viteProcess.on('exit', (code) => {
	if (code !== 0) {
		console.error(`Vite process exited with code ${code}`);
	}
});

cliProcess.on('exit', (code) => {
	if (code !== 0) {
		console.error(`CLI process exited with code ${code}`);
	}
});
