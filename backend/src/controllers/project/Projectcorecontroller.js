import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import pool from '../../config/db.js';
// import dockerService from '../service/dockerService.js';
import dockerService from '../../service/dockerService.js';

// const PROJECTS_ROOT = process.env.PROJECTS_ROOT || "c:/Users/lenovo/Desktop/CSOD/projects";
const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), 'projects');

// ── Helpers ──────────────────────────────────────────────────

async function appendTerminalLog(projectId, text) {
  // Split on newlines so each line is its own DB row (cleaner SSE streaming)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  for (const line of lines) {
    await pool.query(
      'INSERT INTO terminal_logs (project_id, line) VALUES (?, ?)',
      [projectId, line]
    );
  }
}

// ── Project CRUD ─────────────────────────────────────────────

export const createProject = async (req, res) => {
  try {
    const { title, description = '', template = 'react' } = req.body;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Project title is required' });
    }

    const projectId = uuidv4();
    const folderPath = path.join(PROJECTS_ROOT, userId.toString(), `project-${projectId.slice(0, 8)}`);

    await pool.query(
      `INSERT INTO projects (id, user_id, title, description, template, folder_path, status)
       VALUES (?, ?, ?, ?, ?, ?, 'scaffolding')`,
      [projectId, userId, title, description, template, folderPath]
    );

    res.status(201).json({
      success: true,
      projectId,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error('createProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
  }
};

export const getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ success: true, projects });
  } catch (error) {
    console.error('getUserProjects error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const [files] = await pool.query(
      'SELECT * FROM project_files WHERE project_id = ? ORDER BY file_path',
      [projectId]
    );

    res.json({ success: true, project: projects[0], files });
  } catch (error) {
    console.error('getProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project', error: error.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projects[0];

    // Kill dev server if running
    // if (project.dev_pid) {
    //   try { process.kill(project.dev_pid, 'SIGTERM'); } catch (_) {}
    // }
    await dockerService.stopProject(projectId).catch(() => {});

    // Remove files from disk
    if (project.folder_path) {
      try {
        await fs.rm(project.folder_path, { recursive: true, force: true });
      } catch (_) {}
    }

    // Clean up DB 
    await pool.query('DELETE FROM terminal_logs WHERE project_id = ?', [projectId]);
    await pool.query('DELETE FROM project_files WHERE project_id = ?', [projectId]);
    await pool.query('DELETE FROM code_generations WHERE project_id = ?', [projectId]);
    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete project', error: error.message });
  }
};

export const getProjectStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT id, status, dev_port, dev_pid, updated_at FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projects[0];

    // Check if PID is alive
    // let isRunning = false;
    // if (project.dev_pid) {
    //   try {
    //     process.kill(project.dev_pid, 0);
    //     isRunning = true;
    //   } catch (_) {
    //     isRunning = false;
    //   }
    // }
    const isRunning = dockerService.getPort(projectId) !== undefined;

    res.json({
      success: true,
      status: project.status,
      isRunning,
      dev_port: project.dev_port,
      previewUrl: project.dev_port ? `http://localhost:${project.dev_port}` : null,
      updated_at: project.updated_at,
    });
  } catch (error) {
    console.error('getProjectStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to get status', error: error.message });
  }
};

// ── Terminal Logs SSE ────────────────────────────────────────

export const streamTerminalLogs = async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user.id;

  const [projects] = await pool.query(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );

  if (projects.length === 0) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (line) => {
    res.write(`data: ${JSON.stringify({ line })}\n\n`);
  };

  // Send backlog
  let lastId = 0;
  try {
    const [rows] = await pool.query(
      'SELECT id, line FROM terminal_logs WHERE project_id = ? ORDER BY id ASC',
      [projectId]
    );
    rows.forEach(r => {
      send(r.line);
      lastId = r.id;
    });
  } catch (err) {
    console.error('backlog error:', err);
  }

  // Poll new lines
  const interval = setInterval(async () => {
    try {
      const [rows] = await pool.query(
        'SELECT id, line FROM terminal_logs WHERE project_id = ? AND id > ? ORDER BY id ASC',
        [projectId, lastId]
      );
      rows.forEach(r => {
        send(r.line);
        lastId = r.id;
      });
    } catch (err) {
      console.error('poll error:', err);
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
};

// ── File CRUD ───────────────────────────────────────────────

export const createFile = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { file_path, content = '', file_type = 'text' } = req.body;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT folder_path FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projects[0];
    const fileId = uuidv4();

    await pool.query(
      'INSERT INTO project_files (id, project_id, file_path, content, file_type) VALUES (?, ?, ?, ?, ?)',
      [fileId, projectId, file_path, content, file_type]
    );

    // Disk write
    if (project.folder_path) {
      const fullPath = path.join(project.folder_path, file_path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    await pool.query('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [projectId]);

    res.status(201).json({
      success: true,
      file: { id: fileId, project_id: projectId, file_path, content, file_type }
    });
  } catch (error) {
    console.error('createFile error:', error);
    res.status(500).json({ success: false, message: 'Failed to create file' });
  }
};

export const updateFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const [files] = await pool.query(
      `SELECT pf.*, p.folder_path FROM project_files pf
       JOIN projects p ON p.id = pf.project_id 
       WHERE pf.id = ? AND p.user_id = ?`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = files[0];

    await pool.query('UPDATE project_files SET content = ? WHERE id = ?', [content, fileId]);

    // Disk write
    if (file.folder_path) {
      const fullPath = path.join(file.folder_path, file.file_path);
      await fs.writeFile(fullPath, content, 'utf8');
    }

    await pool.query('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [file.project_id]);

    res.json({ success: true, file: { ...file, content } });
  } catch (error) {
    console.error('updateFile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update file' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const [files] = await pool.query(
      `SELECT pf.*, p.folder_path FROM project_files pf
       JOIN projects p ON p.id = pf.project_id 
       WHERE pf.id = ? AND p.user_id = ?`,
      [fileId, userId]
    );

    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = files[0];

    await pool.query('DELETE FROM project_files WHERE id = ?', [fileId]);

    // Disk delete
    if (file.folder_path) {
      try {
        await fs.unlink(path.join(file.folder_path, file.file_path));
      } catch (_) {}
    }

    await pool.query('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [file.project_id]);

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('deleteFile error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
};

// ── Dev Server ───────────────────────────────────────────────

export const restartDevServer = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projects[0];

    if (!project.folder_path) {
      return res.status(400).json({ success: false, message: 'No project folder' });
    }

    // Kill existing
    // if (project.dev_pid) {
    //   try { process.kill(project.dev_pid, 'SIGTERM'); } catch (_) {}
    // }
    await dockerService.stopProject(projectId).catch(() => {});

    await appendTerminalLog(projectId, '--- Restarting dev server ---');

    const proc = spawn('npm', ['run', 'dev'], {
      cwd: project.folder_path,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    proc.unref();

    proc.stdout.on('data', d => appendTerminalLog(projectId, d.toString()));
    proc.stderr.on('data', d => appendTerminalLog(projectId, d.toString()));

    await pool.query(
      "UPDATE projects SET dev_pid = ?, status = 'running' WHERE id = ?",
      [proc.pid, projectId]
    );

    res.json({ success: true, message: 'Dev server restarted', pid: proc.pid });
  } catch (error) {
    console.error('restartDevServer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const stopDevServer = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projects[0];

    if (project.dev_pid) {
      try {
        process.kill(project.dev_pid, 'SIGTERM');
        await appendTerminalLog(projectId, '--- Dev server stopped ---');
      } catch (_) {}
    }

    await pool.query(
      "UPDATE projects SET dev_pid = NULL, status = 'stopped' WHERE id = ?",
      [projectId]
    );

    res.json({ success: true, message: 'Dev server stopped' });
  } catch (error) {
    console.error('stopDevServer:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};



