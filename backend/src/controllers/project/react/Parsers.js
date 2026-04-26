// ── File-type map ─────────────────────────────────────────────────────────────

const EXT_TO_TYPE = {
  jsx:  'react',
  tsx:  'react-ts',
  js:   'javascript',
  ts:   'typescript',
  css:  'css',
  html: 'html',
  json: 'json',
};

/**
 * Derives a sandbox file-type label from a file path extension.
 * Falls back to "text" for unknown extensions.
 */
export function getFileType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  return EXT_TO_TYPE[ext] || 'text';
}

// ── Fallback files ────────────────────────────────────────────────────────────

/**
 * Used when the AI response contains no ===FILE:=== blocks.
 * Treats the entire response as the content of src/App.jsx.
 */
function getDefaultReactFiles(content) {
  return [
    { path: 'src/App.jsx', content, type: 'react' },
    {
      path:    'src/App.css',
      content: `.app { padding: 2rem; font-family: system-ui, -apple-system, sans-serif; }`,
      type:    'css',
    },
  ];
}

// ── Main parsers ──────────────────────────────────────────────────────────────

/**
 * Extracts all ===FILE:path=== … ===ENDFILE=== blocks from the AI response.
 * Falls back to {@link getDefaultReactFiles} when no blocks are found.
 *
 * @param   {string} response  Raw AI response text.
 * @returns {{ path: string, content: string, type: string }[]}
 */
export function extractCodeFromResponse(response) {
  const files     = [];
  const fileRegex = /===FILE:(.*?)===([\s\S]*?)===ENDFILE===/g;
  let match;

  while ((match = fileRegex.exec(response)) !== null) {
    const filePath = match[1].trim();
    const content  = match[2].trim().replace(/```[\w]*\n?/g, '').trim();
    files.push({ path: filePath, content, type: getFileType(filePath) });
  }

  return files.length > 0 ? files : getDefaultReactFiles(response);
}

/**
 * Extracts the comma-separated package list from a
 * ===DEPENDENCIES=== … ===ENDDEPENDENCIES=== block.
 *
 * @param   {string}   response  Raw AI response text.
 * @returns {string[]}           Array of package names (may be empty).
 */
export function extractDependencies(response) {
  const depRegex = /===DEPENDENCIES===([\s\S]*?)===ENDDEPENDENCIES===/;
  const match    = depRegex.exec(response);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(d => d.trim())
    .filter(d => d.length > 0);
}