import React, { useRef, useEffect } from "react";
import { Message } from "../types";
import { MODEL_OPTIONS } from "../constants";
import { renderMarkdown, formatTime } from "../utils";
import TypingDots from "./TypingDots";

const SUGGESTED_QUESTIONS = [
  "Summarize the key points of this document",
  "What are the main conclusions?",
  "List all important dates or numbers mentioned",
  "What problem does this document address?",
];

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick: (q: string) => void;
}

export default function ChatWindow({
  messages,
  isLoading,
  onSuggestionClick,
}: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="chat-container">
      <div className="chat-inner">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role === "user" ? "user" : ""}`}>
            {/* Avatar */}
            <div className={`avatar ${msg.role === "user" ? "user" : "ai"}`}>
              {msg.role === "user" ? "YOU" : "AI"}
            </div>

            {/* Bubble + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`bubble ${msg.role === "user" ? "user" : "ai"}`}>
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
              </div>

              {/* Timestamp + model badge */}
              <div className="msg-meta">
                {msg.role === "assistant" && msg.modelLabel && (() => {
                  const m = MODEL_OPTIONS.find((m) => m.shortLabel === msg.modelLabel);
                  return m ? (
                    <span
                      className="msg-model-badge"
                      style={{
                        background: m.colorDim,
                        color: m.color,
                        border: `1px solid ${m.borderColor}`,
                      }}
                    >
                      {m.shortLabel}
                    </span>
                  ) : null;
                })()}
                <span className="msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="message">
            <div className="avatar ai">AI</div>
            <div className="bubble ai">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips — only shown at conversation start */}
      {messages.length <= 1 && (
        <div className="suggestions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              className="suggestion-chip"
              onClick={() => onSuggestionClick(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}