
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // base64 data URLs
}

interface Model {
  id: string;
  name: string;
  provider: string;
  desc: string;
  color: string;
  accent: string;
  tag: string;
}

const MODELS: Model[] = [
  {
    id: "GPT-4",
    name: "GPT-4o Mini",
    provider: "AI/ML",
    desc: "OpenAI via AI/ML API",
    color: "#10a37f",
    accent: "rgba(16,163,127,0.15)",
    tag: "Popular",
  },
  {
    id: "Gemini",
    name: "Gemini Flash",
    provider: "Google",
    desc: "Google Gemini 2.0",
    color: "#4285f4",
    accent: "rgba(66,133,244,0.15)",
    tag: "Fast",
  },
  {
    id: "AI/ML Pro",
    name: "AI/ML Pro",
    provider: "AI/ML",
    desc: "Optimized GPT variant",
    color: "#a855f7",
    accent: "rgba(168,85,247,0.15)",
    tag: "Pro",
  },
  {
    id: "Groq",
    name: "LLaMA 3.3 70B",
    provider: "Groq",
    desc: "Ultra-fast inference",
    color: "#f97316",
    accent: "rgba(249,115,22,0.15)",
    tag: "⚡ Fast",
  },
  {
    id: "OpenRouter",
    name: "LLaMA 3.3 70B",
    provider: "OpenRouter",
    desc: "Meta via OpenRouter",
    color: "#ec4899",
    accent: "rgba(236,72,153,0.15)",
    tag: "New",
  },
];

const renderContent = (text: string) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0];
      const code = lines.slice(1).join("\n");
      return (
        <pre
          key={i}
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            padding: "14px 16px",
            overflowX: "auto",
            fontSize: "12.5px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 1.6,
            margin: "8px 0",
            color: "#e2e8f0",
          }}
        >
          {lang && (
            <div
              style={{
                fontSize: "10px",
                color: "#64748b",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }
    return (
      <span key={i} style={{ whiteSpace: "pre-wrap" }}>
        {part}
      </span>
    );
  });
};

// ── Convert File/Blob to base64 data URL
const toBase64 = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ChatArea: React.FC = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // ── Image state
  const [pendingImages, setPendingImages] = useState<string[]>([]); // base64 data URLs
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId);
      setCurrentChatId(chatId);
    } else {
      setMessages([]);
      setCurrentChatId(undefined);
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  // ── Handle paste (Ctrl+V image)
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;

    e.preventDefault();
    const newImages: string[] = [];
    for (const item of imageItems) {
      const blob = item.getAsFile();
      if (blob) {
        const b64 = await toBase64(blob);
        newImages.push(b64);
      }
    }
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 4)); // max 4 images
  }, []);

  // ── Handle file input upload
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const newImages: string[] = [];
    for (const file of imageFiles) {
      const b64 = await toBase64(file);
      newImages.push(b64);
    }
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 4));
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Drag & drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    const newImages: string[] = [];
    for (const file of files) {
      const b64 = await toBase64(file);
      newImages.push(b64);
    }
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 4));
  }, []);

  const removeImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const loadMessages = async (id: string) => {
    try {
      const res = await api.get(`/chat/${id}`);
      setMessages(res.data);
    } catch {
      console.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && pendingImages.length === 0) || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      images: pendingImages.length > 0 ? [...pendingImages] : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPendingImages([]);
    setLoading(true);

    try {
      const res = await api.post("/chat", {
        message: input,
        chatId: currentChatId,
        model: selectedModel.id,
        images: userMessage.images, // send base64 to backend
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply },
      ]);

      if (!currentChatId) {
        navigate(`/chat/${res.data.chatId}`);
        window.dispatchEvent(new Event("chatCreated"));
      }
      setCurrentChatId(res.data.chatId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        .chat-root {
          font-family: 'DM Sans', sans-serif;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0c0c0f;
          color: #e8e8ed;
          position: relative;
          overflow: hidden;
        }

        .chat-root::before {
          content: '';
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── MODEL SWITCHER ── */
        .model-bar {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: center;
          padding: 18px 24px 0;
        }
        .model-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 100px;
          padding: 8px 16px 8px 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(12px);
        }
        .model-trigger:hover {
          border-color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.07);
        }
        .model-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .model-trigger-text {
          font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 600; color: #e8e8ed;
        }
        .model-trigger-provider { font-size: 11px; color: #6b7280; font-weight: 400; }
        .chevron {
          width: 14px; height: 14px; color: #6b7280;
          transition: transform 0.25s ease; flex-shrink: 0;
        }
        .chevron.open { transform: rotate(180deg); }
        .model-panel {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          background: #131317;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 16px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
          overflow: hidden;
          animation: panelIn 0.18s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes panelIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .panel-header {
          padding: 12px 16px 8px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #4b5563; font-family: 'Syne', sans-serif;
        }
        .model-option {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px; cursor: pointer;
          transition: background 0.15s ease;
        }
        .model-option:hover { background: rgba(255,255,255,0.04); }
        .model-option.active { background: rgba(255,255,255,0.06); }
        .option-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700;
          font-family: 'Syne', sans-serif; flex-shrink: 0;
        }
        .option-info { flex: 1; min-width: 0; }
        .option-name { font-size: 13px; font-weight: 600; font-family: 'Syne', sans-serif; color: #e2e8f0; }
        .option-desc { font-size: 11px; color: #6b7280; margin-top: 1px; }
        .option-tag {
          font-size: 10px; font-weight: 700;
          padding: 2px 7px; border-radius: 100px;
          font-family: 'Syne', sans-serif; letter-spacing: 0.03em;
        }
        .check-icon { width: 16px; height: 16px; color: #10a37f; flex-shrink: 0; }

        /* ── MESSAGES ── */
        .messages-area {
          flex: 1; overflow-y: auto;
          padding: 24px 0; scroll-behavior: smooth;
          position: relative; z-index: 1;
        }
        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08); border-radius: 2px;
        }
        .messages-inner {
          max-width: 720px; margin: 0 auto;
          padding: 0 24px;
          display: flex; flex-direction: column; gap: 20px;
        }
        .empty-state {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 24px; gap: 12px; text-align: center;
        }
        .empty-glyph { font-size: 36px; margin-bottom: 4px; opacity: 0.6; }
        .empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px; font-weight: 700;
          color: #3d3d4a; letter-spacing: -0.02em;
        }
        .empty-sub { font-size: 13px; color: #2d2d38; }

        .msg-row { display: flex; animation: msgIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.assistant { justify-content: flex-start; }

        .msg-bubble {
          max-width: 78%; padding: 12px 16px;
          border-radius: 18px; font-size: 14px; line-height: 1.65;
        }
        .msg-bubble.user {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #fff; border-bottom-right-radius: 4px;
        }
        .msg-bubble.assistant {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.07);
          color: #d1d5db; border-bottom-left-radius: 4px;
        }
        .msg-label {
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          font-family: 'Syne', sans-serif; margin-bottom: 6px;
          display: flex; align-items: center; gap: 6px;
        }

        /* ── MESSAGE IMAGES ── */
        .msg-images {
          display: flex; flex-wrap: wrap; gap: 6px;
          margin-bottom: 8px;
        }
        .msg-img {
          max-width: 200px; max-height: 160px;
          border-radius: 10px; object-fit: cover;
          border: 1px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .msg-img:hover { opacity: 0.85; }

        /* Thinking */
        .thinking-row { display: flex; justify-content: flex-start; animation: msgIn 0.25s cubic-bezier(0.16,1,0.3,1); }
        .thinking-bubble {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px; border-bottom-left-radius: 4px;
          padding: 14px 18px; display: flex; align-items: center; gap: 5px;
        }
        .thinking-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4f46e5; animation: blink 1.2s ease-in-out infinite;
        }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1); }
        }

        /* ── INPUT AREA ── */
        .input-zone {
          position: relative; z-index: 5;
          padding: 12px 24px 24px;
          background: linear-gradient(to top, #0c0c0f 80%, transparent);
        }
        .input-wrap { max-width: 720px; margin: 0 auto; }

        /* Drag overlay */
        .drop-zone {
          position: relative;
        }
        .drop-zone.drag-active::after {
          content: 'Drop image here';
          position: absolute;
          inset: 0;
          border-radius: 20px;
          background: rgba(79,70,229,0.18);
          border: 2px dashed rgba(99,102,241,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #818cf8;
          font-family: 'Syne', sans-serif;
          z-index: 10;
          pointer-events: none;
        }

        /* Pending image thumbnails */
        .pending-images {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 10px 14px 0;
        }
        .pending-thumb {
          position: relative;
          width: 64px; height: 64px;
          border-radius: 10px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
          animation: thumbIn 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes thumbIn {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        .pending-thumb img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .thumb-remove {
          position: absolute; top: 3px; right: 3px;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: rgba(0,0,0,0.75);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 10px; line-height: 1;
          transition: background 0.15s;
        }
        .thumb-remove:hover { background: rgba(239,68,68,0.9); }

        .input-shell {
          display: flex; align-items: flex-end; gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 12px 12px 12px 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          flex-direction: column;
        }
        .input-shell.focused {
          border-color: rgba(99,102,241,0.45);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }
        .input-shell.drag-over {
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }

        .input-row {
          display: flex; align-items: flex-end;
          gap: 10px; width: 100%;
        }

        .chat-textarea {
          flex: 1; background: transparent;
          border: none; outline: none; resize: none;
          color: #e8e8ed; font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          line-height: 1.6; min-height: 24px; max-height: 160px;
          overflow-y: auto;
        }
        .chat-textarea::placeholder { color: #3d3d4a; }
        .chat-textarea::-webkit-scrollbar { display: none; }

        /* Upload button */
        .upload-btn {
          width: 36px; height: 36px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          cursor: pointer; display: flex;
          align-items: center; justify-content: center;
          color: #6b7280; flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .upload-btn:hover {
          background: rgba(99,102,241,0.15);
          border-color: rgba(99,102,241,0.4);
          color: #818cf8;
        }

        .send-btn {
          width: 38px; height: 38px; border-radius: 12px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s ease;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: #fff;
        }
        .send-btn:disabled {
          background: rgba(255,255,255,0.06);
          color: #3d3d4a; cursor: not-allowed;
        }
        .send-btn:not(:disabled):hover {
          transform: scale(1.07);
          box-shadow: 0 4px 16px rgba(79,70,229,0.4);
        }
        .send-btn:not(:disabled):active { transform: scale(0.96); }

        .input-hint {
          text-align: center; font-size: 11px;
          color: #2a2a35; margin-top: 10px; letter-spacing: 0.01em;
        }

        /* Lightbox */
        .lightbox {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.85);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.15s ease;
          cursor: zoom-out;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .lightbox img {
          max-width: 90vw; max-height: 90vh;
          border-radius: 12px; box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          cursor: default;
        }
        .lightbox-close {
          position: absolute; top: 20px; right: 24px;
          background: rgba(255,255,255,0.1); border: none;
          color: #fff; font-size: 22px; width: 40px; height: 40px;
          border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .lightbox-close:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <div className="chat-root">

        {/* ── MODEL SWITCHER ── */}
        <div className="model-bar" ref={dropdownRef}>
          <div style={{ position: "relative" }}>
            <button className="model-trigger" onClick={() => setIsOpen(!isOpen)}>
              <span className="model-dot" style={{ background: selectedModel.color }} />
              <span className="model-trigger-text">{selectedModel.name}</span>
              <span className="model-trigger-provider">· {selectedModel.provider}</span>
              <svg className={`chevron${isOpen ? " open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="model-panel">
                <div className="panel-header">Select Model</div>
                {MODELS.map((m) => (
                  <div
                    key={m.id}
                    className={`model-option${selectedModel.id === m.id ? " active" : ""}`}
                    onClick={() => { setSelectedModel(m); setIsOpen(false); }}
                  >
                    <div className="option-icon" style={{ background: m.accent, color: m.color }}>
                      {m.provider.slice(0, 2)}
                    </div>
                    <div className="option-info">
                      <div className="option-name">{m.name}</div>
                      <div className="option-desc">{m.desc}</div>
                    </div>
                    <span className="option-tag" style={{ background: m.accent, color: m.color }}>
                      {m.tag}
                    </span>
                    {selectedModel.id === m.id && (
                      <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div className="messages-area">
          <div className="messages-inner">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-glyph">✦</div>
                <div className="empty-title">Where should we begin?</div>
                <div className="empty-sub">Ask anything. {selectedModel.name} is ready.</div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  <div className={`msg-bubble ${msg.role}`}>
                    {msg.role === "assistant" && (
                      <div className="msg-label">
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedModel.color, display: "inline-block" }} />
                        {selectedModel.provider}
                      </div>
                    )}
                    {/* Render attached images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className="msg-images">
                        {msg.images.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`attachment-${idx}`}
                            className="msg-img"
                            onClick={() => setLightboxSrc(src)}
                          />
                        ))}
                      </div>
                    )}
                    {msg.content && renderContent(msg.content)}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="thinking-row">
                <div className="thinking-bubble">
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                  <div className="thinking-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── INPUT ── */}
        <div className="input-zone">
          <div className="input-wrap">
            <div
              className={`input-shell drop-zone${inputFocused ? " focused" : ""}${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {/* Pending image thumbnails */}
              {pendingImages.length > 0 && (
                <div className="pending-images">
                  {pendingImages.map((src, idx) => (
                    <div key={idx} className="pending-thumb">
                      <img src={src} alt={`pending-${idx}`} />
                      <button className="thumb-remove" onClick={() => removeImage(idx)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="input-row">
                {/* Upload button */}
                <button
                  className="upload-btn"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>

                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onPaste={handlePaste}
                  placeholder="Ask anything… or paste / drop an image"
                  rows={1}
                />

                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={(!input.trim() && pendingImages.length === 0) || loading}
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="input-hint">
              Enter to send · Shift+Enter for new line · Paste or drop image
            </div>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div className="lightbox" onClick={() => setLightboxSrc(null)}>
          <button className="lightbox-close" onClick={() => setLightboxSrc(null)}>✕</button>
          <img src={lightboxSrc} alt="preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default ChatArea;