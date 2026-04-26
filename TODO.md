# Fix Plan

## Information Gathered
- `backend/src/service/dockerService.js` unconditionally writes the full Vite scaffold (including a default `src/App.jsx` with the placeholder text "Ready! Use the AI Generator...") every time a fresh Docker container is created.
- When a user generates React code for the first time, `generateReactCode` writes the AI files to disk, then `ProjectPage.tsx` opens the Terminal and triggers scaffolding. `createReactProject` sees no container, creates a new one, and **overwrites** the generated `src/App.jsx` and `src/App.css` with the defaults.
- `frontend/src/editor/pages/ProjectPage.tsx` is the main editor page. It currently lacks quick navigation to Home, GPT (Chat), and Notebook.

## Plan

### 1. Fix `backend/src/service/dockerService.js`
**Goal:** Prevent scaffold from overwriting existing generated source files.

In `createReactProject` (Step 3 - fresh container):
- Loop over `VITE_SCAFFOLD` entries.
- **Always** write `index.html` (ensures correct Vite entry point).
- **Always** update `vite.config.js` via `_writeViteConfig` (ensures correct port).
- For all other scaffold files (`package.json`, `src/main.jsx`, `src/App.jsx`, `src/App.css`), **skip writing if the file already exists**.

This preserves AI-generated `src/App.jsx` / `src/App.css` while still ensuring required boilerplate (`package.json`, `src/main.jsx`) is present when missing.

### 2. Update `frontend/src/editor/pages/ProjectPage.tsx`
**Goal:** Add navigation icons for Home, GPT, and Notebook that fit the VS Code-like UI.

- Import `Home`, `Bot`, `BookOpen` from `lucide-react`.
- Replace the conditional 48px activity bar (shown only when explorer is hidden) with a **permanent** 48px left activity bar.
- Add icon buttons in that bar:
  - **Home** → `/home`
  - **GPT** → `/chat`
  - **Notebook** → `/notebook`
- Keep the existing Explorer show/hide toggle at the bottom of that bar.
- Remove the old conditional activity-bar block to avoid duplication.

## Dependent Files
- `backend/src/service/dockerService.js`
- `frontend/src/editor/pages/ProjectPage.tsx`

## Followup Steps
1. Save edits.
2. Test by creating a new React project, generating code, and confirming the preview shows the generated app instead of the "Ready!" placeholder.
3. Verify the new left nav icons navigate correctly and look clean in the UI.

