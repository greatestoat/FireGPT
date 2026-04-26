import React, { useRef, useEffect, useState } from "react";

// ── Styles ─────────────────────────────────────────────────────────────
import globalStyles from "./styles/globalStyles";

// ── Hook ───────────────────────────────────────────────────────────────
import { useChat } from "./hooks/useChat";

// ── Components ─────────────────────────────────────────────────────────
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import DropZone from "./components/DropZone";
import ChatWindow from "./components/ChatWindow";
import ChatInput from "./components/ChatInput";

export default function NotebookApp() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const {
    documents,
    activeDoc,
    messages,
    input,
    isLoading,
    uploadProgress,
    selectedModel,
    setInput,
    setSelectedModel,
    fetchDocuments,
    handleUpload,
    handleFileDrop,
    handleSend,
    handleDeleteDoc,
    selectDoc,
  } = useChat();

  // Fetch document list on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // ─────────────────────────────────────────────────────────────────────
  // ✅ YOUTUBE UPLOAD FUNCTION (FIXED)
  // ─────────────────────────────────────────────────────────────────────
  const handleYoutubeUpload = async (url: string) => {
    try {
      if (!url.trim()) return;

      const response = await fetch(
        "http://localhost:5000/api/youtube/upload",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "YouTube upload failed");
      }

      console.log("YouTube processed:", data);

      // Refresh documents list (if backend stores it)
      await fetchDocuments();

      alert("YouTube video added successfully 🎥");

    } catch (error: any) {
      console.error("YouTube upload error:", error);
      alert(error.message);
    }
  };

  // ── Drag helpers ─────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    setIsDragging(false);
    handleFileDrop(e);
  };

  // ── Suggestion click ─────────────────────────────────────────────────
  const handleSuggestionClick = (q: string) => {
    setInput(q);
  };

  return (
    <>
      <style>{globalStyles}</style>

      <div className="app">
        {/* ── Sidebar ── */}
        <Sidebar
          isOpen={sidebarOpen}
          documents={documents}
          activeDoc={activeDoc}
          onUploadClick={() => fileInputRef.current?.click()}
          onSelectDoc={selectDoc}
          onDeleteDoc={handleDeleteDoc}
          onYoutubeUpload={handleYoutubeUpload}  
        />

        {/* ── Main panel ── */}
        <div className="main">
          <Topbar
            activeDoc={activeDoc}
            selectedModel={selectedModel}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
          />

          {!activeDoc ? (
            <DropZone
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <>
              <ChatWindow
                messages={messages}
                isLoading={isLoading}
                onSuggestionClick={handleSuggestionClick}
              />

              <ChatInput
                input={input}
                isLoading={isLoading}
                activeDocName={activeDoc.filename}
                selectedModel={selectedModel}
                onInputChange={setInput}
                onSend={handleSend}
                onModelSelect={setSelectedModel}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = "";
        }}
      />

      {/* ── Upload progress toast ── */}
      {uploadProgress && (
        <div className="upload-progress">
          <div className="spinner" />
          {uploadProgress}
        </div>
      )}
    </>
  );
}