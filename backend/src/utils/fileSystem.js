/**
 * File System Utilities
 * 
 * Helper functions for managing virtual file system operations.
 * Currently using database storage, but can be extended for:
 * - Temporary file exports
 * - Archive creation (zip downloads)
 * - File validation
 */

import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validate file path
 * Prevents directory traversal attacks
 */
export const validatePath = (filePath) => {
  // Remove any path traversal attempts
  const normalized = path.normalize(filePath);
  
  if (normalized.includes('..') || normalized.startsWith('/')) {
    return normalized.replace(/\.\./g, '').replace(/^\//, '');
  }
  
  return normalized;
};

/**
 * Get file extension
 */
export const getExtension = (filename) => {
  return path.extname(filename).toLowerCase().replace('.', '');
};

/**
 * Determine language from file extension
 */
export const getLanguageFromExtension = (filename) => {
  const ext = getExtension(filename);
  
  const languageMap = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    
    // Web
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    
    // Data
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    
    // Markup
    md: 'markdown',
    mdx: 'markdown',
    
    // Config
    env: 'plaintext',
    gitignore: 'plaintext',
    
    // Other
    svg: 'xml',
    txt: 'plaintext'
  };
  
  return languageMap[ext] || 'plaintext';
};

/**
 * Create a temporary directory for file operations
 */
export const createTempDir = async () => {
  const tempPath = path.join(process.cwd(), 'temp', uuidv4());
  await fs.mkdir(tempPath, { recursive: true });
  return tempPath;
};

/**
 * Write files to temporary directory
 * Useful for creating archives or running build tools
 */
export const writeFilesToTemp = async (files) => {
  const tempDir = await createTempDir();
  
  for (const file of files) {
    const filePath = path.join(tempDir, file.path);
    const fileDir = path.dirname(filePath);
    
    // Create directory if needed
    await fs.mkdir(fileDir, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, file.content, 'utf-8');
  }
  
  return tempDir;
};

/**
 * Clean up temporary directory
 */
export const cleanupTempDir = async (tempDir) => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to cleanup temp dir:', error);
  }
};

/**
 * Validate file content size
 */
export const validateFileSize = (content, maxSizeMB = 5) => {
  const sizeInMB = Buffer.byteLength(content, 'utf-8') / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
};

/**
 * Sanitize filename
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * Build file tree structure from flat file list
 */
export const buildFileTree = (files) => {
  const tree = {};
  
  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = tree;
    
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 
          ? { ...file, isFile: true } 
          : {};
      }
      current = current[part];
    });
  });
  
  return tree;
};

/**
 * Export project as JSON
 */
export const exportProjectAsJSON = (project, files) => {
  return JSON.stringify({
    project: {
      name: project.name,
      description: project.description,
      template: project.template,
      created_at: project.created_at
    },
    files: files.map(f => ({
      path: f.path,
      content: f.content,
      language: f.language
    }))
  }, null, 2);
};

export default {
  validatePath,
  getExtension,
  getLanguageFromExtension,
  createTempDir,
  writeFilesToTemp,
  cleanupTempDir,
  validateFileSize,
  sanitizeFilename,
  buildFileTree,
  exportProjectAsJSON
};