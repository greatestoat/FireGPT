import pool from '../../../config/db.js';

/**
 * Appends non-empty lines from `text` into the terminal_logs table.
 * Failures are silently swallowed — logging is non-fatal.
 */
export async function appendTerminalLog(projectId, text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  for (const line of lines) {
    await pool.query(
      'INSERT INTO terminal_logs (project_id, line) VALUES (?, ?)',
      [projectId, line]
    ).catch(() => {});
  }
}