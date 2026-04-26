import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import type { ProjectFile } from '../types/project';
import { Save, X } from 'lucide-react';

interface CodeEditorProps {
  file: ProjectFile | null;
  onSave: (fileId: string, content: string) => Promise<void>;
  onClose: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ file, onSave, onClose }) => {
  const [content, setContent] = useState(file?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    if (!file) return;
    setIsSaving(true);
    try {
      await onSave(file.id, content);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (value: string | undefined) => {
    setContent(value || '');
    setHasChanges(value !== file?.content);
  };

  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown'
    };
    return langMap[ext || ''] || 'plaintext';
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a file to edit
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <span className="text-sm text-gray-300">{file.file_path}</span>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            <X size={16} />
            Close
          </button>
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.file_path)}
          value={content}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
};