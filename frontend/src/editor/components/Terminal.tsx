import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { X, Minus, Maximize2, Minimize2, Plus } from 'lucide-react';

interface TerminalProps {
  projectId: string;
  visible: boolean;
  onClose: () => void;
  onPreviewReady?: (url: string) => void;
  onRegisterScaffold?: (triggerFn: () => void) => void;
  startIdle?: boolean;
}

interface TerminalTab {
  id: string;
  name: string;
  terminal: XTerm;
  fitAddon: FitAddon;
  commandHistory: string[];
  historyIndex: number;
  currentCommand: string;
}

function getAuthToken(): string {
  return localStorage.getItem('accessToken') ?? '';
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchSSE(
  url: string,
  onData: (parsed: Record<string, unknown>) => void,
  onError: (msg: string) => void,
  signal?: AbortSignal
) {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { ...authHeaders(), Accept: 'text/event-stream' },
      credentials: 'include',
      signal,
    });
  } catch (err: any) {
    if (err.name !== 'AbortError') onError(err.message ?? 'Network error');
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    onError((body as any).message ?? res.statusText);
    return;
  }

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    let done = false; let value: Uint8Array | undefined;
    try { ({ done, value } = await reader.read()); } catch { break; }
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.startsWith('data:') ? frame.slice(5).trim() : frame.trim();
      if (!line) continue;
      try { onData(JSON.parse(line)); } catch { /* skip malformed */ }
    }
  }
}

export const Terminal: React.FC<TerminalProps> = ({
  projectId,
  visible,
  onClose,
  onPreviewReady,
  onRegisterScaffold,
  startIdle = false,
}) => {
  const [tabs, setTabs]               = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [height, setHeight]           = useState(300);

  const isResizingRef = useRef(false);

  // ── BUG FIX 1: Prevent React StrictMode from double-mounting ─────────────
  // In dev mode React mounts → unmounts → remounts. mountedRef gates the
  // very first real mount so createNewTab + scaffoldProject only run once.
  const mountedRef = useRef(false);

  // ── BUG FIX 2: Scaffold always writes to its own terminal, not activeTab ──
  // When the user opens a second tab, activeTabRef changes — but the scaffold
  // SSE is still streaming into the background. Without scaffoldTabRef the
  // output and the onPreviewReady callback silently go to the wrong terminal
  // or are dropped entirely.
  const scaffoldTabRef = useRef<TerminalTab | null>(null);
  const abortRef       = useRef<AbortController | null>(null);
  const scaffoldDone   = useRef(false);

  // Active tab ref — for commands typed by the user
  const activeTabRef = useRef<TerminalTab | null>(null);

  // Keep activeTabRef in sync whenever the selection or tab list changes
  useEffect(() => {
    const found = tabs.find(t => t.id === activeTabId);
    if (found) activeTabRef.current = found;
  }, [activeTabId, tabs]);

  // ── BUG FIX 3: scaffoldProject captures the target tab at call time ───────
  // We pass the tab object directly instead of reading from a ref that may
  // have changed by the time the async SSE callbacks fire.
  const scaffoldProject = useCallback((targetTab: TerminalTab) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current  = ac;
    scaffoldDone.current = false;
    scaffoldTabRef.current = targetTab;  // pin the target

    targetTab.terminal.writeln('\x1b[1;36m⟳ Setting up Docker container…\x1b[0m');

    fetchSSE(
      `/api/projects/${projectId}/scaffold`,
      (data) => {
        // All writes go to targetTab — closure captures it, no ref needed
        if (data.log) {
          targetTab.terminal.write((data.log as string).replace(/\n/g, '\r\n'));
        }
        if (data.ready) {
          scaffoldDone.current = true;
          targetTab.terminal.writeln('\r\n\x1b[1;32m✓ Dev server ready!\x1b[0m');

          const vitePort = data.port;
          if (vitePort) {
            const url = `http://localhost:${vitePort}/`;
            targetTab.terminal.write(`\r\n\x1b[1;33m▶ Preview: ${url}\x1b[0m`);
            onPreviewReady?.(url);
          } else {
            // Fallback: ask backend for the assigned port
            fetch(`/api/projects/${projectId}/preview-port`, {
              headers: { ...authHeaders() },
              credentials: 'include',
            })
              .then(r => r.ok ? r.json() : null)
              .then(d => {
                if (d?.port) {
                  const url = `http://localhost:${d.port}/`;
                  targetTab.terminal.write(`\r\n\x1b[1;33m▶ Preview: ${url}\x1b[0m`);
                  onPreviewReady?.(url);
                }
              })
              .catch(() => {});
          }
          targetTab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        }
        if (data.error) {
          targetTab.terminal.writeln(`\r\n\x1b[1;31mERROR: ${data.error}\x1b[0m`);
          targetTab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        }
      },
      (errMsg) => {
        targetTab.terminal.writeln(`\r\n\x1b[1;31m[scaffold error] ${errMsg}\x1b[0m`);
        targetTab.terminal.writeln('\x1b[33mTip: check auth token and server logs.\x1b[0m');
        targetTab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
      },
      ac.signal
    );
  }, [projectId, onPreviewReady]);

  // Register the re-scaffold trigger for ProjectPage (called after each AI generation)
  // Works in both idle-start and normal-start modes:
  //  - idle mode: scaffoldTabRef is null → fall back to activeTabRef (the only tab)
  //  - normal mode: scaffoldTabRef already points to tab 1
  useEffect(() => {
    onRegisterScaffold?.(() => {
      const target = scaffoldTabRef.current ?? activeTabRef.current;
      if (!target) return;
      scaffoldTabRef.current = target;  // pin it for future SSE output
      target.terminal.writeln(
        '\r\n\x1b[1;35m[AI] New code generated — starting dev server…\x1b[0m'
      );
      scaffoldProject(target);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaffoldProject]);

  // ── Run a shell command inside the container ──────────────────────────────
  const runCommand = useCallback((command: string) => {
    const tab = activeTabRef.current;
    if (!tab) return;

    tab.terminal.writeln(`\r\n\x1b[1;34m$ ${command}\x1b[0m`);

    fetch(`/api/projects/${projectId}/terminal`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body:    JSON.stringify({ command }),
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        tab.terminal.writeln(`\r\n\x1b[1;31mError ${res.status}: ${(err as any).message}\x1b[0m`);
        tab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        return;
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.startsWith('data:') ? frame.slice(5).trim() : frame.trim();
          if (!line) continue;
          try {
            const d = JSON.parse(line);
            if (d.log)   tab.terminal.write(d.log.replace(/\n/g, '\r\n'));
            if (d.error) tab.terminal.writeln(`\r\n\x1b[1;31mError: ${d.error}\x1b[0m`);
            if (d.done)  break;
          } catch { /* skip */ }
        }
      }
      tab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
    }).catch(err => {
      tab.terminal.writeln(`\r\n\x1b[1;31mFetch error: ${err.message}\x1b[0m`);
      tab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
    });
  }, [projectId]);

  // ── Keystroke handler ─────────────────────────────────────────────────────
  const handleInput = useCallback((tab: TerminalTab, data: string) => {
    const code = data.charCodeAt(0);

    if (data === '\r' || data === '\n') {
      const cmd = tab.currentCommand.trim();
      tab.terminal.write('\r\n');
      if (cmd) {
        tab.commandHistory.push(cmd);
        tab.historyIndex = -1;
        if (cmd === 'clear') {
          tab.terminal.clear();
          tab.terminal.write('\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        } else if (cmd === 'help') {
          tab.terminal.writeln('Commands run inside your Docker container.');
          tab.terminal.writeln('Try: ls, cat package.json, npm install <pkg>');
          tab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        } else {
          runCommand(cmd);
        }
      } else {
        tab.terminal.write('\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
      }
      tab.currentCommand = '';

    } else if (code === 127) {
      if (tab.currentCommand.length > 0) {
        tab.currentCommand = tab.currentCommand.slice(0, -1);
        tab.terminal.write('\b \b');
      }
    } else if (data === '\x1b[A') {
      if (!tab.commandHistory.length) return;
      if (tab.historyIndex < tab.commandHistory.length - 1) tab.historyIndex++;
      const cmd = tab.commandHistory[tab.commandHistory.length - 1 - tab.historyIndex];
      tab.terminal.write('\r\x1b[K\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
      tab.currentCommand = cmd;
      tab.terminal.write(cmd);
    } else if (data === '\x1b[B') {
      if (tab.historyIndex > 0) {
        tab.historyIndex--;
        const cmd = tab.commandHistory[tab.commandHistory.length - 1 - tab.historyIndex];
        tab.terminal.write('\r\x1b[K\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        tab.currentCommand = cmd;
        tab.terminal.write(cmd);
      } else {
        tab.historyIndex = -1;
        tab.terminal.write('\r\x1b[K\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
        tab.currentCommand = '';
      }
    } else if (code === 3) {
      tab.terminal.write('^C');
      tab.currentCommand = '';
      tab.terminal.write('\r\n\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
    } else if (code === 12) {
      tab.terminal.clear();
      tab.terminal.write('\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
    } else if (code >= 32) {
      tab.currentCommand += data;
      tab.terminal.write(data);
    }
  }, [runCommand]);

  // ── Create a new xterm tab ────────────────────────────────────────────────
  const createNewTab = useCallback((isFirstTab: boolean) => {
    const tabId    = `tab-${Date.now()}`;
    const fitAddon = new FitAddon();

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize:    14,
      fontFamily:  'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background:    '#0a0a0a', foreground:    '#d4d4d4', cursor:        '#ffffff',
        black:         '#000000', red:           '#cd3131', green:         '#0dbc79',
        yellow:        '#e5e510', blue:          '#2472c8', magenta:       '#bc3fbc',
        cyan:          '#11a8cd', white:         '#e5e5e5',
        brightBlack:   '#666666', brightRed:     '#f14c4c', brightGreen:   '#23d18b',
        brightYellow:  '#f5f543', brightBlue:    '#3b8eea', brightMagenta: '#d670d6',
        brightCyan:    '#29b8db', brightWhite:   '#ffffff',
      },
    });

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    const newTab: TerminalTab = {
      id: tabId,
      name: '',   // set below after we know the count
      terminal, fitAddon,
      commandHistory: [], historyIndex: -1, currentCommand: '',
    };

    terminal.onData((data) => handleInput(newTab, data));

    setTabs(prev => {
      newTab.name = `Terminal ${prev.length + 1}`;
      return [...prev, newTab];
    });
    setActiveTabId(tabId);
    activeTabRef.current = newTab;

    // Open xterm into its DOM div after React renders it
    setTimeout(() => {
      const el = document.getElementById(tabId);
      if (!el) return;
      terminal.open(el);
      fitAddon.fit();

      terminal.writeln('\x1b[1;32m╔══════════════════════════════════╗\x1b[0m');
      terminal.writeln('\x1b[1;32m║   Docker Terminal — /app         ║\x1b[0m');
      terminal.writeln('\x1b[1;32m╚══════════════════════════════════╝\x1b[0m');
      terminal.writeln('');

      if (isFirstTab && !startIdle) {
        // Auto-scaffold only when triggered by AI generation (startIdle=false).
        // When user manually opens terminal, startIdle=true → just show prompt.
        scaffoldProject(newTab);
      } else if (isFirstTab && startIdle) {
        terminal.writeln('[1;33mTerminal ready. Generate code with AI to start the dev server.[0m');
        terminal.write('[1;32m/app[0m [1;34m$[0m ');
      } else {
        terminal.writeln('\x1b[1;36mNew terminal tab — container already running\x1b[0m');
        terminal.write('\x1b[1;32m/app\x1b[0m \x1b[1;34m$\x1b[0m ');
      }
    }, 50);

    return newTab;
  }, [handleInput, scaffoldProject]);

  // ── Mount once (StrictMode-safe) ──────────────────────────────────────────
  useEffect(() => {
    if (mountedRef.current) return;   // StrictMode fires this twice in dev — skip 2nd call
    mountedRef.current = true;

    createNewTab(true);

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  // createNewTab is stable — scaffoldProject/handleInput both have stable deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refit all terminals when layout changes
  useEffect(() => {
    if (!visible || isMinimized) return;
    tabs.forEach(t => setTimeout(() => t.fitAddon.fit(), 120));
  }, [visible, isMinimized, isMaximized, height, tabs]);

  const closeTab = (tabId: string) => {
    tabs.find(t => t.id === tabId)?.terminal.dispose();
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      const next = remaining[remaining.length - 1];
      setActiveTabId(next?.id ?? '');
      activeTabRef.current = next ?? null;
    }
    if (remaining.length === 0) onClose();
  };

  const startResize = () => {
    isResizingRef.current = true;
    const onMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      setHeight(Math.max(120, Math.min(window.innerHeight - e.clientY, window.innerHeight - 100)));
    };
    const onUp = () => {
      isResizingRef.current = false;
      tabs.forEach(t => setTimeout(() => t.fitAddon.fit(), 0));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-gray-800 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Terminal ({tabs.length} tab{tabs.length !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(false)} className="p-2 hover:bg-gray-800 rounded"><Maximize2 size={16} /></button>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-red-400"><X size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed ${isMaximized ? 'inset-0' : 'bottom-0 left-0 right-0'} z-40 bg-[#0a0a0a] border-t border-gray-800 flex flex-col`}
      style={{
        height:        isMaximized ? '100vh' : `${height}px`,
        visibility:    visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto'    : 'none',
      }}
    >
      {!isMaximized && (
        <div
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-blue-500/50"
          onMouseDown={startResize}
        />
      )}

      {/* Tab bar */}
      <div className="bg-[#111111] border-b border-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => { setActiveTabId(tab.id); activeTabRef.current = tab; }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm transition ${
                activeTabId === tab.id
                  ? 'bg-[#0a0a0a] text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {/* Yellow pulse on the scaffold tab while it's running */}
              {tab.id === scaffoldTabRef.current?.id && !scaffoldDone.current && (
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0" />
              )}
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                  className="p-0.5 hover:bg-gray-700 rounded"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => createNewTab(false)} className="p-1.5 hover:bg-gray-800 rounded ml-1">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex gap-1 ml-2">
          <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-gray-800 rounded"><Minus size={16} /></button>
          <button onClick={() => setIsMaximized(v => !v)} className="p-2 hover:bg-gray-800 rounded">
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-red-500/20 rounded text-red-400"><X size={16} /></button>
        </div>
      </div>

      {/* xterm panes */}
      <div className="flex-1 relative overflow-hidden">
        {tabs.map(tab => (
          <div
            key={tab.id}
            id={tab.id}
            className={`absolute inset-0 p-2 ${activeTabId === tab.id ? 'block' : 'hidden'}`}
          />
        ))}
      </div>
    </div>
  );
};