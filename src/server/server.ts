import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { serve } from '@hono/node-server';
import path from 'node:path';
import fs from 'node:fs';
import open from 'open';
import { fileURLToPath } from 'url';
import { GitDiffParser } from './git-diff.js';
import type { DiffFile } from '../types/diff.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerOptions {
	targetCommitish: string;
	baseCommitish: string;
	preferredPort?: number;
	host?: string;
	openBrowser?: boolean;
	mode?: string;
	clearComments?: boolean;
}

interface ServerResult {
	url: string;
	port: number;
	isEmpty: boolean;
}

export async function startServer(options: ServerOptions): Promise<ServerResult> {
	const {
		targetCommitish,
		baseCommitish,
		preferredPort = 3000,
		host = '127.0.0.1',
		openBrowser = true,
	} = options;

	const app = new Hono();
	const gitDiffParser = new GitDiffParser();

	// Parse the diff data
	const diffData = await gitDiffParser.parseDiff(targetCommitish, baseCommitish);

	// API Routes
	app.get('/api/diff', (c) => {
		return c.json(diffData);
	});

	app.get('/api/health', (c) => {
		return c.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	// Comments API (placeholder for future implementation)
	app.get('/api/comments', (c) => {
		return c.json([]);
	});

	app.post('/api/comments', (c) => {
		// TODO: Implement comment storage
		return c.json({ success: true });
	});

	app.get('/api/comments-output', (c) => {
		// TODO: Implement comment output for CLI
		return c.text('');
	});

	// Serve static files
	app.use('/*', serveStatic({ root: path.join(__dirname, '../client') }));

	// Catch-all route for React SPA
	app.get('*', (c) => {
		if (process.env.NODE_ENV === 'development') {
			// In development, redirect to Vite dev server
			return c.redirect(`http://localhost:5173${c.req.path}`);
		} else {
			// In production, serve the built files
			const indexPath = path.join(__dirname, '../client/index.html');
			try {
				const html = fs.readFileSync(indexPath, 'utf-8');
				return c.html(html);
			} catch {
				return c.notFound();
			}
		}
	});

	// Find available port
	const port = await findAvailablePort(preferredPort);
	const displayHost = host === '127.0.0.1' || !host ? 'localhost' : host;
	const url = `http://${displayHost}:${port}`;

	return new Promise((resolve) => {
		serve({
			fetch: app.fetch,
			port,
			hostname: host,
		});

		// Open browser after server starts
		if (openBrowser && !diffData.isEmpty) {
			open(url).catch((err) => {
				console.warn('Failed to open browser:', err.message);
			});
		}

		resolve({
			url,
			port,
			isEmpty: diffData.isEmpty,
		});

		// Graceful shutdown
		const shutdown = () => {
			process.exit(0);
		};

		process.on('SIGINT', shutdown);
		process.on('SIGTERM', shutdown);
	});
}

async function findAvailablePort(preferredPort: number): Promise<number> {
	const net = await import('net');

	return new Promise((resolve, reject) => {
		const server = net.createServer();

		server.listen(preferredPort, () => {
			const address = server.address();
			const actualPort = address && typeof address === 'object' ? address.port : preferredPort;
			server.close(() => {
				resolve(actualPort);
			});
		});

		server.on('error', (err: { code: string }) => {
			if (err.code === 'EADDRINUSE') {
				// Port is in use, try next port
				resolve(findAvailablePort(preferredPort + 1));
			} else {
				reject(err);
			}
		});
	});
}

// Standalone function for testing
export async function createApp(
	targetCommitish: string,
	baseCommitish: string
): Promise<{ app: Hono; diffData: DiffFile[] }> {
	const app = new Hono();
	const gitDiffParser = new GitDiffParser();

	const diffResponse = await gitDiffParser.parseDiff(targetCommitish, baseCommitish);
	const diffData = diffResponse.files;

	app.get('/api/diff', (c) => {
		return c.json(diffData);
	});

	app.get('/api/health', (c) => {
		return c.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	return { app, diffData };
}
