import Docker from 'dockerode';
import path   from 'path';
import fs     from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docker    = new Docker();

const PROJECTS_ROOT = process.env.PROJECTS_ROOT
  || path.join(__dirname, '../../../projects');

// ── Minimal Vite+React scaffold ───────────────────────────────────────────────
const VITE_SCAFFOLD = {
  'package.json': JSON.stringify({
    name: 'vite-project', private: true, version: '0.0.0', type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
    dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
    devDependencies: { '@vitejs/plugin-react': '^4.3.1', vite: '^5.4.10' },
  }, null, 2),

  'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: __PORT__,
    strictPort: true,
    hmr: { clientPort: __PORT__, host: 'localhost' },
    allowedHosts: 'all',
  },
})
`,
  'index.html': `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Vite + React</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
`,
  'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
`,
  'src/App.jsx': `import { useState } from 'react'
import './App.css'
function App() {
  return (
    <div className="app">
      <h1>Ready!</h1>
      <p>Use the AI Generator to build something amazing.</p>
    </div>
  )
}
export default App
`,
  'src/App.css': `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0}
.app{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:1rem;padding:2rem;text-align:center}
h1{font-size:2rem;color:#38bdf8}p{color:#64748b}
`,
};

class DockerService {
  constructor() {
    this.containers = new Map(); // projectId → { container, port, hostDir }
    this.nextPort   = 4100;
    this._initUsedPorts();
  }

  async _initUsedPorts() {
    try {
      const list = await docker.listContainers({ all: false });
      let max = 4099;
      for (const c of list)
        for (const p of c.Ports ?? [])
          if (p.PublicPort >= 4100) max = Math.max(max, p.PublicPort);
      this.nextPort = max + 1;
    } catch { /* Docker not ready */ }
  }

  async createReactProject(projectId, onLog, hostDir) {
    hostDir = hostDir || path.join(PROJECTS_ROOT, projectId);

    const containerName = `bolt-${projectId.slice(0, 8)}`;
    await fs.mkdir(hostDir, { recursive: true });

    // ── Step 1: Check if already tracked in memory ──────────────────────────
    if (this.containers.has(projectId)) {
      const entry = this.containers.get(projectId);
      try {
        const info = await entry.container.inspect();
        if (!info.State.Running) await entry.container.start();
        await onLog(`[system] Container already tracked on port ${entry.port} — reusing.\n`);
        // FIX 1: Rewrite vite.config.js with the correct port for this container
        await this._writeViteConfig(hostDir, entry.port);
        await this._ensureNodeModules(entry.container, onLog);
        this.containers.set(projectId, { container: entry.container, port: entry.port, hostDir });
        return { port: entry.port };
      } catch {
        this.containers.delete(projectId);
      }
    }

    // ── Step 2: Search Docker for existing container by name ────────────────
    const existing = await this._findContainerByName(containerName);
    if (existing) {
      await onLog(`[system] Container ${containerName} exists — reusing.\n`);
      const info = await existing.inspect();

      if (!info.State.Running) {
        await onLog(`[system] Starting stopped container...\n`);
        await existing.start();
      }

      const port = this._portFromInspect(info);
      if (!port) {
        await onLog(`[system] Cannot recover port — removing and recreating.\n`);
        await this._removeContainer(existing);
        this.containers.delete(projectId);
        return this.createReactProject(projectId, onLog, hostDir);
      }

      if (port >= this.nextPort) this.nextPort = port + 1;
      // FIX 1: Rewrite vite.config.js with the correct port for this container
      await this._writeViteConfig(hostDir, port);
      await this._ensureNodeModules(existing, onLog);
      this.containers.set(projectId, { container: existing, port, hostDir });
      await onLog(`[system] ✓ Reattached on port ${port}\n`);
      return { port };
    }

    // ── Step 3: Create fresh container ──────────────────────────────────────
    const port = await this._allocatePort();

    const dockerPath = hostDir
      .replace(/\\/g, '/')
      .replace(/^([A-Za-z]):\//, (_, l) => `/${l.toLowerCase()}/`);

    await this._pullImageIfMissing('node:20-alpine', onLog);
    await onLog(`[system] Creating container ${containerName} on port ${port}...\n`);

    let container;
    try {
      container = await docker.createContainer({
        Image:        'node:20-alpine',
        name:         containerName,
        WorkingDir:   '/app',
        Cmd:          ['sh', '-c', 'tail -f /dev/null'],
        ExposedPorts: { [`${port}/tcp`]: {} },
        HostConfig: {
          Binds:        [`${dockerPath}:/app`],
          PortBindings: { [`${port}/tcp`]: [{ HostPort: `${port}` }] },
          AutoRemove:   false,
        },
        Env: [`PORT=${port}`, 'HOST=0.0.0.0'],
      });
    } catch (err) {
      if (err.statusCode === 409 || (err.message && err.message.includes('409'))) {
        await onLog(`[system] Container name conflict (409) — finding existing container...\n`);
        await new Promise(r => setTimeout(r, 500));
        return this.createReactProject(projectId, onLog, hostDir);
      }
      throw err;
    }

    await container.start();
    this.containers.set(projectId, { container, port, hostDir });
    await onLog(`[system] Container started on port ${port}\n`);

    // Write scaffold files (vite.config.js gets __PORT__ replaced correctly)
    await onLog(`[system] Writing Vite scaffold files...\n`);
    for (const [rel, raw] of Object.entries(VITE_SCAFFOLD)) {
      const content  = raw.replace(/__PORT__/g, String(port));
      const fullPath = path.join(hostDir, rel);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // npm install
    await onLog(`[system] Installing npm dependencies...\n`);
    await this._exec(container, ['npm', 'install'], onLog);
    await onLog(`[system] ✓ Scaffold complete on port ${port}\n`);
    return { port };
  }

  // ── Start Vite dev server ─────────────────────────────────────────────────
  async startDevServer(projectId, onLog) {
    const entry = this.containers.get(projectId);
    if (!entry) throw new Error(`No container for project ${projectId}`);
    const { container, port } = entry;

    await onLog(`[system] Starting Vite on port ${port}...\n`);
    await this._exec(
      container,
      ['sh', '-c', `fuser -k ${port}/tcp 2>/dev/null || true`],
      null
    ).catch(() => {});

    const exec = await container.exec({
      Cmd:          ['sh', '-c', `./node_modules/.bin/vite --port ${port} --host 0.0.0.0`],
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir:   '/app',
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    container.modem.demuxStream(
      stream,
      { write: (c) => onLog(c.toString()) },
      { write: (c) => onLog(`[vite] ${c.toString()}`) }
    );

    await this._waitForPort(port, 60_000, onLog);
    return port;
  }

  async writeFile(projectId, filePath, content) {
    const entry = this.containers.get(projectId);
    const baseDir = entry?.hostDir || path.join(PROJECTS_ROOT, projectId);
    const full = path.join(baseDir, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf8');
    if (entry) {
      const dest = `/app/${filePath.replace(/\\/g, '/')}`;
      await this._exec(entry.container, ['sh', '-c', `touch '${dest}' 2>/dev/null || true`], null).catch(() => {});
    }
  }

  async writeFiles(projectId, files) {
    const entry = this.containers.get(projectId);
    const baseDir = entry?.hostDir || path.join(PROJECTS_ROOT, projectId);

    for (const f of files) {
      const relPath = (f.path || f.file_path || '').replace(/\\/g, '/').replace(/^\.?\//, '');
      if (!relPath) continue;
      const hostPath = path.join(baseDir, relPath);
      await fs.mkdir(path.dirname(hostPath), { recursive: true });
      await fs.writeFile(hostPath, f.content ?? '', 'utf8');
      if (entry) {
        const dest = `/app/${relPath}`;
        const dir  = dest.substring(0, dest.lastIndexOf('/'));
        const b64  = Buffer.from(f.content ?? '').toString('base64');
        try {
          await this._exec(entry.container, ['sh', '-c', `mkdir -p "${dir}"`], null);
          await this._exec(entry.container, ['sh', '-c', `echo '${b64}' | base64 -d > '${dest}'`], null);
        } catch (e) {
          console.warn(`[dockerService] writeFiles failed for ${relPath}:`, e.message);
        }
      }
    }
    if (entry) {
      await this._exec(entry.container, ['sh', '-c', 'touch /app/src/main.jsx'], null).catch(() => {});
    }
  }

  async runCommand(projectId, command, onLog) {
    const entry = this.containers.get(projectId);
    if (!entry) throw new Error(`No container for ${projectId}`);
    await this._exec(entry.container, ['sh', '-c', command], onLog);
  }

  async stopProject(projectId) {
    const entry = this.containers.get(projectId);
    if (!entry) return;
    await this._removeContainer(entry.container);
    this.containers.delete(projectId);
  }

  getPort(projectId)   { return this.containers.get(projectId)?.port; }
  isRunning(projectId) { return this.containers.has(projectId); }

  // ── Private helpers ───────────────────────────────────────────────────────

  // FIX 1: Write vite.config.js with the correct port when reusing a container
  async _writeViteConfig(hostDir, port) {
    const viteConfigPath = path.join(hostDir, 'vite.config.js');
    const content = VITE_SCAFFOLD['vite.config.js'].replace(/__PORT__/g, String(port));
    try {
      await fs.writeFile(viteConfigPath, content, 'utf8');
    } catch (e) {
      console.warn('[dockerService] Failed to rewrite vite.config.js:', e.message);
    }
  }

  // FIX 2: Nuke corrupted node_modules before reinstalling
  async _ensureNodeModules(container, onLog) {
    const check = await this._execOutput(
      container,
      'test -f /app/node_modules/.bin/vite && echo "ok" || echo "missing"'
    );
    if (check.trim() !== 'ok') {
      await onLog(`[system] node_modules missing or corrupt — cleaning and reinstalling...\n`);
      // Remove node_modules entirely to avoid ENOTEMPTY errors
      await this._exec(container, ['sh', '-c', 'rm -rf /app/node_modules /app/package-lock.json'], onLog).catch(() => {});
      await this._exec(container, ['npm', 'install'], onLog);
      await onLog(`[system] ✓ npm install complete.\n`);
    }
  }

  async _findContainerByName(name) {
    try {
      const list = await docker.listContainers({
        all:     true,
        filters: JSON.stringify({ name: [name] }),
      });
      const found = list.find(c =>
        c.Names.some(n => n === `/${name}` || n === name)
      );
      if (!found) return null;
      return docker.getContainer(found.Id);
    } catch { return null; }
  }

  _portFromInspect(info) {
    for (const arr of Object.values(info.HostConfig?.PortBindings ?? {})) {
      const p = parseInt(arr?.[0]?.HostPort, 10);
      if (p >= 4100) return p;
    }
    return null;
  }

  async _removeContainer(container) {
    try { const i = await container.inspect(); if (i.State.Running) await container.stop({ t: 3 }); } catch {}
    try { await container.remove({ force: true }); } catch {}
  }

  async _allocatePort() {
    try {
      const used = new Set(
        (await docker.listContainers({ all: false }))
          .flatMap(c => (c.Ports ?? []).map(p => p.PublicPort).filter(Boolean))
      );
      while (used.has(this.nextPort)) this.nextPort++;
    } catch {}
    return this.nextPort++;
  }

  async _execOutput(container, shellCmd) {
    const exec = await container.exec({
      Cmd: ['sh', '-c', shellCmd],
      AttachStdout: true, AttachStderr: false, WorkingDir: '/app',
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    return new Promise((resolve) => {
      let out = '';
      container.modem.demuxStream(
        stream,
        { write: (c) => { out += c.toString(); } },
        { write: () => {} }
      );
      stream.on('end', () => resolve(out));
      stream.on('error', () => resolve(''));
    });
  }

  async _waitForPort(port, timeoutMs, onLog) {
    const { default: http } = await import('http');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ok = await new Promise(resolve => {
        const req = http.get(
          { host: 'localhost', port, path: '/', timeout: 1000 },
          () => resolve(true)
        );
        req.on('error',   () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
      if (ok) {
        await onLog?.(`[system] ✓ Vite is up on port ${port}\n`);
        return;
      }
      await new Promise(r => setTimeout(r, 800));
    }
    await onLog?.(`[system] Warning: Vite port ${port} not responding after ${timeoutMs / 1000}s\n`);
  }

  async _pullImageIfMissing(imageName, onLog) {
    try {
      await docker.getImage(imageName).inspect();
      await onLog?.(`[system] Image ${imageName} already present locally.\n`);
    } catch {
      await onLog?.(`[system] Pulling ${imageName} (first time only)...\n`);
      await new Promise((resolve, reject) => {
        docker.pull(imageName, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(
            stream,
            (err) => err ? reject(err) : resolve(),
            (e) => e.status && onLog?.(`[docker] ${e.status}${e.progress ? ' '+e.progress : ''}\n`)
          );
        });
      });
      await onLog?.(`[system] ✓ ${imageName} pulled.\n`);
    }
  }

  async _exec(container, cmd, onLog) {
    const exec = await container.exec({
      Cmd: cmd, AttachStdout: true, AttachStderr: true, WorkingDir: '/app',
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    return new Promise((resolve, reject) => {
      container.modem.demuxStream(
        stream,
        { write: (c) => onLog?.(c.toString()) },
        { write: (c) => onLog?.(`[err] ${c.toString()}`) }
      );
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }
}

export default new DockerService();