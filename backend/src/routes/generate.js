import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "AI App Builder",
  },
});

router.post("/", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const completion = await openrouter.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a professional frontend developer.

Rules:
- Return ONLY valid HTML.
- Use internal CSS inside <style>.
- No markdown.
- No backticks.
- No external scripts.
- No CDN.
- No localhost links.
- No import/export.
- No Vite.
- Return complete HTML document.
`
        },
        {
          role: "user",
          content: `Build a basic HTML and CSS application: ${prompt}`
        }
      ],
      temperature: 0.7,
    });

    let html = completion.choices[0].message.content;

    // Extra safety cleanup
    html = html
      .replace(/<script type="module".*?<\/script>/gs, "")
      .replace(/\/@vite\/client/g, "")
      .replace(/localhost:5173/g, "");

    res.json({ html });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
});

export default router;