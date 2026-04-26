// import React from "react";
// import Sidebar from "./components/Sidebar";
// import ChatArea from "./components/ChatArea";
// import RightPanel from "./components/RightPanel";
// const ChatLayout: React.FC = () => {
//   return (
//     <div className="flex h-screen bg-[#0f0f0f] text-white">
      
//       {/* 🔴 LEFT - HISTORY */}
//       <div className="w-64 border-r border-gray-800">
//         <Sidebar />
//       </div>

//       {/* 🟡 MIDDLE - CHAT */}
//       <div className="flex-1 border-r border-gray-800">
//         <ChatArea />
//       </div>

//       {/* 🟢 RIGHT PANEL */}
//       {/* <div className="w-72">
//         <RightPanel />
//       </div> */}

//     </div>
//   );
// };

// export default ChatLayout;
import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
// import RightPanel from "./components/RightPanel";

const ChatLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white overflow-hidden">

      {/* 🔴 LEFT - HISTORY */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* 🟡 MIDDLE - CHAT */}
      <div className="flex-1 border-r border-gray-800 overflow-hidden">
        <ChatArea />
      </div>

      {/* 🟢 RIGHT PANEL */}
      {/* <div className="w-72">
        <RightPanel />
      </div> */}

    </div>
  );
};

export default ChatLayout;