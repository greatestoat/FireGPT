import { chunkText, addChunks, clearStore, initRAG } from "../utils/rag.js";

/* ================================
   Extract Video ID
================================ */
function extractVideoId(url) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/i
  );
  return match ? match[1] : null;
}

/* ================================
   Fetch Video Metadata (oEmbed)
================================ */
async function fetchVideoMetadata(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) throw new Error("Metadata fetch failed");
    const data = await res.json();
    return { title: data.title || null, channelName: data.author_name || null };
  } catch {
    return { title: null, channelName: null };
  }
}

/* ================================
   Decode HTML Entities
================================ */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/\n/g, " ")
    .trim();
}

/* ================================
   Parse Transcript XML
================================ */
function parseTranscriptXml(xml) {
  const segments = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  if (!segments.length) return null;

  return segments
    .map((m) => decodeEntities(m[1]))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ================================
   Strategy 1: Direct timedtext API
================================ */
async function fetchViaTimedTextApi(videoId) {
  // Try common language codes
  const langs = ["en", "en-US", "en-GB", "a.en"];

  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml || xml.trim().length < 50) continue;

      const text = parseTranscriptXml(xml);
      if (text && text.length > 20) return text;
    } catch {
      continue;
    }
  }

  throw new Error("Timed text API returned no valid segments.");
}

/* ================================
   Strategy 2: Scrape ytInitialPlayerResponse
================================ */
async function fetchViaPageScrape(videoId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch YouTube page.");
  const html = await res.text();

  // Try multiple extraction patterns for caption tracks
  let tracks = null;

  // Pattern 1: standard captionTracks in ytInitialPlayerResponse
  const patterns = [
    /"captionTracks":(\[.*?\])/s,
    /"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*,\s*"[a-z]/,
  ];

  for (const pattern of patterns) {
    try {
      const match = html.match(pattern);
      if (match) {
        tracks = JSON.parse(match[1]);
        if (tracks?.length) break;
      }
    } catch {
      continue;
    }
  }

  // Pattern 2: Extract full ytInitialPlayerResponse and parse it
  if (!tracks?.length) {
    try {
      const jsonMatch = html.match(
        /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;[\s\n]*(?:var|const|let|<\/script)/
      );
      if (jsonMatch) {
        const playerResponse = JSON.parse(jsonMatch[1]);
        tracks =
          playerResponse?.captions?.playerCaptionsTracklistRenderer
            ?.captionTracks;
      }
    } catch {
      // ignore
    }
  }

  if (!tracks?.length) {
    throw new Error("No caption tracks found in page HTML.");
  }

  // Prefer: manual English → auto English → any
  const preferred =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks.find((t) => t.languageCode?.startsWith("en")) ||
    tracks[0];

  if (!preferred?.baseUrl) {
    throw new Error("Caption track has no baseUrl.");
  }

  const xmlRes = await fetch(preferred.baseUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!xmlRes.ok) throw new Error("Failed to fetch caption XML.");
  const xml = await xmlRes.text();

  // Debug: log raw XML snippet to help diagnose format issues
  console.log("[Transcript XML sample]:", xml.slice(0, 300));

  const text = parseTranscriptXml(xml);
  if (!text || text.length < 20) {
    throw new Error("Transcript XML has no readable segments.");
  }

  return text;
}

/* ================================
   Master Fetch with Fallback Chain
================================ */
async function fetchTranscript(videoId) {
  const errors = [];

  // Strategy 1: Direct timedtext API
  try {
    const text = await fetchViaTimedTextApi(videoId);
    if (text) return text;
  } catch (e) {
    errors.push(`[TimedText API] ${e.message}`);
    console.warn("[TimedText API failed]:", e.message);
  }

  // Strategy 2: Page scrape
  try {
    const text = await fetchViaPageScrape(videoId);
    if (text) return text;
  } catch (e) {
    errors.push(`[Page Scrape] ${e.message}`);
    console.warn("[Page Scrape failed]:", e.message);
  }

  throw new Error(
    `All transcript strategies failed:\n${errors.join("\n")}`
  );
}

/* ================================
   Upload YouTube Controller
================================ */
export async function uploadYoutube(req, res) {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "YouTube URL required" });

    const videoId = extractVideoId(url);
    if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });

    await initRAG();
    clearStore();

    let transcript;
    try {
      transcript = await fetchTranscript(videoId);
    } catch (err) {
      console.error("Transcript fetch error:", err.message);
      return res.status(400).json({ error: `Transcript unavailable: ${err.message}` });
    }

    if (!transcript.trim()) {
      return res.status(400).json({ error: "Transcript is empty." });
    }

    const { title, channelName } = await fetchVideoMetadata(videoId);
    const chunks = chunkText(transcript);
    await addChunks(chunks);

    return res.json({
      message: "YouTube transcript processed successfully",
      videoTitle: title,
      channelName,
      chunks: chunks.length,
      transcriptLength: transcript.length,
    });
  } catch (error) {
    console.error("YouTube Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
