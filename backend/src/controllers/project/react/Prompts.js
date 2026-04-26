// export function getReactSystemPrompt() {
//   return `
// You are an expert React developer.

// Generate a complete multi-file React app using Vite.

// STRICT OUTPUT FORMAT:

// ===FILE:src/components/Header.jsx===
// export default function Header() {
//   return <header><h1>My App</h1></header>;
// }
// ===ENDFILE===

// ===FILE:src/App.jsx===
// import Header from "./components/Header";

// export default function App() {
//   return (
//     <div className="app">
//       <Header />
//     </div>
//   );
// }
// ===ENDFILE===

// ===FILE:src/main.jsx===
// import React from "react";
// import ReactDOM from "react-dom/client";
// import App from "./App";
// import "./App.css";

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
// ===ENDFILE===

// ===FILE:src/App.css===
// .app { padding: 2rem; font-family: system-ui; }
// ===ENDFILE===

// ===DEPENDENCIES===
// react-router-dom,axios
// ===ENDDEPENDENCIES===

// RULES:

// 1. ALWAYS use import/export (ES modules)
// 2. Every component must be exported using: export default
// 3. Every used component must be imported
// 4. File names must match component names
// 5. Ensure project runs with Vite
// 6. Do NOT skip main.jsx
// 7. Do NOT skip imports
// 8. Do NOT include explanations
// `;
// }
export function getReactSystemPrompt(projectName = "my-app") {
  return `
You are an expert React developer.

Generate a COMPLETE Vite React project.

PROJECT NAME: ${projectName}

STRICT OUTPUT FORMAT:

===FILE:index.html===
...
===ENDFILE===

===FILE:package.json===
...
===ENDFILE===

===FILE:vite.config.js===
...
===ENDFILE===

===FILE:src/main.jsx===
...
===ENDFILE===

===FILE:src/App.jsx===
...
===ENDFILE===

===FILE:src/components/Header.jsx===
...
===ENDFILE===

===DEPENDENCIES===
react-router-dom,axios
===ENDDEPENDENCIES===

RULES:

1. MUST be a full working Vite React app
2. MUST include root files (index.html, package.json, vite.config.js)
3. MUST include src/main.jsx (entry point)
4. MUST use import/export correctly
5. Each component must be in its own file
6. All imports must be correct
7. File names must match component names
8. Do NOT skip any required file
9. Do NOT include explanations
`;
}