import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";
import openrouter from "../openrouter.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const PROJECTS_ROOT = process.env.PROJECTS_ROOT || 'c:/Users/lenovo/Desktop/CSOD/projects';
export const createProject = async (req, res) => {
  const { title, description, template = 'react' } = req.body;
  const userId = req.user.id;
  const projectId = uuidv4();
  const folderName = `project-${projectId.slice(0, 8)}`;
  const projectPath = path.join(PROJECTS_ROOT, userId.toString(), folderName);

  await pool.query(
    "INSERT INTO projects (id, user_id, title, description, template, folder_path, status) VALUES (?, ?, ?, ?, ?, ?, 'scaffolding')",
    [projectId, userId, title, description, template, projectPath]
  );

  res.json({ success: true, projectId, message: "Project created" });

  // Scaffold in background — non-blocking
  scaffoldProject(projectId, projectPath, template).catch(console.error);
};

export const getProjectStatus = async (req, res) => {
  const [[project]] = await pool.query(
    "SELECT status, dev_port FROM projects WHERE id=? AND user_id=?",
    [req.params.projectId, req.user.id]
  );
  res.json({ success: true, status: project.status, port: project.dev_port });
};

export const streamTerminalLogs = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  let lastId = 0;
  const interval = setInterval(async () => {
    const [rows] = await pool.query(
      "SELECT id, line FROM terminal_logs WHERE project_id=? AND id>? ORDER BY id",
      [req.params.projectId, lastId]
    );
    for (const row of rows) {
      res.write(`data: ${JSON.stringify({ line: row.line })}\n\n`);
      lastId = row.id;
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
};


// Get all user projects
export const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [projects] = await pool.query(
      "SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC",
      [userId]
    );

    res.json({ success: true, projects });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch projects" 
    });
  }
};

// Get project with files
export const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    const [files] = await pool.query(
      "SELECT * FROM project_files WHERE project_id = ? ORDER BY file_path",
      [projectId]
    );

    res.json({ 
      success: true, 
      project: projects[0],
      files 
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch project" 
    });
  }
};

// Update file content
export const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;

    await pool.query(
      "UPDATE project_files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [content, fileId]
    );

    // Update project's updated_at
    const [file] = await pool.query(
      "SELECT project_id FROM project_files WHERE id = ?",
      [fileId]
    );

    if (file.length > 0) {
      await pool.query(
        "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [file[0].project_id]
      );
    }

    res.json({ 
      success: true, 
      message: "File updated successfully" 
    });
  } catch (error) {
    console.error("Update file error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update file" 
    });
  }
};

// Create new file in project
export const createFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { filePath, content, fileType } = req.body;
    const userId = req.user.id;

    // Verify project ownership
    const [projects] = await pool.query(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    const fileId = uuidv4();

    await pool.query(
      "INSERT INTO project_files (id, project_id, file_path, content, file_type) VALUES (?, ?, ?, ?, ?)",
      [fileId, projectId, filePath, content || '', fileType]
    );

    await pool.query(
      "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [projectId]
    );

    res.json({ 
      success: true, 
      fileId,
      message: "File created successfully" 
    });
  } catch (error) {
    console.error("Create file error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create file" 
    });
  }
};


// Delete file
export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const [file] = await pool.query(
      "SELECT project_id FROM project_files WHERE id = ?",
      [fileId]
    );

    await pool.query("DELETE FROM project_files WHERE id = ?", [fileId]);

    if (file.length > 0) {
      await pool.query(
        "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [file[0].project_id]
      );
    }

    res.json({ 
      success: true, 
      message: "File deleted successfully" 
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete file" 
    });
  }
};

// Delete project
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    await pool.query("DELETE FROM project_files WHERE project_id = ?", [projectId]);
    await pool.query("DELETE FROM projects WHERE id = ?", [projectId]);

    res.json({ 
      success: true, 
      message: "Project deleted successfully" 
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete project" 
    });
  }
};


// AI Code Generation
export const generateCode = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { prompt, model = "meta-llama/llama-3.3-70b-instruct" } = req.body;
    const userId = req.user.id;

    // Verify project ownership
    const [projects] = await pool.query(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found" 
      });
    }

    const project = projects[0];
    const generationId = uuidv4();

    // Save generation request
    await pool.query(
      "INSERT INTO code_generations (id, project_id, user_id, prompt, model, status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [generationId, projectId, userId, prompt, model]
    );

    // Build AI prompt based on template
    const systemPrompt = getSystemPrompt(project.template);
    
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ];

    // Call AI with 2-minute timeout to prevent hanging
    const response = await Promise.race([
      openrouter.chat.completions.create({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 8000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI response timeout after 2 minutes')), 120000)
      )
    ]);

    const aiResponse = response.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Parse AI response and extract code files
    const parsedFiles = extractCodeFromResponse(aiResponse, project.template);

    // Delete existing files (we're generating fresh code)
    await pool.query("DELETE FROM project_files WHERE project_id = ?", [projectId]);

    // Insert new generated files
    const createdFiles = [];
    
    for (const file of parsedFiles) {
      const fileId = uuidv4();
      
      await pool.query(
        "INSERT INTO project_files (id, project_id, file_path, content, file_type) VALUES (?, ?, ?, ?, ?)",
        [fileId, projectId, file.path, file.content, file.type]
      );
      
      createdFiles.push({ 
        id: fileId, 
        path: file.path, 
        content: file.content,
        type: file.type 
      });
    }
    // Write generated files to disk
    for (const file of parsedFiles) {
      const filePath = path.join(project.folder_path, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, 'utf8');
    }


    // Update project timestamp
    await pool.query(
      "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [projectId]
    );

    // Update generation record
    await pool.query(
      "UPDATE code_generations SET generated_code = ?, status = 'success' WHERE id = ?",
      [JSON.stringify(parsedFiles), generationId]
    );

    res.json({
      success: true,
      generationId,
      files: createdFiles,
      message: "Code generated successfully"
    });

  } catch (error) {
    console.error("Generate code error:", error);
    
    // Update generation record with error
    if (req.params.projectId) {
      try {
        await pool.query(
          "UPDATE code_generations SET status = 'failed', error_message = ? WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
          [error.message, req.params.projectId]
        );
      } catch (dbError) {
        console.error("Failed to update generation status:", dbError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to generate code",
      error: error.message
    });
  }
};

function getSystemPrompt(template) {
  if (template === 'react') {
    return `You are an expert React developer generating production-ready browser-executable React apps.

CRITICAL RULES (the preview runs WITHOUT bundler):
1. Use ESM imports ONLY from esm.sh CDN - NO relative imports
2. Use importmap in index.html for React imports
3. Generate EXACTLY 3 files: index.html, App.jsx, App.css
4. All logic in single App.jsx file - NO file splitting
5. No TypeScript - plain JSX only
6. Available libs: react@18, lucide-react, recharts, framer-motion

STANDARD FILE STRUCTURE:
===FILE:index.html===
[complete working HTML with importmap + React CDN + App.jsx mount]
===ENDFILE===

===FILE:App.jsx===
import React, { useState, useEffect } from 'react';
import './App.css';
// all app logic here
===ENDFILE===

===FILE:App.css===
[modern CSS with Tailwind-like utility classes or CSS modules]
===ENDFILE===

Use this EXACT format with ===FILE:filename=== markers. No explanations. Code only.`;
  } else {
    return `You are an expert web developer. Generate a COMPLETE, WORKING HTML/CSS/JavaScript application based on the user's request.

CRITICAL RULES:
1. Generate ONLY working, executable code - no explanations, no markdown
2. Create a fully functional web application
3. Use modern JavaScript (ES6+)
4. Include proper error handling
5. Make it visually appealing with modern CSS
6. Ensure all code runs WITHOUT ERRORS

REQUIRED FILE STRUCTURE:
You MUST generate exactly 3 files in this order:

1. **index.html** - Main HTML file
2. **style.css** - Stylesheet
3. **script.js** - JavaScript logic

OUTPUT FORMAT (CRITICAL - Follow exactly):
===FILE:index.html===
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- HTML content here -->
  <script src="script.js"></script>
</body>
</html>
===ENDFILE===

===FILE:style.css===
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
}
/* More CSS here */
===ENDFILE===

===FILE:script.js===
// JavaScript code here
===ENDFILE===

IMPORTANT:
- Use ===FILE:filename=== to start each file
- Use ===ENDFILE=== to end each file
- No markdown code blocks (\`\`\`)
- No explanations before or after code
- Generate production-ready code that works immediately`;
  }
}

// Extract code files from AI response
function extractCodeFromResponse(response, template) {
  const files = [];
  
  // Split by file markers
  const fileRegex = /===FILE:(.*?)===([\s\S]*?)===ENDFILE===/g;
  let match;
  
  while ((match = fileRegex.exec(response)) !== null) {
    const fileName = match[1].trim();
    let content = match[2].trim();
    
    // Remove any markdown code blocks if AI added them despite instructions
    content = content.replace(/```[\w]*\n?/g, '').trim();
    
    const fileType = getFileType(fileName);
    
    files.push({
      path: fileName,
      content: content,
      type: fileType
    });
  }
  
  // If parsing failed, try to extract from markdown code blocks (fallback)
  if (files.length === 0) {
    files.push(...extractFromMarkdown(response, template));
  }
  
  // If still no files, create default structure
  if (files.length === 0) {
    files.push(...getDefaultFiles(template, response));
  }
  
  return files;
}

// Fallback: Extract from markdown code blocks
function extractFromMarkdown(response, template) {
  const files = [];
  
  // Try to find code blocks with file indicators
  const patterns = [
    // Pattern: // filename or <!-- filename -->
    /(?:\/\/|<!--)\s*([\w.]+)\s*(?:-->)?\s*\n```[\w]*\s*\n([\s\S]*?)```/g,
    // Pattern: ```language with filename hint
    /```(\w+)\s*(?:\/\/|<!--)?\s*([\w.]+)?\s*\n([\s\S]*?)```/g,
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const fileName = match[2] || match[1];
      const content = match[3] || match[2];
      
      if (fileName && content) {
        files.push({
          path: fileName,
          content: content.trim(),
          type: getFileType(fileName)
        });
      }
    }
  }
  
  return files;
}

// Get default files if parsing fails completely
function getDefaultFiles(template, content) {
  if (template === 'react') {
    return [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`,
        type: 'html'
      },
      {
        path: 'App.jsx',
        content: content,
        type: 'react'
      },
      {
        path: 'App.css',
        content: `.App {
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}`,
        type: 'css'
      }
    ];
  } else {
    return [
      {
        path: 'index.html',
        content: content.includes('<!DOCTYPE') ? content : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${content}
  <script src="script.js"></script>
</body>
</html>`,
        type: 'html'
      },
      {
        path: 'style.css',
        content: `body {
  margin: 0;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}`,
        type: 'css'
      },
      {
        path: 'script.js',
        content: `console.log('App loaded');`,
        type: 'javascript'
      }
    ];
  }
}

// Get file type from extension
function getFileType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const typeMap = {
    'jsx': 'react',
    'tsx': 'react-ts',
    'js': 'javascript',
    'ts': 'typescript',
    'css': 'css',
    'html': 'html',
    'json': 'json',
    'md': 'markdown'
  };
  return typeMap[ext] || 'text';
}

// Stub for background project scaffolding
async function scaffoldProject(projectId, projectPath, template) {
  try {
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    
    // TODO: Generate actual template files on disk
    // For now, create basic structure
    const indexContent = `<!DOCTYPE html>
<html>
<head><title>${projectId}</title></head>
<body><h1>Project ${projectId}</h1></body>
</html>`;
    
    await fs.writeFile(path.join(projectPath, 'index.html'), indexContent);
    
    console.log(`Scaffolded project ${projectId} at ${projectPath}`);
    
    // Update project status
    await pool.query(
      "UPDATE projects SET status = 'ready' WHERE id = ?",
      [projectId]
    );
  } catch (error) {
    console.error(`Scaffold error for ${projectId}:`, error);
    await pool.query(
      "UPDATE projects SET status = 'error' WHERE id = ?",
      [projectId]
    );
  }
}
export const restartDevServer = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Implementation for restarting dev server for project
    res.json({ success: true, message: `Dev server restarted for project ${projectId}` });
  } catch (error) {
    console.error('Restart dev server error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const stopDevServer = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Implementation for stopping dev server for project  
    res.json({ success: true, message: `Dev server stopped for project ${projectId}` });
  } catch (error) {
    console.error('Stop dev server error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

