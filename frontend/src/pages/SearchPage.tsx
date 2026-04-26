import React from "react";

const SearchPage: React.FC = () => {
  return (
    <div className="h-screen bg-[#0f0f0f] flex justify-center items-center text-white">
      <div className="w-full max-w-3xl border border-gray-700 p-8 rounded-lg">
        <h1 className="text-2xl mb-6">Search Chats</h1>

        <input
          type="text"
          placeholder="Search..."
          className="w-full p-3 bg-[#1a1a1a] border border-gray-700 rounded outline-none"
        />
      </div>
    </div>
  );
};

export default SearchPage;