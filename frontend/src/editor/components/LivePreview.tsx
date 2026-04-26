import React, { useMemo } from 'react';
import type { ProjectFile } from '../types/project';

interface LivePreviewProps {
  files: ProjectFile[];
  template: string;
  previewUrl?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return true for files that should be injected as JS globals */
const isJsFile = (path: string) =>
  /\.(jsx?|tsx?)$/.test(path) && !/\.test\.|\.spec\./.test(path);

const isCssFile = (path: string) => /\.css$/.test(path);

/**
 * Extract the component/function name that a file exports as default
 * OR infers from the filename (e.g. src/components/Button.jsx → "Button").
 */
function inferComponentName(filePath: string, content: string): string | null {
  // 1. explicit: function ComponentName() { ... }
  const fnMatch = content.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  if (fnMatch) return fnMatch[1];

  // 2. explicit: const ComponentName = () =>
  const constMatch = content.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=/);
  if (constMatch) return constMatch[1];

  // 3. fallback: capitalised filename (Button.jsx → Button)
  const filename = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  if (/^[A-Z]/.test(filename)) return filename;

  return null;
}

/**
 * Topological sort: ensure components used by App are loaded first.
 * Simple heuristic: sort so that files whose name appears inside App.jsx
 * come before App.jsx.  Everything else keeps its natural order.
 */
function orderFiles(jsFiles: ProjectFile[]): ProjectFile[] {
  const appFile = jsFiles.find(f => /App\.[jt]sx?$/.test(f.file_path));
  if (!appFile) return jsFiles;

  const appContent = appFile.content ?? '';
  const rest = jsFiles.filter(f => f !== appFile);

  // Files referenced by App come first, rest after, App last
  const referenced: ProjectFile[] = [];
  const unreferenced: ProjectFile[] = [];

  for (const f of rest) {
    const name = inferComponentName(f.file_path, f.content ?? '');
    if (name && appContent.includes(`<${name}`)) {
      referenced.push(f);
    } else {
      unreferenced.push(f);
    }
  }

  // Recursively check if referenced files need other files (one level deep)
  const allBefore = [...unreferenced, ...referenced];
  return [...allBefore, appFile];
}

/** Strip import/export lines the sandbox can't handle */
function sanitizeJS(content: string): string {
  return content
    .replace(/^\s*import\s+.*?(?:from\s+['"][^'"]*['"])?\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s*;?\s*$/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .trim();
}

/** Build the complete srcdoc HTML string */
function buildSrcdoc(files: ProjectFile[]): string {
  const jsFiles  = orderFiles(files.filter(f => isJsFile(f.file_path)));
  const cssFiles = files.filter(f => isCssFile(f.file_path));

  const cssBlocks = cssFiles
    .map(f => `/* ${f.file_path} */\n${f.content ?? ''}`)
    .join('\n\n');

  // Each JS file becomes its own <script> block so errors are traceable
  const jsBlocks = jsFiles
    .map(f => {
      const name    = inferComponentName(f.file_path, f.content ?? '');
      const clean   = sanitizeJS(f.content ?? '');
      const isApp   = /App\.[jt]sx?$/.test(f.file_path);

      if (isApp) {
        // App.jsx is the root — just eval it
        return `<script type="text/babel" data-file="${f.file_path}">\n${clean}\n</script>`;
      }

      if (name) {
        // Wrap in an IIFE that assigns to window so App can use it as a global
        return `<script type="text/babel" data-file="${f.file_path}">
${clean}
if (typeof ${name} !== 'undefined') window.${name} = ${name};
</script>`;
      }

      // Utility / hook files — just eval, they define their own names
      return `<script type="text/babel" data-file="${f.file_path}">\n${clean}\n</script>`;
    })
    .join('\n');

  const mountScript = `
<script type="text/babel">
  (function() {
    const rootEl = document.getElementById('root');
    if (typeof App === 'undefined') {
      rootEl.innerHTML = '<div style="padding:2rem;color:#f87171;font-family:monospace">Error: App component not found.<br>Make sure your App.jsx defines a function named <strong>App</strong>.</div>';
      return;
    }
    try {
      // React 18 createRoot API (no deprecation warning)
      const root = ReactDOM.createRoot(rootEl);
      root.render(React.createElement(App));
    } catch(err) {
      rootEl.innerHTML = '<div style="padding:2rem;color:#f87171;font-family:monospace"><strong>Runtime error:</strong><br>' + err.message + '</div>';
      console.error(err);
    }
  })();
</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>

  <!-- React 18 + Babel + common libs from CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- axios available as global for any generated code that uses it -->
  <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
  <!-- lucide-react UMD build — available as window.lucide -->
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <!-- Make React hooks + common libs available as globals -->
  <script>
    const {
      useState, useEffect, useRef, useContext, useReducer,
      useMemo, useCallback, useLayoutEffect, useId,
      createContext, forwardRef, memo, Fragment
    } = React;
    const { createRoot } = ReactDOM;
    // Expose lucide icons as globals if lucide loaded
    if (window.lucide) {
      Object.entries(window.lucide).forEach(([k, v]) => { window[k] = v; });
    }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
    ${cssBlocks}
  </style>
</head>
<body>
  <div id="root"></div>

  ${jsBlocks}
  ${mountScript}
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export const LivePreview: React.FC<LivePreviewProps> = ({
  files,
  template,
  previewUrl,
}) => {
  // ── Docker-hosted preview (React with Vite dev server) ────────────────────
  if (previewUrl && previewUrl !== 'loading') {
    return (
      <div className="h-full flex flex-col bg-[#07090f]">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#0d1424] bg-[#09090f]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-gray-500 font-mono truncate flex-1">{previewUrl}</span>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            ↗ open
          </a>
        </div>
        <iframe
          src={previewUrl}
          className="flex-1 w-full border-none bg-white"
          title="Live Preview"
          // No sandbox on the docker preview — Vite HMR websocket needs
          // allow-same-origin + allow-scripts, but sandbox blocks cross-origin
          // iframes on some Chrome versions. Let CSP on the server handle security.
        />
      </div>
    );
  }

  // ── Loading spinner (waiting for Vite to start) ───────────────────────────
  if (previewUrl === 'loading') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#07090f] gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[#0d1424]" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-t-2 border-blue-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-mono">Starting dev server…</p>
      </div>
    );
  }

  // ── In-browser srcdoc preview (no docker) ────────────────────────────────
  const jsFiles  = files.filter(f => isJsFile(f.file_path));
  const hasFiles = jsFiles.length > 0;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const srcdoc = useMemo(
    () => (hasFiles ? buildSrcdoc(files) : null),
    // Recompute only when file contents actually change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files.map(f => `${f.file_path}:${f.content}`).join('|')]
  );

  if (!hasFiles || !srcdoc) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#07090f] gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#09090f] border border-[#0d1424] flex items-center justify-center">
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-sm text-gray-500 font-mono">Generate code to see a preview</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#07090f]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#0d1424] bg-[#09090f]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/40" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/40" />
          <span className="w-3 h-3 rounded-full bg-green-500/40" />
        </div>
        <div className="flex-1 bg-[#0d1424] rounded px-3 py-1 text-xs text-gray-600 font-mono">
          preview — {jsFiles.length} file{jsFiles.length !== 1 ? 's' : ''} loaded
        </div>
      </div>

      <iframe
        key={srcdoc.length}      /* remount when content changes size */
        srcDoc={srcdoc}
        className="flex-1 w-full border-none bg-white"
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
};