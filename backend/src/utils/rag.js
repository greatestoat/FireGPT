const { pipeline } = require("@xenova/transformers");

let embedder;
let chunkStore = [];
let vectorStore = [];

// ==============================
// Initialize Model (Only Once)
// ==============================
async function initRAG() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
    console.log("Embedding model loaded ✅");
  }
}

// ==============================
// Clear Memory (Optional helper)
// ==============================
function clearStore() {
  chunkStore = [];
  vectorStore = [];
}

// ==============================
// Text Chunking
// ==============================
function chunkText(text, chunkSize = 800, overlap = 150) {
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

// ==============================
// Create Embedding
// ==============================
async function createEmbedding(text) {
  if (!embedder) {
    throw new Error("RAG not initialized. Call initRAG() first.");
  }

  const output = await embedder(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

// ==============================
// Cosine Similarity
// ==============================
function cosineSimilarity(a, b) {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ==============================
// Add Chunks to Memory
// ==============================
async function addChunks(chunks) {
  for (const chunk of chunks) {
    const vector = await createEmbedding(chunk);

    chunkStore.push(chunk);
    vectorStore.push(vector);
  }
}

// ==============================
// Search Top K Relevant Chunks
// ==============================
async function search(query, k = 5) {
  const queryVector = await createEmbedding(query);

  const scores = vectorStore.map((vector, index) => ({
    index,
    score: cosineSimilarity(queryVector, vector),
  }));

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, k).map((item) => chunkStore[item.index]);
}

module.exports = {
  initRAG,
  clearStore,
  chunkText,
  addChunks,
  search,
};