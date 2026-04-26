import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Sparkles, RotateCcw, X, AlertCircle,
  Plus, FolderOpen, Package, ChevronDown, ChevronRight,
  Layers, FileCode2, Zap
} from 'lucide-react';

interface GeneratedFile {
  id: string;
  path: string;
  content: string;
  type: string;
}

interface AIChatProps {
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  onClose?: () => void;
  hasGeneratedCode?: boolean;
  onNewProject?: () => void;
  generatedFiles?: GeneratedFile[];   // files from last generation
  lastDependencies?: string[];        // deps from last generation
}

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: GeneratedFile[];
  dependencies?: string[];
};

const FILE_TYPE_COLOR: Record<string, string> = {
  react:      '#38bdf8',
  css:        '#a78bfa',
  javascript: '#fbbf24',
  typescript: '#34d399',
  json:       '#fb923c',
  html:       '#f87171',
};

function FileTree({ files }: { files: GeneratedFile[] }) {
  const [open, setOpen] = useState(true);
  if (!files?.length) return null;
  return (
    <div className="aic-filetree">
      <button className="aic-filetree__header" onClick={() => setOpen(o => !o)}>
        <FolderOpen size={12} />
        <span>{files.length} file{files.length !== 1 ? 's' : ''} generated</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <ul className="aic-filetree__list">
          {files.map(f => (
            <li key={f.id ?? f.path} className="aic-filetree__item">
              <span
                className="aic-filetree__dot"
                style={{ background: FILE_TYPE_COLOR[f.type] ?? '#475569' }}
              />
              <span className="aic-filetree__path">{f.path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DepBadges({ deps }: { deps: string[] }) {
  if (!deps?.length) return null;
  return (
    <div className="aic-deps">
      <Package size={11} />
      <span>Installed:</span>
      {deps.map(d => <code key={d} className="aic-dep-badge">{d}</code>)}
    </div>
  );
}

export const AIChat: React.FC<AIChatProps> = ({
  onGenerate,
  isGenerating,
  onClose,
  hasGeneratedCode = false,
  onNewProject,
  generatedFiles = [],
  lastDependencies = [],
}) => {
  const [prompt, setPrompt]     = useState('');
  const [miniMode, setMiniMode] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── New-app detection (original logic preserved) ──────────────────────────
  const isNewAppRequest = (msg: string): boolean => {
    const lower = msg.toLowerCase();
    const newAppKw = ['create a','build a','make a','generate a','new app','different app','another app','start fresh','build me','create me'];
    const modKw    = ['add','change','modify','update','fix','improve','enhance','remove','delete','replace','adjust','tweak','refactor','style','color','make it','can you','please'];
    if (modKw.some(k => lower.includes(k))) return false;
    const seemsNew   = newAppKw.some(k => lower.includes(k));
    const isDetailed = msg.split(' ').length > 10;
    return seemsNew && isDetailed;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || isGenerating) return;

    const ts = new Date();

    // Block new-app requests when code exists and NOT in mini-project mode
    if (hasGeneratedCode && !miniMode && isNewAppRequest(text)) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text, timestamp: ts },
        {
          role: 'system',
          content: '⚠️ This project already has an application. To build a different app, please create a new project. I can only help you modify or enhance the current application here.',
          timestamp: new Date(),
        },
      ]);
      setPrompt('');
      return;
    }

    // Enrich prompt for mini-project mode on first generation
    const enriched = miniMode && !hasGeneratedCode
      ? `Build a complete multi-file React mini-project: ${text}`
      : text;

    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: ts }]);
    setPrompt('');

    try {
      await onGenerate(enriched);
      const successMsg = hasGeneratedCode
        ? '✅ Changes applied successfully! Vite HMR reloading…'
        : `✨ ${miniMode ? 'Mini-project' : 'App'} generated successfully!`;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: successMsg,
          timestamp: new Date(),
          files: generatedFiles,
          dependencies: lastDependencies,
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${err.response?.data?.message ?? err.message ?? 'Failed to generate code'}`,
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
  };

  const handleReset = () => {
    if (confirm('Clear chat history? (This will not delete your code)')) setMessages([]);
  };

  // ── Example sets ──────────────────────────────────────────────────────────
  const freshExamples = miniMode ? [
    'Kanban board with drag-and-drop, React context, localStorage',
    'E-commerce product catalog with cart and filters',
    'Personal finance tracker with charts and categories',
    'Real-time chat UI with rooms and emoji reactions',
    'Markdown notes app with live preview and tags',
    'Dashboard with sidebar nav, stat cards, and data table',
  ] : [
    'Create a todo list with add, delete, and mark as complete',
    'Build a weather dashboard with search',
    'Make a calculator with basic operations',
    'Build a countdown timer app',
    'Make a simple quiz app with scoring',
    'Create a color picker tool',
  ];

  const modExamples = [
    'Add a dark mode toggle',
    'Change the color scheme to blue and purple',
    'Add input validation with error messages',
    'Make it fully responsive for mobile',
    'Add smooth animations when items appear',
    'Improve the styling with modern cards',
  ];

  return (
    <div className="aic-root">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="aic-header">
        <div className="aic-header__left">
          <Sparkles size={15} className="aic-header__icon" />
          <span className="aic-header__title">AI Generator</span>
        </div>
        <div className="aic-header__right">
          <button
            className={`aic-mode-btn${miniMode ? ' aic-mode-btn--on' : ''}`}
            onClick={() => setMiniMode(m => !m)}
            title={miniMode ? 'Switch to single-file mode' : 'Switch to full project mode'}
          >
            {miniMode ? <Layers size={12} /> : <FileCode2 size={12} />}
            <span>{miniMode ? 'Full project' : 'Single file'}</span>
          </button>

          {messages.length > 0 && (
            <button className="aic-icon-btn" onClick={handleReset} title="Clear chat">
              <RotateCcw size={13} />
            </button>
          )}
          {onClose && (
            <button className="aic-icon-btn md:hidden" onClick={onClose}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="aic-messages">

        {/* Empty: fresh project */}
        {messages.length === 0 && !hasGeneratedCode && (
          <div className="aic-empty">
            <div className="aic-empty__orb">
              <Zap size={26} />
            </div>
            <h4 className="aic-empty__title">
              {miniMode ? 'Full-Project Generator' : 'Code Generator'}
            </h4>
            <p className="aic-empty__sub">
              {miniMode
                ? "Describe an app — I'll generate every component, page, hook and style."
                : "Describe what you want and I'll build a React component."}
            </p>
            <div className="aic-examples">
              <p className="aic-examples__label">Try these</p>
              {freshExamples.map((ex, i) => (
                <button
                  key={i}
                  className="aic-example-btn"
                  onClick={() => setPrompt(ex)}
                  disabled={isGenerating}
                >{ex}</button>
              ))}
            </div>
          </div>
        )}

        {/* Empty: code exists */}
        {messages.length === 0 && hasGeneratedCode && (
          <div className="aic-empty">
            <div className="aic-empty__orb aic-empty__orb--green">
              <AlertCircle size={22} />
            </div>
            <h4 className="aic-empty__title">Modify Your App</h4>
            <p className="aic-empty__sub">
              Your app is live! Ask me to extend, fix, or restyle anything.
            </p>
            {onNewProject && (
              <button className="aic-new-btn" onClick={onNewProject}>
                <Plus size={13} /> New project for a different app
              </button>
            )}
            <div className="aic-examples">
              <p className="aic-examples__label">Suggestions</p>
              {modExamples.map((ex, i) => (
                <button
                  key={i}
                  className="aic-example-btn"
                  onClick={() => setPrompt(ex)}
                  disabled={isGenerating}
                >{ex}</button>
              ))}
            </div>
          </div>
        )}

        {/* Bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`aic-bwrap aic-bwrap--${msg.role}`}>
            <div className={`aic-bubble aic-bubble--${msg.role}`}>
              <p className="aic-bubble__text">{msg.content}</p>
              {msg.files      && <FileTree files={msg.files} />}
              {msg.dependencies && <DepBadges deps={msg.dependencies} />}
              {msg.role !== 'system' && (
                <span className="aic-bubble__time">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="aic-bwrap aic-bwrap--assistant">
            <div className="aic-bubble aic-bubble--assistant aic-bubble--loading">
              <Loader2 size={13} className="aic-spin" />
              <span>
                {hasGeneratedCode ? 'Applying changes…' : miniMode ? 'Building project…' : 'Generating…'}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <form className="aic-input-area" onSubmit={handleSubmit}>
        <div className="aic-input-row">
          <textarea
            className="aic-textarea"
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            disabled={isGenerating}
            placeholder={
              hasGeneratedCode
                ? 'Ask for modifications or improvements…'
                : miniMode
                ? 'e.g. Kanban board with drag-and-drop, context, localStorage…'
                : 'Describe the app you want to build…'
            }
          />
          <button
            type="submit"
            className="aic-send"
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? <Loader2 size={17} className="aic-spin" /> : <Send size={17} />}
          </button>
        </div>
        <p className="aic-hint">
          {hasGeneratedCode
            ? 'Describe changes • Enter to send'
            : 'Enter to send · Shift+Enter for new line'}
        </p>
      </form>

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        .aic-root {
          display: flex; flex-direction: column; height: 100%;
          background: #07090f; color: #b0bec5;
          font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
        }

        /* Header */
        .aic-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 13px; border-bottom: 1px solid #0d1424;
          background: #07090f;
        }
        .aic-header__left { display: flex; align-items: center; gap: 7px; }
        .aic-header__icon { color: #38bdf8; flex-shrink: 0; }
        .aic-header__title { font-size: 13px; font-weight: 600; color: #e2e8f0; letter-spacing: .04em; }
        .aic-header__right { display: flex; align-items: center; gap: 5px; }

        /* Mode btn */
        .aic-mode-btn {
          display: flex; align-items: center; gap: 5px; padding: 4px 9px;
          border-radius: 5px; border: 1px solid #152033; background: #0b1020;
          color: #4a5568; font-family: inherit; font-size: 11px; cursor: pointer;
          transition: all .15s;
        }
        .aic-mode-btn--on { border-color: #0c4a6e; background: #0a1e35; color: #38bdf8; }
        .aic-mode-btn:hover:not(.aic-mode-btn--on) { color: #718096; }

        .aic-icon-btn {
          width: 27px; height: 27px; display: flex; align-items: center; justify-content: center;
          border-radius: 5px; border: none; background: transparent; color: #3d4f63; cursor: pointer;
          transition: all .15s;
        }
        .aic-icon-btn:hover { background: #0d1424; color: #7a8fa6; }

        /* Messages scroll */
        .aic-messages {
          flex: 1; overflow-y: auto; padding: 14px 11px;
          display: flex; flex-direction: column; gap: 9px;
          scrollbar-width: thin; scrollbar-color: #0d1424 transparent;
        }

        /* Empty state */
        .aic-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 6px 10px; gap: 9px; text-align: center;
        }
        .aic-empty__orb {
          width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0;
          background: radial-gradient(circle at 35% 35%, #0c2340, #051226);
          border: 1px solid #0c4a6e; color: #38bdf8;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 18px #0c4a6e44;
        }
        .aic-empty__orb--green {
          background: radial-gradient(circle at 35% 35%, #052e16, #031a0d);
          border-color: #065f46; color: #34d399; box-shadow: 0 0 18px #065f4644;
        }
        .aic-empty__title { margin: 0; font-size: 13px; font-weight: 600; color: #dde6f0; }
        .aic-empty__sub   { margin: 0; font-size: 11.5px; color: #3d4f63; line-height: 1.65; max-width: 250px; }

        .aic-new-btn {
          display: flex; align-items: center; gap: 6px; padding: 6px 13px;
          border-radius: 6px; background: #0c4a6e; color: #bae6fd;
          border: none; font-family: inherit; font-size: 11.5px; cursor: pointer;
          transition: background .15s;
        }
        .aic-new-btn:hover { background: #0369a1; }

        /* Examples */
        .aic-examples { width: 100%; display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
        .aic-examples__label {
          font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em;
          color: #1e2d3d; text-align: left; margin: 2px 0;
        }
        .aic-example-btn {
          text-align: left; padding: 7px 10px; border-radius: 5px;
          border: 1px solid #0d1424; background: #090d18;
          color: #3d4f63; font-family: inherit; font-size: 11.5px;
          cursor: pointer; transition: all .15s; line-height: 1.4;
        }
        .aic-example-btn:hover:not(:disabled) { border-color: #152033; color: #7a8fa6; background: #0b1020; }
        .aic-example-btn:disabled { opacity: .35; cursor: not-allowed; }

        /* Bubbles */
        .aic-bwrap { display: flex; }
        .aic-bwrap--user      { justify-content: flex-end; }
        .aic-bwrap--assistant { justify-content: flex-start; }
        .aic-bwrap--system    { justify-content: center; }

        .aic-bubble {
          padding: 8px 11px; border-radius: 8px; max-width: 90%; line-height: 1.55;
        }
        .aic-bubble--user {
          background: linear-gradient(135deg, #0a1e35 0%, #0c2e50 100%);
          border: 1px solid #1a3a5c; border-bottom-right-radius: 2px;
        }
        .aic-bubble--assistant {
          background: #090d18; border: 1px solid #0d1424; border-bottom-left-radius: 2px;
        }
        .aic-bubble--system {
          background: #160f01; border: 1px solid #6b3c00;
          color: #f59e0b; font-size: 11.5px; max-width: 92%; text-align: center;
        }
        .aic-bubble--loading {
          display: flex; align-items: center; gap: 7px; color: #3d4f63;
        }
        .aic-bubble__text { margin: 0 0 3px; white-space: pre-wrap; }
        .aic-bubble__time { display: block; font-size: 9.5px; color: #1e2d3d; margin-top: 5px; }

        /* File tree */
        .aic-filetree {
          margin-top: 8px; padding: 7px 9px; background: #050810;
          border-radius: 5px; border: 1px solid #0d1424;
        }
        .aic-filetree__header {
          display: flex; align-items: center; gap: 5px; color: #38bdf8;
          font-size: 11px; background: none; border: none; font-family: inherit;
          cursor: pointer; padding: 0 0 4px; width: 100%;
        }
        .aic-filetree__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 3px; }
        .aic-filetree__item { display: flex; align-items: center; gap: 6px; }
        .aic-filetree__dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .aic-filetree__path { color: #3d4f63; font-size: 10.5px; }

        /* Deps */
        .aic-deps { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 7px; color: #3d4f63; font-size: 10.5px; }
        .aic-dep-badge {
          background: #090d18; color: #38bdf8;
          border: 1px solid #152033; padding: 1px 6px; border-radius: 4px; font-size: 10px;
        }

        /* Input */
        .aic-input-area { border-top: 1px solid #0d1424; background: #07090f; }
        .aic-input-row { display: flex; gap: 7px; padding: 9px 11px 4px; }
        .aic-textarea {
          flex: 1; resize: none; background: #090d18;
          border: 1px solid #0d1424; border-radius: 6px;
          color: #d0dce8; padding: 8px 10px;
          font-family: inherit; font-size: 12.5px; outline: none;
          transition: border-color .2s;
          scrollbar-width: thin; scrollbar-color: #0d1424 transparent;
        }
        .aic-textarea:focus { border-color: #0c4a6e; }
        .aic-textarea::placeholder { color: #1e2d3d; }
        .aic-send {
          align-self: flex-end; width: 37px; height: 37px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #0c4a6e; color: #bae6fd;
          border: none; border-radius: 6px; cursor: pointer; transition: background .15s;
        }
        .aic-send:hover:not(:disabled) { background: #0369a1; }
        .aic-send:disabled { opacity: .35; cursor: not-allowed; }
        .aic-hint { font-size: 9.5px; color: #1a2535; text-align: center; padding: 3px 0 9px; margin: 0; }

        .aic-spin { animation: aic-spin-kf .75s linear infinite; }
        @keyframes aic-spin-kf { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};