import { v4 as uuidv4 } from "uuid";
import pool from "../config/db.js";
import openrouter from "../openrouter.js";

/* ===================================================
   SEND MESSAGE IN SUB-APP
=================================================== */
export const sendSubAppMessage = async (req, res) => {
  try {
    const { message, subChatId, appType = 'default', model = 'OpenRouter' } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    let finalSubChatId = subChatId;

    /* ===========================
       CREATE NEW SUB-CHAT IF NEEDED
    =========================== */
    if (!subChatId) {
      finalSubChatId = uuidv4();

      await pool.query(
        "INSERT INTO sub_app_chats (id, user_id, title, app_type) VALUES (?, ?, ?, ?)",
        [finalSubChatId, userId, message.substring(0, 30), appType]
      );
    }

    /* ===========================
       SAVE USER MESSAGE
    =========================== */
    await pool.query(
      "INSERT INTO sub_app_messages (id, sub_chat_id, role, content) VALUES (?, ?, 'user', ?)",
      [uuidv4(), finalSubChatId, message]
    );

    /* ===========================
       GET CHAT HISTORY
    =========================== */
    const [rows] = await pool.query(
      "SELECT role, content FROM sub_app_messages WHERE sub_chat_id = ? ORDER BY created_at ASC",
      [finalSubChatId]
    );

    const messages = rows.map((r) => ({
      role: r.role,
      content: r.content,
    }));

    /* ===========================
       AI CALL (OpenRouter)
    =========================== */
    const response = await openrouter.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const aiReply = response.choices?.[0]?.message?.content || "No response.";

    /* ===========================
       SAVE AI REPLY
    =========================== */
    await pool.query(
      "INSERT INTO sub_app_messages (id, sub_chat_id, role, content) VALUES (?, ?, 'assistant', ?)",
      [uuidv4(), finalSubChatId, aiReply]
    );

    /* ===========================
       RESPONSE
    =========================== */
    res.json({
      subChatId: finalSubChatId,
      reply: aiReply,
    });

  } catch (error) {
    console.error("Sub-app Chat Error:", error);
    res.status(500).json({
      message: "Failed to process sub-app chat",
      error: error?.message || "Unknown error",
    });
  }
};


/* ===================================================
   GET ALL SUB-APP CHATS
=================================================== */
export const getSubAppChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { appType } = req.query;

    let query = "SELECT * FROM sub_app_chats WHERE user_id = ?";
    const params = [userId];

    if (appType) {
      query += " AND app_type = ?";
      params.push(appType);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching sub-app chats" });
  }
};


/* ===================================================
   GET MESSAGES OF SUB-APP CHAT
=================================================== */
export const getSubAppMessages = async (req, res) => {
  try {
    const { subChatId } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM sub_app_messages WHERE sub_chat_id = ? ORDER BY created_at ASC",
      [subChatId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching sub-app messages" });
  }
};


/* ===================================================
   DELETE SUB-APP CHAT
=================================================== */
export const deleteSubAppChat = async (req, res) => {
  try {
    const { subChatId } = req.params;
    const userId = req.user.id;

    const [chat] = await pool.query(
      "SELECT * FROM sub_app_chats WHERE id = ? AND user_id = ?",
      [subChatId, userId]
    );

    if (chat.length === 0) {
      return res.status(404).json({ message: "Sub-app chat not found" });
    }

    await pool.query("DELETE FROM sub_app_messages WHERE sub_chat_id = ?", [subChatId]);
    await pool.query("DELETE FROM sub_app_chats WHERE id = ?", [subChatId]);

    res.json({ message: "Sub-app chat deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete sub-app chat" });
  }
};
