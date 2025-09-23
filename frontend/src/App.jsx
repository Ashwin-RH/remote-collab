import React, { useState } from "react";
import { login } from "./api";
import Chat from "./chat";
import TaskBoard from "./components/TaskBoard";

export default function App() {
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

 async function handleLogin() {
  const data = await login(name);
  setUser(data.user);
  setToken(data.token);
  localStorage.setItem("token", data.token); // <--- store token
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
    <div className="p-6">
      <h2 className="text-xl font-bold">Welcome, {user.name}! 🎉</h2>
      <Chat user={user} token={token} />
      <TaskBoard token={token} /> {/* pass token if needed */}
    </div>
  );
}
