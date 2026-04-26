
// import React, { useState } from "react";
// import { Document } from "../types";
// import {
//   BookIcon,
//   UploadIcon,
//   PDFIcon,
//   TrashIcon,
// } from "../icons";
// import { formatSize } from "../utils";

// interface SidebarProps {
//   isOpen: boolean;
//   documents: Document[];
//   activeDoc: Document | null;
//   onUploadClick: () => void;
//   onYoutubeUpload: (url: string) => void; // ✅ NEW
//   onSelectDoc: (doc: Document) => void;
//   onDeleteDoc: (docId: string, e: React.MouseEvent) => void;
// }

// export default function Sidebar({
//   isOpen,
//   documents,
//   activeDoc,
//   onUploadClick,
//   onYoutubeUpload,
//   onSelectDoc,
//   onDeleteDoc,
// }: SidebarProps) {
//   const [youtubeUrl, setYoutubeUrl] = useState("");
//   const [showYoutubeInput, setShowYoutubeInput] = useState(false);

//   const handleYoutubeSubmit = () => {
//     if (!youtubeUrl.trim()) return;
//     onYoutubeUpload(youtubeUrl.trim());
//     setYoutubeUrl("");
//     setShowYoutubeInput(false);
//   };

//   return (
//     <div className={`sidebar ${isOpen ? "" : "collapsed"}`}>
//       {/* ── Header ── */}
//       <div className="sidebar-header">
//         <div className="logo">
//           <div className="logo-icon">
//             <BookIcon />
//           </div>
//           <div>
//             <div className="logo-text">Notebook</div>
//             <div className="logo-sub">Document Intelligence</div>
//           </div>
//         </div>

//         {/* Upload PDF */}
//         <button className="upload-btn" onClick={onUploadClick}>
//           <UploadIcon />
//           Add PDF
//         </button>

//         {/* Add YouTube */}
//         <button
//           className="upload-btn youtube-btn"
//           onClick={() => setShowYoutubeInput((v) => !v)}
//         >
//           🎥 Add YouTube
//         </button>

//         {/* YouTube Input Box */}
//         {showYoutubeInput && (
//           <div className="youtube-input-box">
//             <input
//               type="text"
//               placeholder="Paste YouTube URL..."
//               value={youtubeUrl}
//               onChange={(e) => setYoutubeUrl(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === "Enter") handleYoutubeSubmit();
//               }}
//             />
//             <button onClick={handleYoutubeSubmit}>Add</button>
//           </div>
//         )}
//       </div>

//       {/* ── Document list ── */}
//       <div className="docs-list">
//         {documents.length > 0 && (
//           <div className="docs-label">Your Documents</div>
//         )}

//         {documents.map((doc) => (
//           <div
//             key={doc.id}
//             className={`doc-item ${
//               activeDoc?.id === doc.id ? "active" : ""
//             }`}
//             onClick={() => onSelectDoc(doc)}
//           >
//             <div className="doc-icon">
//               {doc.sourceType === "youtube" ? (
//                 <span style={{ fontSize: "18px" }}>🎥</span>
//               ) : (
//                 <PDFIcon />
//               )}
//             </div>

//             <div className="doc-info">
//               <div className="doc-name">{doc.filename}</div>

//               {doc.sourceType === "pdf" ? (
//                 <div className="doc-meta">
//                   {doc.pages}p · {formatSize(doc.size || 0)}
//                 </div>
//               ) : (
//                 <div className="doc-meta">YouTube Transcript</div>
//               )}
//             </div>

//             <button
//               className="doc-delete"
//               onClick={(e) => onDeleteDoc(doc.id, e)}
//             >
//               <TrashIcon />
//             </button>
//           </div>
//         ))}

//         {documents.length === 0 && (
//           <div
//             style={{
//               padding: "20px 8px",
//               color: "var(--fg-muted)",
//               fontSize: "0.78rem",
//               textAlign: "center",
//               lineHeight: 1.6,
//             }}
//           >
//             No documents yet.
//             <br />
//             Upload a PDF or add a YouTube link.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
import React, { useState } from "react";
import { Document } from "../types";
import {
  UploadIcon,
  PDFIcon,
  TrashIcon,
} from "../icons";
import { formatSize } from "../utils";

import {
  Home,
  Folder,
  MessageSquare,
  Flame,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  documents: Document[];
  activeDoc: Document | null;
  onUploadClick: () => void;
  onYoutubeUpload: (url: string) => void;
  onSelectDoc: (doc: Document) => void;
  onDeleteDoc: (docId: string, e: React.MouseEvent) => void;
}

export default function Sidebar({
  isOpen,
  documents,
  activeDoc,
  onUploadClick,
  onYoutubeUpload,
  onSelectDoc,
  onDeleteDoc,
}: SidebarProps) {
  const navigate = useNavigate();

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl.trim()) return;
    onYoutubeUpload(youtubeUrl.trim());
    setYoutubeUrl("");
    setShowYoutubeInput(false);
  };

  /* MENU */
  const menuItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Projects", icon: Folder, path: "/projects" },
    { name: "AI GPT", icon: Flame, path: "/chat" },
    { name: "Chats", icon: MessageSquare, path: "/chat" },
  ];

  return (
    <div
      style={{
        width: isOpen ? "240px" : "70px",
        background: "#0f172a",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        transition: "0.3s",
        borderRight: "1px solid #1e293b",
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, #7c3aed, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Flame size={18} color="white" />
          </div>

          {isOpen && (
            <div>
              <div style={{ fontWeight: 600 }}>
                FireGPT
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                }}
              >
                AI Workspace
              </div>
            </div>
          )}
        </div>

        {/* BUTTONS */}
        <div style={{ marginTop: "14px" }}>
          <button
            onClick={onUploadClick}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              marginBottom: "8px",
            }}
          >
            <UploadIcon />
            {isOpen && "Add PDF"}
          </button>

          <button
            onClick={() =>
              setShowYoutubeInput((v) => !v)
            }
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            🎥 {isOpen && "Add YouTube"}
          </button>

          {showYoutubeInput && isOpen && (
            <div style={{ marginTop: "10px" }}>
              <input
                type="text"
                placeholder="Paste YouTube URL..."
                value={youtubeUrl}
                onChange={(e) =>
                  setYoutubeUrl(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#020617",
                  color: "white",
                  marginBottom: "6px",
                }}
              />
              <button
                onClick={handleYoutubeSubmit}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  background: "#7c3aed",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MENU */}
      <div style={{ padding: "8px" }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;

          return (
            <div
              key={i}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: isOpen
                  ? "flex-start"
                  : "center",
                gap: "12px",
                padding: "10px",
                borderRadius: "10px",
                cursor: "pointer",
                color: "#cbd5e1",
                marginBottom: "6px",
                transition: "0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#1e293b")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
              }
            >
              <Icon size={20} />
              {isOpen && (
                <span style={{ fontSize: "14px" }}>
                  {item.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* DOCUMENT LIST */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {documents.length > 0 && isOpen && (
          <div
            style={{
              fontSize: "12px",
              color: "#64748b",
              marginBottom: "8px",
            }}
          >
            Your Documents
          </div>
        )}

        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDoc(doc)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px",
              borderRadius: "8px",
              cursor: "pointer",
              background:
                activeDoc?.id === doc.id
                  ? "#1e293b"
                  : "transparent",
              marginBottom: "6px",
            }}
          >
            <div>
              {doc.sourceType === "youtube"
                ? "🎥"
                : <PDFIcon />}
            </div>

            {isOpen && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px" }}>
                  {doc.filename}
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                  }}
                >
                  {doc.sourceType === "pdf"
                    ? `${doc.pages}p · ${formatSize(
                        doc.size || 0
                      )}`
                    : "YouTube Transcript"}
                </div>
              </div>
            )}

            <button
              onClick={(e) =>
                onDeleteDoc(doc.id, e)
              }
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <TrashIcon />
            </button>
          </div>
        ))}

        {documents.length === 0 && isOpen && (
          <div
            style={{
              textAlign: "center",
              fontSize: "12px",
              color: "#64748b",
              marginTop: "20px",
            }}
          >
            No documents yet.
            <br />
            Upload PDF or add YouTube.
          </div>
        )}
      </div>
    </div>
  );
}