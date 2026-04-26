import React from "react";
import { Document, ModelOption } from "../types";
// import { MenuIcon, SparkleIcon } from "../icons";
import { MenuIcon, SparkleIcon } from "../icons";
interface TopbarProps {
  activeDoc: Document | null;
  selectedModel: ModelOption;
  onToggleSidebar: () => void;
}

export default function Topbar({ activeDoc, selectedModel, onToggleSidebar }: TopbarProps) {
  return (
    <div className="topbar">
      {/* Sidebar toggle */}
      <button className="toggle-btn" onClick={onToggleSidebar}>
        <MenuIcon />
      </button>

      {/* Active document name */}
      <div className="topbar-doc">
        {activeDoc ? (
          <>
            <strong>{activeDoc.filename}</strong> · {activeDoc.pages} pages
          </>
        ) : (
          "No document selected"
        )}
      </div>

      {/* Right side: active model + AI badge */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            background: selectedModel.colorDim,
            border: `1px solid ${selectedModel.borderColor}`,
            borderRadius: 20,
            fontSize: "0.7rem",
            color: selectedModel.color,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: selectedModel.color,
              display: "inline-block",
            }}
          />
          {selectedModel.label}
        </div>

        <div className="topbar-badge">
          <SparkleIcon /> &nbsp;AI Powered
        </div>
      </div>
    </div>
  );
}