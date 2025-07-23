import React from 'react';
import { type DiffFile } from '../../types/diff.js';

interface FileListProps {
  files: DiffFile[];
  selectedFile: string | null;
  onFileSelect: (filename: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, selectedFile, onFileSelect }) => {
  const getStatusColor = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return 'text-green-600';
      case 'deleted':
        return 'text-red-600';
      case 'modified':
        return 'text-blue-600';
      case 'renamed':
        return 'text-purple-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: DiffFile['status']) => {
    switch (status) {
      case 'added':
        return '+';
      case 'deleted':
        return '−';
      case 'modified':
        return 'M';
      case 'renamed':
        return 'R';
      default:
        return '?';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200">
        <h2 className="font-semibold text-base">Files changed</h2>
        <div className="text-sm text-gray-500 mt-1">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="divide-y divide-gray-100">
        {files.map((file) => (
          <button
            key={file.filename}
            className={`w-full px-5 py-4 text-left hover:bg-gray-50 transition-all duration-150 group ${
              selectedFile === file.filename ? 'bg-gray-100 border-r-3 border-gray-900' : ''
            }`}
            onClick={() => onFileSelect(file.filename)}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-sm font-mono font-bold ${getStatusColor(file.status)} bg-gray-50 px-2 py-0.5 rounded-md`}>
                {getStatusIcon(file.status)}
              </span>
              <span className="text-sm font-medium truncate group-hover:text-gray-900 transition-colors">
                {file.filename}
              </span>
            </div>
            
            {file.oldFilename && file.oldFilename !== file.filename && (
              <div className="text-xs text-gray-500 mb-2 ml-8">
                ← {file.oldFilename}
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs ml-8">
              {file.additions > 0 && (
                <span className="text-green-600 font-medium">
                  +{file.additions}
                </span>
              )}
              {file.deletions > 0 && (
                <span className="text-red-600 font-medium">
                  −{file.deletions}
                </span>
              )}
              {file.isBinary && (
                <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">Binary</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};