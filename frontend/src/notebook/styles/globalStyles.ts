const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --bg2: #111118;
    --bg3: #18181f;
    --border: #2a2a35;
    --border-light: #35353f;
    --fg: #f0f0f5;
    --fg-dim: #9090a8;
    --fg-muted: #55556a;
    --accent: #c8a97e;
    --accent2: #7e6af5;
    --accent-glow: rgba(200,169,126,0.15);
    --red: #f05a5a;
  }

  html, body, #root { height: 100%; }
  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    overflow: hidden;
  }

  /* ── Animations ── */
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes modelSwitch {
    0% { transform: scale(0.95); opacity: 0.6; }
    100% { transform: scale(1); opacity: 1; }
  }

  .app { display: flex; height: 100vh; }

  /* ── Sidebar ── */
  .sidebar { width: 280px; min-width: 280px; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: all 0.3s ease; overflow: hidden; }
  .sidebar.collapsed { width: 0; min-width: 0; border: none; }
  .sidebar-header { padding: 24px 20px 16px; border-bottom: 1px solid var(--border); }
  .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent), var(--accent2)); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .logo-text { font-family: 'Instrument Serif', serif; font-size: 1.1rem; color: var(--fg); line-height: 1; }
  .logo-sub { font-size: 0.65rem; color: var(--fg-muted); letter-spacing: 0.1em; text-transform: uppercase; }
  .upload-btn { width: 100%; padding: 10px 14px; background: linear-gradient(135deg, rgba(200,169,126,0.12), rgba(126,106,245,0.08)); border: 1px solid var(--border-light); border-radius: 10px; color: var(--fg); font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; letter-spacing: 0.02em; }
  .upload-btn:hover { border-color: var(--accent); color: var(--accent); background: rgba(200,169,126,0.08); }
  .docs-list { flex: 1; overflow-y: auto; padding: 12px; }
  .docs-list::-webkit-scrollbar { width: 4px; }
  .docs-list::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }
  .docs-label { font-size: 0.65rem; color: var(--fg-muted); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; padding: 4px 8px 8px; }
  .doc-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: flex-start; gap: 10px; transition: all 0.15s; margin-bottom: 2px; border: 1px solid transparent; position: relative; }
  .doc-item:hover { background: var(--bg3); border-color: var(--border); }
  .doc-item.active { background: var(--accent-glow); border-color: rgba(200,169,126,0.3); }
  .doc-icon { color: var(--accent); flex-shrink: 0; margin-top: 1px; }
  .doc-info { flex: 1; min-width: 0; }
  .doc-name { font-size: 0.8rem; font-weight: 500; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
  .doc-meta { font-size: 0.7rem; color: var(--fg-muted); }
  .doc-delete { opacity: 0; background: none; border: none; color: var(--fg-muted); cursor: pointer; padding: 2px; border-radius: 4px; transition: all 0.15s; flex-shrink: 0; }
  .doc-item:hover .doc-delete { opacity: 1; }
  .doc-delete:hover { color: var(--red); background: rgba(240,90,90,0.1); }

  /* ── Main layout ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 56px; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 20px; gap: 12px; background: var(--bg2); }
  .toggle-btn { background: none; border: none; color: var(--fg-dim); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; transition: all 0.15s; }
  .toggle-btn:hover { background: var(--bg3); color: var(--fg); }
  .topbar-doc { font-size: 0.85rem; color: var(--fg-dim); font-weight: 500; }
  .topbar-doc strong { color: var(--fg); }
  .topbar-badge { padding: 3px 10px; background: rgba(200,169,126,0.08); border: 1px solid rgba(200,169,126,0.2); border-radius: 20px; font-size: 0.7rem; color: var(--accent); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; display: flex; align-items: center; gap: 5px; }

  /* ── Drop zone ── */
  .drop-zone { flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0; position: relative; overflow: hidden; }
  .drop-zone-grid { position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 48px 48px; opacity: 0.3; mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%); }
  .drop-inner { position: relative; z-index: 1; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; animation: fadeSlideUp 0.5s ease; }
  .drop-icon-ring { width: 80px; height: 80px; border-radius: 50%; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: center; background: var(--bg3); color: var(--accent); position: relative; }
  .drop-icon-ring::before { content: ''; position: absolute; inset: -8px; border-radius: 50%; border: 1px solid rgba(200,169,126,0.15); }
  .drop-title { font-family: 'Instrument Serif', serif; font-size: 1.8rem; color: var(--fg); line-height: 1.2; }
  .drop-title em { color: var(--accent); font-style: italic; }
  .drop-desc { font-size: 0.85rem; color: var(--fg-muted); max-width: 280px; line-height: 1.6; }
  .drop-cta { padding: 11px 28px; background: linear-gradient(135deg, var(--accent), #e8c49a); border: none; border-radius: 24px; color: #0a0a0f; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; cursor: pointer; letter-spacing: 0.03em; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
  .drop-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(200,169,126,0.3); }
  .drag-overlay { border: 2px dashed var(--accent) !important; background: rgba(200,169,126,0.04) !important; }

  /* ── Chat ── */
  .chat-container { flex: 1; overflow-y: auto; padding: 24px 0; }
  .chat-container::-webkit-scrollbar { width: 4px; }
  .chat-container::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 2px; }
  .chat-inner { max-width: 760px; margin: 0 auto; padding: 0 24px; }
  .message { display: flex; gap: 14px; margin-bottom: 24px; animation: fadeSlideUp 0.3s ease; }
  .message.user { flex-direction: row-reverse; }
  .avatar { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; letter-spacing: 0.05em; }
  .avatar.ai { background: linear-gradient(135deg, rgba(200,169,126,0.2), rgba(126,106,245,0.2)); border: 1px solid rgba(200,169,126,0.3); color: var(--accent); }
  .avatar.user { background: linear-gradient(135deg, rgba(126,106,245,0.2), rgba(200,169,126,0.1)); border: 1px solid rgba(126,106,245,0.3); color: var(--accent2); }
  .bubble { max-width: 78%; padding: 14px 18px; border-radius: 16px; line-height: 1.7; font-size: 0.87rem; }
  .bubble.ai { background: var(--bg3); border: 1px solid var(--border); border-top-left-radius: 4px; color: var(--fg-dim); }
  .bubble.user { background: linear-gradient(135deg, rgba(126,106,245,0.15), rgba(200,169,126,0.08)); border: 1px solid rgba(126,106,245,0.2); border-top-right-radius: 4px; color: var(--fg); text-align: right; }
  .msg-meta { display: flex; align-items: center; gap: 6px; margin-top: 5px; }
  .msg-time { font-size: 0.68rem; color: var(--fg-muted); }
  .msg-model-badge { font-size: 0.64rem; padding: 1px 7px; border-radius: 10px; font-weight: 600; letter-spacing: 0.03em; }
  .message.user .msg-meta { justify-content: flex-end; }

  /* ── Suggestions ── */
  .suggestions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 24px; max-width: 760px; margin: 0 auto 16px; }
  .suggestion-chip { padding: 7px 14px; background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; font-size: 0.78rem; color: var(--fg-dim); cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
  .suggestion-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }

  /* ── Input area ── */
  .input-area { border-top: 1px solid var(--border); padding: 16px 20px; background: var(--bg2); }
  .input-wrapper { max-width: 760px; margin: 0 auto; }
  .input-inner { display: flex; gap: 8px; align-items: flex-end; background: var(--bg3); border: 1px solid var(--border-light); border-radius: 14px; padding: 8px 8px 8px 14px; transition: border-color 0.2s; }
  .input-inner:focus-within { border-color: rgba(200,169,126,0.4); box-shadow: 0 0 0 3px rgba(200,169,126,0.06); }
  .input-inner textarea { flex: 1; background: none; border: none; outline: none; color: var(--fg); font-family: 'DM Sans', sans-serif; font-size: 0.875rem; line-height: 1.6; resize: none; max-height: 120px; min-height: 24px; }
  .input-inner textarea::placeholder { color: var(--fg-muted); }
  .input-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; padding-bottom: 2px; }
  .send-btn { width: 36px; height: 36px; background: linear-gradient(135deg, var(--accent), #e8c49a); border: none; border-radius: 10px; color: #0a0a0f; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
  .send-btn:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 4px 12px rgba(200,169,126,0.3); }
  .send-btn:disabled { opacity: 0.4; cursor: default; }
  .input-hint { text-align: center; font-size: 0.68rem; color: var(--fg-muted); margin-top: 8px; }

  /* ── Upload progress toast ── */
  .upload-progress { position: fixed; top: 20px; right: 20px; background: var(--bg3); border: 1px solid var(--border-light); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--fg-dim); z-index: 100; animation: fadeSlideUp 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--border-light); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
`;

export default globalStyles;