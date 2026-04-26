import { v4 as uuidv4 } from "uuid";import pool from '../../config/db.js';
import openrouter from '../../openrouter.js';
import fs from "fs/promises";
import path from "path";

// ── System prompt ────────────────────────────────────────────

function getHtmlSystemPrompt() {
  return `You are an expert web developer. Generate a COMPLETE, WORKING HTML/CSS/JavaScript application based on the user's request.

CRITICAL RULES:
1. Generate ONLY working, executable code - no explanations, no markdown
2. Create a fully functional web application
3. Use modern JavaScript (ES6+)
4. Include proper error handling
5. Make it visually appealing with modern CSS
6. Ensure all code runs WITHOUT ERRORS

REQUIRED FILE STRUCTURE:
You MUST generate exactly 3 files in this order:

1. **index.html** - Main HTML file
2. **style.css** - Stylesheet
3. **script.js** - JavaScript logic

OUTPUT FORMAT (CRITICAL - Follow exactly):
===FILE:index.html===
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- HTML content here -->
  <script src="script.js"></script>
</body>
</html>
===ENDFILE===

===FILE:style.css===
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, sans-serif;
}
/* More CSS here */
===ENDFILE===

===FILE:script.js===
// JavaScript code here
===ENDFILE===

IMPORTANT:
- Use ===FILE:filename=== to start each file
- Use ===ENDFILE=== to end each file
- No markdown code blocks (\`\`\`)
- No explanations before or after code
- Generate production-ready code that works immediately`;
}

// ── File parsing helpers ─────────────────────────────────────

function extractCodeFromResponse(response) {
  const files = [];
  const fileRegex = /===FILE:(.*?)===([\s\S]*?)===ENDFILE===/g;
  let match;

  while ((match = fileRegex.exec(response)) !== null) {
    const fileName = match[1].trim();
    const content = match[2].trim().replace(/```[\w]*\n?/g, "").trim();
    files.push({ path: fileName, content, type: getFileType(fileName) });
  }

  // Fallback – bare markdown code blocks
  if (files.length === 0) {
    files.push(...extractFromMarkdown(response));
  }

  // Last resort – wrap whatever came back in a basic HTML shell
  if (files.length === 0) {
    files.push(...getDefaultHtmlFiles(response));
  }

  return files;
}

function extractFromMarkdown(response) {
  const files = [];
  const pattern =
    /(?:\/\/|<!--)\s*([\w.]+)\s*(?:-->)?\s*\n```[\w]*\s*\n([\s\S]*?)```/g;
  let match;
  while ((match = pattern.exec(response)) !== null) {
    const fileName = match[1];
    const content = match[2].trim();
    if (fileName && content) {
      files.push({ path: fileName, content, type: getFileType(fileName) });
    }
  }
  return files;
}

function getDefaultHtmlFiles(content) {
  return [
    {
      path: "index.html",
      content: content.includes("<!DOCTYPE")
        ? content
        : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${content}
  <script src="script.js"></script>
</body>
</html>`,
      type: "html",
    },
    {
      path: "style.css",
      content: `body {\n  margin: 0;\n  padding: 2rem;\n  font-family: system-ui, -apple-system, sans-serif;\n}`,
      type: "css",
    },
    {
      path: "script.js",
      content: `console.log('App loaded');`,
      type: "javascript",
    },
  ];
}

function getFileType(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  return (
    { jsx: "react", tsx: "react-ts", js: "javascript", ts: "typescript",
      css: "css", html: "html", json: "json", md: "markdown" }[ext] || "text"
  );
}

// ── Controller ───────────────────────────────────────────────

export const generateHtmlCode = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { prompt, model = "meta-llama/llama-3.3-70b-instruct" } = req.body;
    const userId = req.user.id;

    // Verify ownership
    const [projects] = await pool.query(
      "SELECT * FROM projects WHERE id = ? AND user_id = ?",
      [projectId, userId]
    );
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const project = projects[0];
    const generationId = uuidv4();

    await pool.query(
      "INSERT INTO code_generations (id, project_id, user_id, prompt, model, status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [generationId, projectId, userId, prompt, model]
    );

    // Call AI
    const response = await Promise.race([
      openrouter.chat.completions.create({
        model,
        messages: [
          { role: "system", content: getHtmlSystemPrompt() },
          { role: "user",   content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 8000,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI response timeout after 2 minutes")), 120_000)
      ),
    ]);

    const aiResponse = response.choices?.[0]?.message?.content;
    if (!aiResponse) throw new Error("No response from AI");

    const parsedFiles = extractCodeFromResponse(aiResponse);

    // Persist to DB
    await pool.query("DELETE FROM project_files WHERE project_id = ?", [projectId]);

    const createdFiles = [];
    for (const file of parsedFiles) {
      const fileId = uuidv4();
      await pool.query(
        "INSERT INTO project_files (id, project_id, file_path, content, file_type) VALUES (?, ?, ?, ?, ?)",
        [fileId, projectId, file.path, file.content, file.type]
      );
      createdFiles.push({ id: fileId, path: file.path, content: file.content, type: file.type });
    }

    // Write to disk
    for (const file of parsedFiles) {
      const filePath = path.join(project.folder_path, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf8");
    }

    await pool.query(
      "UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [projectId]
    );
    await pool.query(
      "UPDATE code_generations SET generated_code = ?, status = 'success' WHERE id = ?",
      [JSON.stringify(parsedFiles), generationId]
    );

    res.json({ success: true, generationId, files: createdFiles, message: "HTML/CSS code generated successfully" });
  } catch (error) {
    console.error("generateHtmlCode error:", error);

    try {
      await pool.query(
        "UPDATE code_generations SET status = 'failed', error_message = ? WHERE project_id = ? ORDER BY created_at DESC LIMIT 1",
        [error.message, req.params.projectId]
      );
    } catch (_) {}

    res.status(500).json({ success: false, message: "Failed to generate HTML/CSS code", error: error.message });
  }
};