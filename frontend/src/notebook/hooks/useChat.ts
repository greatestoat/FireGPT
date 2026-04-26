import { useState, useCallback } from "react";
// import { Document, Message, ModelOption } from "../types";
import { Document, Message, ModelOption } from "../types";
import { API, MODEL_OPTIONS } from "../constants";

export function useChat() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(MODEL_OPTIONS[0]);

  // ── Fetch all documents ────────────────────────────────────────────────────
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API}/documents`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      // Server might not be running yet
    }
  };

  // ── Upload a PDF ───────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    setUploadProgress("Reading your document...");
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        const newDoc: Document = {
          id: data.docId,
          filename: data.filename,
          pages: data.pages,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          preview: data.preview,
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setActiveDoc(newDoc);
        setMessages([
          {
            role: "assistant",
            content: `📄 **${data.filename}** has been loaded successfully.\n\n${data.pages} pages analyzed. I'm ready to answer your questions about this document. What would you like to know?`,
            timestamp: new Date(),
          },
        ]);
        setUploadProgress(null);
      } else {
        setUploadProgress(null);
        alert(data.error || "Upload failed");
      }
    } catch {
      setUploadProgress(null);
      alert("Failed to connect to server. Make sure your backend is running.");
    }
  };

  // ── Handle file drop ───────────────────────────────────────────────────────
  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Send a chat message ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !activeDoc || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const q = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: activeDoc.id,
          question: q,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          provider: selectedModel.provider,
          model: selectedModel.model,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || data.error || "Something went wrong.",
          timestamp: new Date(),
          modelLabel: selectedModel.shortLabel,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please check your backend server.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete a document ──────────────────────────────────────────────────────
  const handleDeleteDoc = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/documents/${docId}`, { method: "DELETE" });
    } catch {}
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (activeDoc?.id === docId) {
      setActiveDoc(null);
      setMessages([]);
    }
  };

  // ── Switch active document ─────────────────────────────────────────────────
  const selectDoc = (doc: Document) => {
    if (activeDoc?.id === doc.id) return;
    setActiveDoc(doc);
    setMessages([
      {
        role: "assistant",
        content: `Switched to **${doc.filename}**. Ask me anything about this document.`,
        timestamp: new Date(),
      },
    ]);
  };

  return {
    // state
    documents,
    activeDoc,
    messages,
    input,
    isLoading,
    uploadProgress,
    selectedModel,
    // setters
    setInput,
    setSelectedModel,
    // actions
    fetchDocuments,
    handleUpload,
    handleFileDrop,
    handleSend,
    handleDeleteDoc,
    selectDoc,
  };
}