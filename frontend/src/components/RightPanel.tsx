import React from "react";

const RightPanel: React.FC = () => {
  return (
    <div className="h-full bg-[#121212] p-4">
      <h2 className="font-semibold mb-4">Right Panel</h2>

      <div className="space-y-3 text-sm text-gray-400">
        <p>Memory status</p>
        <p>Settings</p>
        <p>Upgrade Plan</p>
      </div>
    </div>
  );
};

export default RightPanel;