export interface DiffLine {
	type: 'context' | 'added' | 'deleted';
	content: string;
	oldLineNumber?: number;
	newLineNumber?: number;
}

export interface DiffChunk {
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: DiffLine[];
}

export interface DiffFile {
	filename: string;
	oldFilename?: string;
	status: 'added' | 'modified' | 'deleted' | 'renamed';
	additions: number;
	deletions: number;
	chunks: DiffChunk[];
	isBinary?: boolean;
	isImage?: boolean;
}

export interface DiffResponse {
	files: DiffFile[];
	commit: string;
	isEmpty: boolean;
}
