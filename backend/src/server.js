import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import chatRoutes    from './routes/chatRoutes.js';
import authRoutes    from './routes/authRoutes.js';
import userRoutes    from './routes/userRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import initDatabase  from './config/initDb.js';
import pdfRoutes     from './routes/pdfRoutes.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import { initRAG }   from './utils/rag.js';
import http          from 'http';
import generateRoute from './routes/generate.js';
import subAppRoutes  from './routes/subAppRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import initSubAppTables from './config/initSubApp.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dockerService from './service/dockerService.js';

const app  = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ─── Security ───────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc:  ["'self'", 'ws:', 'wss:', 'http://localhost:*', 'ws://localhost:*'],
        // Allow the frontend (localhost:5173) to iframe the preview proxy
        frameAncestors: ["'self'", 'http://localhost:*'],
        frameSrc:    ["'self'", 'http://localhost:*'],
        objectSrc:   ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ─── Allow preview routes to be iframed from any localhost origin ────────────
// Helmet sets X-Frame-Options: SAMEORIGIN globally which blocks localhost:5173
// from framing localhost:5000. Override it just for /preview/* routes.
app.use('/preview', (_req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  // Also set CORP header so the iframe content loads cross-origin
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:         process.env.CLIENT_URL || 'http://localhost:5173',
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── General Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

await initSubAppTables();

// ─── PREVIEW: resolve port endpoint (called by Terminal.tsx) ─────────────────
//
//  Terminal.tsx calls GET /preview-port/:projectId to get the Vite port,
//  then sets the iframe src to http://localhost:{port} directly.
//  This avoids all proxy path-rewrite issues with Vite asset loading.
//
app.get('/preview-port/:projectId', (req, res) => {
  const port = dockerService.getPort(req.params.projectId);
  if (!port) {
    return res.status(404).json({ error: 'Container not running' });
  }
  res.json({ port });
});

// ─── PREVIEW PROXY (fallback — keep for WebSocket/HMR) ───────────────────────
//  Proxies /preview/:projectId/* → http://localhost:{vitePort}/*
//  Used only for WS upgrade (Vite HMR). Asset requests go direct to localhost:{port}.
app.use('/preview/:projectId', (req, res, next) => {
  const projectId = req.params.projectId;
  const port      = dockerService.getPort(projectId);

  if (!port) {
    return res.status(404).send(`
      <html><body style="font-family:sans-serif;padding:2rem;background:#07090f;color:#94a3b8">
        <h2>Container not running</h2>
        <p>Open the Terminal panel to scaffold and start the dev server.</p>
      </body></html>
    `);
  }

  // pathRewrite must be built dynamically per-request
  const proxy = createProxyMiddleware({
    target:       `http://localhost:${port}`,
    changeOrigin: true,
    ws:           true,
    pathRewrite:  (path) => path.replace(`/preview/${projectId}`, '') || '/',
    on: {
      error: (_err, _req, res) => {
        res.status(502).send('Container not ready yet — try again in a moment.');
      },
    },
  });
  proxy(req, res, next);
});

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/user',    userRoutes);
app.use('/api',         chatRoutes);
app.use('/api/pdf',     pdfRoutes);
app.use('/api/youtube', youtubeRoutes);
initRAG();
app.use('/generate',    generateRoute);
app.use('/api/subapp',  subAppRoutes);
app.use('/api',         projectRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});
// ─── Start ────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await initDatabase();
    // Use server.listen (not app.listen) so WS proxy works
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();