import { v4 as uuidv4 }                        from 'uuid';
import path                                      from 'path';
// import pool                                      from '../../config/db.js';
import pool from '../../../config/db.js';
import openrouter                                from '../../../openrouter.js';
import dockerService                             from '../../../service/dockerService.js';
import { injectGeneratedFiles }                  from '../../../service/fileInjector.js';
import { appendTerminalLog } from './Helpers.js';
import { getReactSystemPrompt } from './Prompts.js';
import { extractCodeFromResponse, extractDependencies, getFileType } from './Parsers.js';
const PROJECTS_ROOT = process.env.PROJECTS_ROOT || path.join(process.cwd(), 'projects');

// ── Shared SSE helpers ────────────────────────────────────────────────────────

/** Sets SSE headers and flushes them to the client. */
function openSSE(res) {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/** Sends one SSE data frame (no-ops if the stream has already closed). */
function sendSSE(res, payload) {
  if (!res.writableEnded) res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ── 1. Scaffold ───────────────────────────────────────────────────────────────
// Creates Docker container + starts Vite dev server, streaming logs via SSE.

export const scaffoldReactProject = async (req, res) => {
  const { projectId } = req.params;
  const userId        = req.user.id;

  const [projects] = await pool.query(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  if (projects.length === 0)
    return res.status(404).json({ success: false, message: 'Project not found' });

  openSSE(res);

  const onLog = async (msg) => {
    await appendTerminalLog(projectId, msg);
    sendSSE(res, { log: msg });
  };

  try {
    // await dockerService.createReactProject(projectId, onLog);
    const project = projects[0]; await dockerService.createReactProject(projectId, onLog, project.folder_path);
    const devPort = await dockerService.startDevServer(projectId, onLog);

    await pool.query(
      "UPDATE projects SET status='running', dev_port=?, dev_pid=NULL WHERE id=?",
      [devPort, projectId]
    );

    sendSSE(res, { ready: true, port: devPort });
  } catch (err) {
    await appendTerminalLog(projectId, `[error] ${err.message}`);
    sendSSE(res, { error: err.message });
  } finally {
    res.end();
  }
};

// ── 2. AI code generation ─────────────────────────────────────────────────────
// Generates files, writes to disk, installs deps.
// Does NOT restart Vite — HMR picks up the new files automatically.

export const generateReactCode = async (req, res) => {
  try {
    const { projectId }                              = req.params;
    const { prompt, model = 'meta-llama/llama-3.3-70b-instruct' } = req.body;
    const userId                                     = req.user.id;

    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (projects.length === 0)
      return res.status(404).json({ success: false, message: 'Project not found' });

    const generationId = uuidv4();
    await pool.query(
      "INSERT INTO code_generations (id, project_id, user_id, prompt, model, status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [generationId, projectId, userId, prompt, model]
    );
    // In ReactControllers.js, in generateReactCode:
// console.log('[DEBUG] projectFolder:', projectFolder);
// console.log('[DEBUG] parsedFiles:', parsedFiles.map(f => ({ path: f.path, bytes: f.content?.length })));

    // ── Step 1: AI generation ─────────────────────────────────────────────
    await appendTerminalLog(projectId, '[AI] Generating project files…');

    const response = await Promise.race([
      openrouter.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: getReactSystemPrompt() },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.4,
        max_tokens:  16000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout after 3 minutes')), 180_000)
      ),
    ]);

    const aiResponse = response.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error('No response from AI');

    const parsedFiles  = extractCodeFromResponse(aiResponse);
    const dependencies = extractDependencies(aiResponse);

    await appendTerminalLog(projectId, `[AI] Generated ${parsedFiles.length} file(s).`);
    if (dependencies.length > 0)
      await appendTerminalLog(projectId, `[AI] Extra dependencies: ${dependencies.join(', ')}`);

    // ── Step 2: Write files to disk ───────────────────────────────────────
    // const projectFolder = path.join(PROJECTS_ROOT, projectId);
    const projectFolder = projects[0].folder_path;
    await injectGeneratedFiles(projectFolder, parsedFiles);
    await appendTerminalLog(projectId, `[FS] Wrote ${parsedFiles.length} file(s) to disk.`);

    // ── Step 3: Install extra dependencies (if container is already up) ───
    if (dependencies.length > 0) {
      await appendTerminalLog(projectId, `[NPM] Installing: ${dependencies.join(' ')}…`);

      const isRunning = typeof dockerService.isRunning === 'function'
        ? dockerService.isRunning(projectId)
        : true;

      if (isRunning) {
        try {
          await dockerService.runCommand(
            projectId,
            `npm install ${dependencies.join(' ')} --save`,
            async (line) => { await appendTerminalLog(projectId, line); }
          );
          await appendTerminalLog(projectId, '[NPM] Dependencies installed successfully.');
        } catch (installErr) {
          // Non-fatal — Vite will surface the missing-module error in the terminal.
          await appendTerminalLog(projectId, `[NPM] Warning: install failed — ${installErr.message}`);
        }
      } else {
        await appendTerminalLog(
          projectId,
          '[NPM] Container not yet running — dependencies will be installed on next scaffold.'
        );
      }
    }

    // ── Step 4: Persist files to DB ───────────────────────────────────────
    await pool.query('DELETE FROM project_files WHERE project_id = ?', [projectId]);

    const createdFiles = [];
    for (const file of parsedFiles) {
      const fileId = uuidv4();
      await pool.query(
        'INSERT INTO project_files (id, project_id, file_path, content, file_type) VALUES (?, ?, ?, ?, ?)',
        [fileId, projectId, file.path, file.content, file.type]
      );
      createdFiles.push({ id: fileId, path: file.path, content: file.content, type: file.type });
    }

    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [projectId]
    );
    await pool.query(
      "UPDATE code_generations SET generated_code = ?, status = 'success' WHERE id = ?",
      [JSON.stringify(parsedFiles), generationId]
    );

    await appendTerminalLog(projectId, '[DONE] Files written. Vite HMR will hot-reload automatically.');

    res.json({
      success: true,
      generationId,
      files:        createdFiles,
      dependencies,
      message: `Generated ${parsedFiles.length} file(s)${
        dependencies.length ? `, ${dependencies.length} package(s) installed` : ''
      }.`,
    });

  } catch (error) {
    console.error('generateReactCode error:', error);
    try {
      await pool.query(
        "UPDATE code_generations SET status='failed', error_message=? WHERE project_id=? ORDER BY created_at DESC LIMIT 1",
        [error.message, req.params.projectId]
      );
    } catch (_) {}
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 3. Write single file (code editor save) ───────────────────────────────────

export const writeProjectFile = async (req, res) => {
  try {
    const { projectId }               = req.params;
    const { path: filePath, content } = req.body;
    const userId                      = req.user.id;

    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (projects.length === 0)
      return res.status(404).json({ success: false, message: 'Project not found' });

    await dockerService.writeFile(projectId, filePath, content);

    await pool.query(
      `INSERT INTO project_files (id, project_id, file_path, content, file_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE content = VALUES(content)`,
      [uuidv4(), projectId, filePath, content, getFileType(filePath)]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Run terminal command (SSE stream) ──────────────────────────────────────

export const runTerminalCommand = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { command }   = req.body;
    const userId        = req.user.id;

    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (projects.length === 0)
      return res.status(404).json({ success: false, message: 'Project not found' });

    openSSE(res);

    await dockerService.runCommand(projectId, command, async (line) => {
      await appendTerminalLog(projectId, line).catch(() => {});
      sendSSE(res, { log: line });
    });

    sendSSE(res, { done: true });
    res.end();
  } catch (error) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

// ── 5. Preview-port lookup ────────────────────────────────────────────────────

export const getPreviewPort = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId        = req.user.id;

    const [projects] = await pool.query(
      'SELECT dev_port FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (projects.length === 0)
      return res.status(404).json({ success: false, message: 'Project not found' });

    const port = projects[0].dev_port;
    if (!port)
      return res.status(404).json({ success: false, message: 'No dev server running' });

    res.json({ success: true, port });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. Stop container ─────────────────────────────────────────────────────────

export const stopReactProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId        = req.user.id;

    const [projects] = await pool.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );
    if (projects.length === 0)
      return res.status(404).json({ success: false, message: 'Project not found' });

    await dockerService.stopProject(projectId);

    await pool.query(
      "UPDATE projects SET status='stopped', dev_port=NULL WHERE id=?",
      [projectId]
    );

    res.json({ success: true, message: 'Container stopped' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};