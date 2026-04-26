/**
 * Code Executor Service
 * 
 * Handles safe code execution in sandboxed environments.
 * Currently configured for preview generation.
 * Can be extended for:
 * - Server-side code execution (Node.js)
 * - Test running
 * - Linting/formatting
 * - Build processes
 */

import { spawn } from 'child_process';
import { writeFilesToTemp, cleanupTempDir } from './fileSystem.js';

/**
 * Execute Node.js code safely
 * NOTE: This is a basic implementation. For production, use:
 * - VM2 library for sandboxing
 * - Docker containers
 * - Separate execution service
 */
export const executeNodeCode = async (code, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['-e', code], {
      timeout,
      env: { ...process.env, NODE_ENV: 'sandbox' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        reject({ success: false, error: stderr });
      }
    });

    child.on('error', (error) => {
      reject({ success: false, error: error.message });
    });

    // Kill if timeout
    setTimeout(() => {
      if (!child.killed) {
        child.kill();
        reject({ success: false, error: 'Execution timeout' });
      }
    }, timeout);
  });
};

/**
 * Run npm install in project directory
 */
export const installDependencies = async (files) => {
  const tempDir = await writeFilesToTemp(files);
  
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: tempDir,
      timeout: 60000 // 1 minute
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', async (code) => {
      await cleanupTempDir(tempDir);
      
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject({ success: false, error: output });
      }
    });
  });
};

/**
 * Build React/Vite project
 */
export const buildProject = async (files) => {
  const tempDir = await writeFilesToTemp(files);
  
  return new Promise((resolve, reject) => {
    // First install dependencies
    const install = spawn('npm', ['install'], { cwd: tempDir });
    
    install.on('close', (code) => {
      if (code !== 0) {
        cleanupTempDir(tempDir);
        return reject({ success: false, error: 'npm install failed' });
      }
      
      // Then build
      const build = spawn('npm', ['run', 'build'], { cwd: tempDir });
      
      let output = '';
      
      build.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      build.on('close', async (buildCode) => {
        const distPath = `${tempDir}/dist`;
        
        if (buildCode === 0) {
          resolve({ 
            success: true, 
            output,
            distPath 
          });
        } else {
          await cleanupTempDir(tempDir);
          reject({ success: false, error: output });
        }
      });
    });
  });
};

/**
 * Run ESLint on code
 */
export const lintCode = async (code, language = 'javascript') => {
  // Placeholder - would use actual ESLint
  const issues = [];
  
  // Basic checks
  if (code.includes('var ')) {
    issues.push({
      line: 0,
      message: 'Use const or let instead of var',
      severity: 'warning'
    });
  }
  
  if (code.includes('console.log') && process.env.NODE_ENV === 'production') {
    issues.push({
      line: 0,
      message: 'Remove console.log in production',
      severity: 'warning'
    });
  }
  
  return {
    success: true,
    issues,
    clean: issues.length === 0
  };
};

/**
 * Format code using Prettier
 */
export const formatCode = async (code, language = 'javascript') => {
  // Placeholder - would use actual Prettier
  // For now, just return the code as-is
  return {
    success: true,
    formatted: code
  };
};

/**
 * Validate JavaScript/TypeScript syntax
 */
export const validateSyntax = async (code, language = 'javascript') => {
  try {
    // Use Node.js's built-in syntax check
    await executeNodeCode(`
      const { parse } = require('acorn');
      parse(${JSON.stringify(code)}, { ecmaVersion: 2022 });
    `, 3000);
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message 
    };
  }
};

/**
 * Run tests (Jest/Vitest)
 */
export const runTests = async (files) => {
  const tempDir = await writeFilesToTemp(files);
  
  return new Promise((resolve, reject) => {
    const test = spawn('npm', ['test'], {
      cwd: tempDir,
      timeout: 30000
    });
    
    let output = '';
    
    test.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    test.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    test.on('close', async (code) => {
      await cleanupTempDir(tempDir);
      
      resolve({
        success: code === 0,
        output,
        passed: code === 0
      });
    });
  });
};

/**
 * Security: Scan code for potential vulnerabilities
 */
export const scanSecurity = async (code) => {
  const vulnerabilities = [];
  
  // Basic security checks
  const dangerousPatterns = [
    { pattern: /eval\(/, message: 'Avoid using eval()' },
    { pattern: /innerHTML\s*=/, message: 'XSS risk: Use textContent or sanitize HTML' },
    { pattern: /document\.write/, message: 'Avoid document.write' },
    { pattern: /\$\{.*process\.env/, message: 'Avoid exposing environment variables' }
  ];
  
  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      vulnerabilities.push({
        severity: 'warning',
        message
      });
    }
  });
  
  return {
    safe: vulnerabilities.length === 0,
    vulnerabilities
  };
};

/**
 * Get code metrics
 */
export const getCodeMetrics = (code) => {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0);
  const commentLines = lines.filter(line => 
    line.trim().startsWith('//') || 
    line.trim().startsWith('/*') ||
    line.trim().startsWith('*')
  );
  
  return {
    totalLines: lines.length,
    codeLines: nonEmptyLines.length,
    commentLines: commentLines.length,
    emptyLines: lines.length - nonEmptyLines.length,
    characters: code.length
  };
};

export default {
  executeNodeCode,
  installDependencies,
  buildProject,
  lintCode,
  formatCode,
  validateSyntax,
  runTests,
  scanSecurity,
  getCodeMetrics
};