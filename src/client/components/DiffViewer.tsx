import React from 'react';
import { type DiffFile, type DiffChunk, type DiffLine } from '../../types/diff.js';

interface DiffViewerProps {
  file: DiffFile;
}

interface DiffChunkProps {
  chunk: DiffChunk;
}

interface DiffLineProps {
  line: DiffLine;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ file }) => {
  if (file.isBinary) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <FileHeader file={file} />
        <div className="px-6 py-12 text-center text-gray-500">
          <div className="text-lg font-medium mb-2">Binary file</div>
          <div className="text-sm">
            {file.isImage ? 'Image files cannot be displayed in diff view' : 'Binary files cannot be displayed'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <FileHeader file={file} />
      
      {file.chunks.length > 0 ? (
        <div className="font-mono text-sm">
          {file.chunks.map((chunk, index) => (
            <DiffChunkComponent key={index} chunk={chunk} />
          ))}
        </div>
      ) : (
        <div className="px-8 py-16 text-center text-gray-500">
          <div className="text-lg font-medium">No changes to display</div>
          <div className="text-sm mt-2">This file exists but has no differences</div>
        </div>
      )}
    </div>
  );
};

const FileHeader: React.FC<{ file: DiffFile }> = ({ file }) => {
  const getStatusBadge = (status: DiffFile['status']) => {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-semibold';
    
    switch (status) {
      case 'added':
        return `${baseClasses} bg-green-100 text-green-600`;
      case 'deleted':
        return `${baseClasses} bg-red-100 text-red-600`;
      case 'modified':
        return `${baseClasses} bg-blue-100 text-blue-600`;
      case 'renamed':
        return `${baseClasses} bg-purple-100 text-purple-600`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-500`;
    }
  };

  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-base">{file.filename}</h3>
          {file.oldFilename && file.oldFilename !== file.filename && (
            <span className="text-sm text-gray-500 font-mono">← {file.oldFilename}</span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <span className={getStatusBadge(file.status)}>
            {file.status}
          </span>
          
          <div className="flex items-center gap-3 text-sm">
            {file.additions > 0 && (
              <span className="text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-md">
                +{file.additions}
              </span>
            )}
            {file.deletions > 0 && (
              <span className="text-red-600 font-semibold bg-red-100 px-2 py-1 rounded-md">
                −{file.deletions}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DiffChunkComponent: React.FC<DiffChunkProps> = ({ chunk }) => {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="bg-gray-100 px-6 py-3 text-sm text-gray-500 border-b border-gray-100 font-mono">
        @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
      </div>
      
      <table className="w-full">
        <tbody>
          {chunk.lines.map((line, index) => (
            <DiffLineComponent key={index} line={line} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DiffLineComponent: React.FC<DiffLineProps> = ({ line }) => {
  const getLineClasses = () => {
    switch (line.type) {
      case 'added':
        return 'bg-green-100 hover:bg-opacity-75';
      case 'deleted':
        return 'bg-red-100 hover:bg-opacity-75';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const getLinePrefix = () => {
    switch (line.type) {
      case 'added':
        return '+';
      case 'deleted':
        return '−';
      default:
        return ' ';
    }
  };

  const getPrefixColor = () => {
    switch (line.type) {
      case 'added':
        return 'text-green-600';
      case 'deleted':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <tr className={`group transition-colors ${getLineClasses()}`}>
      {/* Old line number */}
      <td className="w-16 px-3 py-1 text-right text-xs text-gray-500 select-none border-r border-gray-100 bg-gray-100">
        {line.oldLineNumber || ''}
      </td>
      
      {/* New line number */}
      <td className="w-16 px-3 py-1 text-right text-xs text-gray-500 select-none border-r border-gray-100 bg-gray-100">
        {line.newLineNumber || ''}
      </td>
      
      {/* Line content */}
      <td className="px-4 py-1 whitespace-pre-wrap break-all">
        <span className={`${getPrefixColor()} mr-2 font-bold`}>{getLinePrefix()}</span>
        <span>{line.content}</span>
      </td>
    </tr>
  );
};