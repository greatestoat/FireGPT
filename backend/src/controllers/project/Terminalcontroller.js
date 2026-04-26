import pool          from '../../config/db.js';
import dockerService from '../../service/dockerService.js';

export const executeTerminalCommand = async (req, res) => {
  const { projectId } = req.params;
  const { command }   = req.body;
  const userId        = req.user.id;

  try {
    const [projects] = await pool.query(
      "SELECT id FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );

    if (projects.length === 0)
      return res.status(404).json({ success: false, message: "Project not found" });

    if (!dockerService.isRunning(projectId))
      return res.status(400).json({ success: false, message: "Container not running. Scaffold project first." });

    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Echo the command itself first (like a real terminal)
    res.write(`data: ${JSON.stringify({ log: `$ ${command}\n` })}\n\n`);

    await dockerService.runCommand(projectId, command, async (line) => {
      // Persist to DB so streamTerminalLogs SSE also gets it
      await pool.query(
        "INSERT INTO terminal_logs (project_id, line) VALUES (?, ?)",
        [projectId, line]
      ).catch(() => {});

      res.write(`data: ${JSON.stringify({ log: line })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Terminal execution error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};
