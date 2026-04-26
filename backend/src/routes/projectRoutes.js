import express from 'express';
import { authenticate } from '../middleware/auth.js';

import {
  createProject,
  getUserProjects,
  getProject,
  deleteProject,
  getProjectStatus,
  createFile,
  updateFile,
  deleteFile,
  streamTerminalLogs,
  restartDevServer,
  stopDevServer,
} from '../controllers/project/Projectcorecontroller.js';

import { generateHtmlCode } from '../controllers/project/Htmlprojectcontroller.js';
import {
  scaffoldReactProject,
  generateReactCode,
  writeProjectFile,
  runTerminalCommand,
  stopReactProject,
  getPreviewPort,          // ← make sure this is exported from the controller
} from '../controllers/project/react/Reactprojectcontroller.js';

const router = express.Router();

router.use(authenticate);

// ── Project CRUD ──────────────────────────────────────────────────────────────
router.post  ('/projects',            createProject);
router.get   ('/projects',            getUserProjects);
router.get   ('/projects/:projectId', getProject);
router.delete('/projects/:projectId', deleteProject);

// ── File operations ───────────────────────────────────────────────────────────
router.post  ('/projects/:projectId/files', createFile);
router.put   ('/files/:fileId',             updateFile);
router.delete('/files/:fileId',             deleteFile);

// ── AI Code Generation ────────────────────────────────────────────────────────
router.post('/projects/:projectId/generate/html',  generateHtmlCode);
router.post('/projects/:projectId/generate/react', generateReactCode);

// ── React scaffold (SSE stream) ───────────────────────────────────────────────
router.get('/projects/:projectId/scaffold', scaffoldReactProject);

// ── Preview port lookup ───────────────────────────────────────────────────────
// BUG FIX: was `/:projectId/preview-port` (missing /projects/ prefix).
// Terminal.tsx fetches /api/projects/:id/preview-port so the path must match.
router.get('/projects/:projectId/preview-port', getPreviewPort);

// ── Write file from editor save ───────────────────────────────────────────────
router.post('/projects/:projectId/write-file', writeProjectFile);

// ── Terminal command → SSE stream ─────────────────────────────────────────────
router.post('/projects/:projectId/terminal', runTerminalCommand);

// ── Dev server controls ───────────────────────────────────────────────────────
router.get ('/projects/:projectId/status',         getProjectStatus);
router.post('/projects/:projectId/restart',        restartDevServer);
router.post('/projects/:projectId/stop',           stopDevServer);
router.post('/projects/:projectId/stop-container', stopReactProject);

// ── Terminal log stream (SSE polling fallback) ────────────────────────────────
router.get('/projects/:projectId/terminal/logs', streamTerminalLogs);

export default router;