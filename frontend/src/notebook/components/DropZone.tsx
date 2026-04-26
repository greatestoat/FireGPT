import React from "react";
// import { BookIcon, UploadIcon } from "../icons";
import { BookIcon, UploadIcon } from "../icons";

interface DropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onUploadClick: () => void;
}

export default function DropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
}: DropZoneProps) {
  return (
    <div
      className={`drop-zone ${isDragging ? "drag-overlay" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="drop-zone-grid" />
      <div className="drop-inner">
        <div className="drop-icon-ring">
          <BookIcon />
        </div>
        <div className="drop-title">
          Ask anything about
          <br />
          your <em>documents</em>
        </div>
        <div className="drop-desc">
          Upload any PDF — research papers, contracts, reports — and ask questions in plain language.
        </div>
        <button className="drop-cta" onClick={onUploadClick}>
          <UploadIcon />
          Choose PDF to upload
        </button>
        <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>
          or drag & drop · up to 20MB
        </div>
      </div>
    </div>
  );
}