import React, { useState } from "react";
import { login } from "./api";
import Chat from "./chat";
import TaskBoard from "./components/TaskBoard";
import CollaborativeEditor from "./CollaborativeEditor";
import Whiteboard from "./pages/Whiteboard";
import VideoCall from "./VideoCall";

export default function App() {
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Track visible component in each panel
  const [topPanelView, setTopPanelView] = useState("chat"); // "chat" | "tasks"
  const [bottomPanelView, setBottomPanelView] = useState("editor"); // "editor" | "whiteboard"

  async function handleLogin() {
    const data = await login(name);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Remote Collab — Login</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="p-2 border rounded mb-3"
        />
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Enter Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900 min-h-screen text-white">
      <h2 className="text-xl font-bold mb-4">Welcome, {user.name}! 🎉</h2>

      {/* Dashboard Layout */}
      <div className="grid grid-rows-2 gap-4 h-[calc(100vh-150px)]">
        {/* Top Row: Chat + Tasks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-2 rounded">
            {/* Top Left Panel Tabs */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setTopPanelView("chat")}
                className={`px-2 py-1 rounded ${topPanelView === "chat" ? "bg-blue-500" : "bg-gray-700"}`}
              >
                Chat
              </button>
              <button
                onClick={() => setTopPanelView("tasks")}
                className={`px-2 py-1 rounded ${topPanelView === "tasks" ? "bg-green-500" : "bg-gray-700"}`}
              >
                Tasks
              </button>
            </div>
            {/* Render panel content */}
            {topPanelView === "chat" && <Chat user={user} token={token} />}
            {topPanelView === "tasks" && <TaskBoard token={token} />}
          </div>

          <div className="bg-gray-800 p-2 rounded">
            {/* Always show the other component */}
            {topPanelView === "chat" ? <TaskBoard token={token} /> : <Chat user={user} token={token} />}
          </div>
        </div>

        {/* Bottom Row: Editor + Whiteboard */}
        <div className="grid grid-cols-2 mt-15 gap-4">
          <div className="bg-gray-800 p-2 rounded">
            {/* Bottom Left Panel Tabs */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setBottomPanelView("editor")}
                className={`px-2 py-1 rounded ${bottomPanelView === "editor" ? "bg-yellow-500" : "bg-gray-700"}`}
              >
                Docs
              </button>
              <button
                onClick={() => setBottomPanelView("whiteboard")}
                className={`px-2 py-1 rounded ${bottomPanelView === "whiteboard" ? "bg-purple-500" : "bg-gray-700"}`}
              >
                Whiteboard
              </button>
            </div>
            {/* Render panel content */}
            {bottomPanelView === "editor" && <CollaborativeEditor />}
            {bottomPanelView === "whiteboard" && <Whiteboard />}
          </div>

          <div className="bg-gray-800 p-2 rounded">
            {/* Always show the other component */}
            {bottomPanelView === "editor" ? <Whiteboard /> : <CollaborativeEditor />}
            <VideoCall />
          </div>
        </div>
      </div>
    </div>
  );
}
