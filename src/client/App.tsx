import React, { useState, useEffect } from 'react';
import { DiffViewer } from './components/DiffViewer';
import { FileList } from './components/FileList';
import { type DiffResponse } from '../types/diff.js';

const App: React.FC = () => {
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    loadDiffs();
  }, []);

  const loadDiffs = async () => {
    try {
      const response = await fetch('/api/diff');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DiffResponse = await response.json();
      setDiffData(data);
      
      // Auto-select first file if available
      if (data.files.length > 0) {
        setSelectedFile(data.files[0].filename);
      }
    } catch (err) {
      setError('Error loading diffs');
      console.error('Error loading diffs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading diff...</div>
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-lg font-medium">{error}</div>
          <button 
            onClick={loadDiffs}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-9 px-4 py-2 mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!diffData || diffData.isEmpty) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No differences found</div>
          <div className="mt-2">The selected commits have no differences to display.</div>
        </div>
      </div>
    );
  }

  const selectedFileData = diffData.files.find(f => f.filename === selectedFile);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Compeek</h1>
              <div className="text-sm text-gray-500 mt-1 font-mono">
                {diffData.commit}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                {diffData.files.length} file{diffData.files.length !== 1 ? 's' : ''} changed
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* File List Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-28">
              <FileList
                files={diffData.files}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />
            </div>
          </div>

          {/* Diff Viewer */}
          <div className="col-span-12 lg:col-span-8">
            {selectedFileData ? (
              <DiffViewer file={selectedFileData} />
            ) : (
              <div className="text-center text-gray-500 py-16">
                <div className="text-lg font-medium">Select a file to view its diff</div>
                <div className="text-sm mt-2">Choose from the list on the left to get started</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;