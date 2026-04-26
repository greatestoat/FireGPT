import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";
import ai from "../gemini.js";
import openai from "../aiml.js";
import groq from "../groq.js";
import openrouter from "../openrouter.js";
import { search } from "../utils/rag.js";

/* ===================================================
   SEND MESSAGE (Multi Model Support)
=================================================== */
export const sendMessage = async (req, res) => {
  try {
    const { message, chatId, model } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    let finalChatId = chatId;

    /* ===========================
       CREATE NEW CHAT IF NEEDED
    =========================== */
    if (!chatId) {
      finalChatId = uuidv4();

      await pool.query(
        "INSERT INTO chats (id, user_id, title) VALUES (?, ?, ?)",
        [finalChatId, userId, message.substring(0, 30)]
      );
    }

    /* ===========================
       SAVE USER MESSAGE
    =========================== */
    await pool.query(
      "INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, 'user', ?)",
      [uuidv4(), finalChatId, message]
    );

    /* ===========================
       GET CHAT HISTORY
    =========================== */
    const [rows] = await pool.query(
      "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
      [finalChatId]
    );

    let aiReply = "";

    /* ===================================================
       🔥 MODEL SWITCH LOGIC
    =================================================== */

    // ─────────────────────────────────────────
    // 🟢 GEMINI  (Google Gemini 2.0 Flash)
    // ─────────────────────────────────────────
    if (model === "Gemini") {
      const contents = rows.map((r) => ({
        role: r.role === "assistant" ? "model" : "user",
        parts: [{ text: r.content }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
      });

      aiReply = response.text || "No response from Gemini.";
    }

    // ─────────────────────────────────────────
    // 🔵 AI/ML  (GPT-4o Mini via AI/ML API)
    // ─────────────────────────────────────────
    else if (model === "AI/ML Pro" || model === "GPT-4") {
      const messages = rows.map((r) => ({
        role: r.role,
        content: r.content,
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });

      aiReply =
        response.choices?.[0]?.message?.content || "No response from AI/ML.";
    }

    // ─────────────────────────────────────────
    // 🟠 GROQ  (LLaMA 3.3 70B — ultra fast)
    // ─────────────────────────────────────────
    else if (model === "Groq") {
      const messages = rows.map((r) => ({
        role: r.role,
        content: r.content,
      }));

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile", // alternatives: "mixtral-8x7b-32768", "llama3-8b-8192"
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      aiReply =
        response.choices?.[0]?.message?.content || "No response from Groq.";
    }

    // ─────────────────────────────────────────
    // 🔴 OPENROUTER  (Meta LLaMA 3.3 70B)
    // ─────────────────────────────────────────
    else if (model === "OpenRouter") {
      const messages = rows.map((r) => ({
        role: r.role,
        content: r.content,
      }));

      const response = await openrouter.chat.completions.create({
        model: "meta-llama/llama-3.3-70b-instruct", // swap to any model on openrouter.ai/models
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      aiReply =
        response.choices?.[0]?.message?.content ||
        "No response from OpenRouter.";
    }

    // ─────────────────────────────────────────
    // ❌ UNKNOWN MODEL FALLBACK
    // ─────────────────────────────────────────
    else {
      return res.status(400).json({ message: `Unknown model: "${model}"` });
    }

    /* ===========================
       SAVE AI REPLY
    =========================== */
    await pool.query(
      "INSERT INTO messages (id, chat_id, role, content) VALUES (?, ?, 'assistant', ?)",
      [uuidv4(), finalChatId, aiReply]
    );

    /* ===========================
       RESPONSE
    =========================== */
    res.json({
      chatId: finalChatId,
      reply: aiReply,
    });

  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({
      message: "Failed to process chat",
      error: error?.message || "Unknown error",
    });
  }
};


/* ===================================================
   GET ALL CHATS
=================================================== */
export const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM chats WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching chats" });
  }
};


/* ===================================================
   GET MESSAGES OF CHAT
=================================================== */
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
      [chatId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching messages" });
  }
};


/* ===================================================
   DELETE CHAT
=================================================== */
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const [chat] = await pool.query(
      "SELECT * FROM chats WHERE id = ? AND user_id = ?",
      [chatId, userId]
    );

    if (chat.length === 0) {
      return res.status(404).json({ message: "Chat not found" });
    }

    await pool.query("DELETE FROM messages WHERE chat_id = ?", [chatId]);
    await pool.query("DELETE FROM chats WHERE id = ?", [chatId]);

    res.json({ message: "Chat deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

export const chat = async (req, res) => {
  try {
    const { question, history = [] } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    // 1. Retrieve top 5 relevant chunks via RAG
    const relevantChunks = await search(question, 5);

    if (relevantChunks.length === 0) {
      return res.status(400).json({
        error: "No video loaded yet. Please upload a YouTube video first.",
      });
    }

    const context = relevantChunks.join("\n\n---\n\n");

    // 2. Build messages — system prompt carries the RAG context
    const systemMessage = {
      role: "system",
      content: `You are a helpful notebook assistant analyzing a YouTube video transcript.
Answer questions using ONLY the transcript context provided below.
If the answer is not in the context, say: "I couldn't find that in this video's transcript."
Be concise and use bullet points when listing multiple items.

TRANSCRIPT CONTEXT:
${context}`,
    };

    // 3. Map history + new question into OpenRouter format
    const historyMessages = history.map((h) => ({
      role: h.role,       // "user" or "assistant"
      content: h.content,
    }));

    const messages = [
      systemMessage,
      ...historyMessages,
      { role: "user", content: question },
    ];

    // 4. Call OpenRouter — same pattern as your chatController
    const response = await openrouter.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages,
      temperature: 0.5,   // lower = more factual, better for RAG
      max_tokens: 1024,
    });

    const answer =
      response.choices?.[0]?.message?.content ||
      "No response from OpenRouter.";

    return res.json({ answer });

  } catch (error) {
    console.error("Notebook Chat Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process chat",
    });
  }
};
