
import Editor from '@monaco-editor/react';
import type { FileNode } from './fileTree';

interface CodeViewerProps {
  file: FileNode | null;  // The currently selected file
}

export function CodeEditor({ file }: CodeViewerProps) {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a file to view its contents
      </div>
    );
  }
  
  // Detect language from file extension
  const getLanguage = (fileName: string) => {
    if (fileName.endsWith('.jsx') || fileName.endsWith('.js')) return 'javascript';
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return 'typescript';
    if (fileName.endsWith('.css')) return 'css';
    if (fileName.endsWith('.html')) return 'html';
    if (fileName.endsWith('.json')) return 'json';
    return 'plaintext';
  };
  
  return (
    <div className="h-full w-full">
      {/* <div className="bg-gray-800 text-white px-4 py-2 border-b border-gray-700">
        {file.name}
      </div> */}
      
      <Editor
        height="90vh"
        language={getLanguage(file.name)}
        theme="vs-dark"
        value={file.content || ''}
        options={{
          readOnly: true,         
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          automaticLayout: true,
        }}
      />
    </div>
  );
}