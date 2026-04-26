// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Sparkles,
//   BookOpen,
//   FolderKanban,
//   MessageSquare,
//   Compass,
//   Menu,
//   X,
// } from "lucide-react";

// const menuItems = [
//   { title: "About GPT", icon: <Sparkles size={18} />, path: "/fire-gpt/about" },
//   { title: "Notebook", icon: <BookOpen size={18} />, path: "/fire-gpt/notebook" },
//   { title: "Projects", icon: <FolderKanban size={18} />, path: "/fire-gpt/projects" },
//   { title: "AI Chat", icon: <MessageSquare size={18} />, path: "/fire-gpt/chat" },
//   { title: "Explore", icon: <Compass size={18} />, path: "/fire-gpt/explore" },
// ];

// export default function Sidebar() {
//   const [open, setOpen] = useState(false);
//   const navigate = useNavigate();

//   return (
//     <>
//       {/* 🔥 Toggle Button */}
//       <button
//         onClick={() => setOpen(!open)}
//         className="fixed top-5 left-5 z-50 p-2 rounded-lg bg-[#111827] border border-gray-700 hover:border-blue-500"
//       >
//         {open ? <X /> : <Menu />}
//       </button>

//       {/* 🔥 Sidebar */}
//       <div
//         className={`fixed top-0 left-0 h-full w-64 bg-[#0b0f1a]/95 backdrop-blur-xl border-r border-gray-800 z-40 transform transition-transform duration-300 ${
//           open ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         {/* Logo */}
//         <div className="p-5 text-xl font-bold text-blue-500">
//           FireGPT
//         </div>

//         {/* Menu */}
//         <div className="flex flex-col gap-2 px-3">
//           {menuItems.map((item, i) => (
//             <div
//               key={i}
//               onClick={() => {
//                 navigate(item.path);
//                 setOpen(false);
//               }}
//               className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-gray-300 hover:bg-blue-500/10 hover:text-blue-400 transition"
//             >
//               {item.icon}
//               <span>{item.title}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* 🔥 Overlay */}
//       {open && (
//         <div
//           onClick={() => setOpen(false)}
//           className="fixed inset-0 bg-black/40 z-30"
//         />
//       )}
//     </>
//   );
// }
