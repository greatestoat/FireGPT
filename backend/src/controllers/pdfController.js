// const pdfParse = require("pdf-parse");
// const fs = require("fs");
// const path = require("path");
// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const OpenAI = require("openai");

// const pdfStore = new Map();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const { initRAG, chunkText, createEmbedding, getIndex } = require("../utils/rag");

// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
//   defaultHeaders: {
//     "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
//     "X-Title": "Folio-PDF-Chat",
//   },
// });

// // Upload & extract PDF text
// exports.uploadPDF = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "No PDF file uploaded" });
//     }

//     const fileBuffer = fs.readFileSync(req.file.path);
//     const pdfData = await pdfParse(fileBuffer);

//     const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
//     pdfStore.set(docId, {
//       id: docId,
//       filename: req.file.originalname,
//       text: pdfData.text,
//       pages: pdfData.numpages,
//       uploadedAt: new Date().toISOString(),
//       size: req.file.size,
//     });

//     // Clean up uploaded file
//     fs.unlinkSync(req.file.path);

//     res.json({
//       success: true,
//       docId,
//       filename: req.file.originalname,
//       pages: pdfData.numpages,
//       preview: pdfData.text.slice(0, 300) + "...",
//     });
//   } catch (err) {
//     console.error("PDF upload error:", err);
//     res.status(500).json({ error: "Failed to process PDF" });
//   }
// };

// // Ask question about uploaded PDF
// exports.askQuestion = async (req, res) => {
//   try {
//     // provider: "gemini" | "openrouter"
//     // model: e.g. "gemini-1.5-flash" | "openai/gpt-4o-mini" | "anthropic/claude-3-haiku"
//     const { docId, question, history = [], provider = "gemini", model } = req.body;

//     if (!docId || !question) {
//       return res.status(400).json({ error: "docId and question are required" });
//     }

//     const doc = pdfStore.get(docId);
//     if (!doc) {
//       return res.status(404).json({ error: "Document not found. Please re-upload." });
//     }

//     // Truncate text to fit context window (~30k chars)
//     const contextText = doc.text.slice(0, 30000);

//     const systemPrompt = `You are an expert document analyst. You have been given the full text of a PDF document titled "${doc.filename}".

// Answer the user's questions STRICTLY based on the document content. If the answer is not in the document, clearly say so. Be precise, cite relevant sections when possible, and format your answers clearly using markdown.

// DOCUMENT CONTENT:
// ---
// ${contextText}
// ---`;

//     let answer = "";

//     // ── Gemini ──────────────────────────────────────────────────────────────
//     if (provider === "gemini") {
//       const geminiModel = model || "gemini-1.5-flash";
//       const geminiInstance = genAI.getGenerativeModel({ model: geminiModel });

//       const chatHistory = history.map((msg) => ({
//         role: msg.role === "assistant" ? "model" : "user",
//         parts: [{ text: msg.content }],
//       }));

//       const chat = geminiInstance.startChat({
//         history: [
//           { role: "user", parts: [{ text: systemPrompt }] },
//           {
//             role: "model",
//             parts: [{ text: "Understood. I have read and analyzed the document. Ask me anything about it." }],
//           },
//           ...chatHistory,
//         ],
//       });

//       const result = await chat.sendMessage(question);
//       answer = result.response.text();
//     }

//     // ── OpenRouter ───────────────────────────────────────────────────────────
//     else if (provider === "openrouter") {
//       const openrouterModel = model || "openai/gpt-4o-mini";

//       const messages = [
//         { role: "system", content: systemPrompt },
//         ...history.map((msg) => ({
//           role: msg.role,
//           content: msg.content,
//         })),
//         { role: "user", content: question },
//       ];

//       const completion = await openrouter.chat.completions.create({
//         model: openrouterModel,
//         messages,
//       });

//       answer = completion.choices[0].message.content;
//     } else {
//       return res.status(400).json({ error: "Invalid provider. Use 'gemini' or 'openrouter'." });
//     }

//     res.json({ success: true, answer, docId, provider, model: model || (provider === "gemini" ? "gemini-1.5-flash" : "openai/gpt-4o-mini") });
//   } catch (err) {
//     console.error("Q&A error:", err);
//     res.status(500).json({ error: "Failed to answer question" });
//   }
// };

// // List all uploaded documents
// exports.listDocuments = async (req, res) => {
//   const docs = Array.from(pdfStore.values()).map(({ id, filename, pages, uploadedAt, size }) => ({
//     id,
//     filename,
//     pages,
//     uploadedAt,
//     size,
//   }));
//   res.json({ documents: docs });
// };

// // Delete a document
// exports.deleteDocument = async (req, res) => {
//   const { docId } = req.params;
//   if (pdfStore.has(docId)) {
//     pdfStore.delete(docId);
//     res.json({ success: true });
//   } else {
//     res.status(404).json({ error: "Document not found" });
//   }
// };
const pdfParse = require("pdf-parse");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const pdfStore = new Map();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ RAG IMPORT (HNSW VERSION)
const { initRAG, chunkText, addChunks, search } = require("../utils/rag");

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
    "X-Title": "Folio-PDF-Chat",
  },
});


// =====================================================
// 📄 Upload & Process PDF (Chunk + Embed + Store)
// =====================================================

exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    await initRAG(); // 🔥 Initialize embedding model + vector index

    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);

    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 🔥 STEP 1: Chunk text
    const chunks = chunkText(pdfData.text);

    // 🔥 STEP 2: Create embeddings + store in vector DB
    await addChunks(chunks);

    // Save metadata (NOT full text anymore)
    pdfStore.set(docId, {
      id: docId,
      filename: req.file.originalname,
      pages: pdfData.numpages,
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
    });

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      docId,
      filename: req.file.originalname,
      pages: pdfData.numpages,
      chunks: chunks.length,
      preview: chunks[0]?.slice(0, 200) + "...",
    });

  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ error: "Failed to process PDF" });
  }
};



// =====================================================
// 🤖 Ask Question (Semantic Search → LLM)
// =====================================================

exports.askQuestion = async (req, res) => {
  try {
    const { docId, question, history = [], provider = "gemini", model } = req.body;

    if (!docId || !question) {
      return res.status(400).json({ error: "docId and question are required" });
    }

    const doc = pdfStore.get(docId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found. Please re-upload." });
    }

    // 🔥 STEP 3: Semantic Search (Top-K Retrieval)
    const matchedChunks = await search(question, 5);
    const contextText = matchedChunks.join("\n\n");

    const systemPrompt = `You are an expert document analyst. You have been given relevant sections from a PDF titled "${doc.filename}".

Answer the user's question STRICTLY based on the provided context.
If the answer is not present, say clearly that it is not found.

DOCUMENT CONTEXT:
---
${contextText}
---`;

    let answer = "";

    // ================= GEMINI =================
    if (provider === "gemini") {
      const geminiModel = model || "gemini-1.5-flash";
      const geminiInstance = genAI.getGenerativeModel({ model: geminiModel });

      const chatHistory = history.map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      const chat = geminiInstance.startChat({
        history: [
          { role: "user", parts: [{ text: systemPrompt }] },
          {
            role: "model",
            parts: [{ text: "Understood. I will answer based only on the provided document context." }],
          },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(question);
      answer = result.response.text();
    }

    // ================= OPENROUTER =================
    else if (provider === "openrouter") {
      const openrouterModel = model || "openai/gpt-4o-mini";

      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: question },
      ];

      const completion = await openrouter.chat.completions.create({
        model: openrouterModel,
        messages,
      });

      answer = completion.choices[0].message.content;
    } else {
      return res.status(400).json({ error: "Invalid provider. Use 'gemini' or 'openrouter'." });
    }

    res.json({
      success: true,
      answer,
      docId,
      provider,
      model: model || (provider === "gemini" ? "gemini-1.5-flash" : "openai/gpt-4o-mini"),
    });

  } catch (err) {
    console.error("Q&A error:", err);
    res.status(500).json({ error: "Failed to answer question" });
  }
};



// =====================================================
// 📚 List Documents
// =====================================================

exports.listDocuments = async (req, res) => {
  const docs = Array.from(pdfStore.values());
  res.json({ documents: docs });
};



// =====================================================
// ❌ Delete Document
// =====================================================

exports.deleteDocument = async (req, res) => {
  const { docId } = req.params;

  if (pdfStore.has(docId)) {
    pdfStore.delete(docId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Document not found" });
  }
};