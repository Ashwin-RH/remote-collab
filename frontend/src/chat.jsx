// frontend/src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import { API } from "./api";
import { getSocket } from "./socket";
import { SendHorizontal } from "lucide-react";

export default function Chat({ user, token }) {
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load last 50 messages
    API.get("/messages").then((res) => setMessages(res.data));

    // Connect socket (singleton)
    const socket = getSocket(token);

    // Handle incoming messages
    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    };
    socket.on("chat:message", handleMessage);

    // Handle presence updates (new format: array of {id, name})
    const handlePresence = (onlineUsers) => {
      const formatted = onlineUsers.map((u) =>
        u.id === user.id ? `${u.name} (you)` : u.name
      );
      setOnline(formatted);
    };
    socket.on("presence", handlePresence);

    // Cleanup
    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("presence", handlePresence);
    };
  }, [token]);

  const sendMessage = () => {
    if (text.trim()) {
      const socket = getSocket(token);
      socket.emit("chat:message", text);
      setText("");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex gap-4 mt-6">
      {/* Chat messages */}
      <div className="flex-1 rounded-xl border p-4 bg-black shadow">
        <h3 className="font-bold mb-3 text-center border rounded-xl text-white w-15  ">Chat</h3>
        <div className="h-64 overflow-y-auto mb-2 p-2 bg-black text-white rounded-lg">
          {messages.map((m) => (
            <div key={m.id} className="mb-2">
              <strong>{m.user.name}:</strong> {m.text}
              <div className="text-xs text-gray-100">
                {new Date(m.ts).toLocaleTimeString()}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 text-white placeholder-gray-400 border-2 border-green-400 rounded-xl p-2"
            placeholder="Message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="ml-2 px-3 py-2 bg-gray-800 border-2 border-green-600 hover:border-gray-300 text-green-400 rounded-full cursor-pointer hover:bg-green-500 hover:text-white transition-all flex items-center justify-center"
          >
            <SendHorizontal />
          </button>
        </div>
      </div>

      {/* Online users */}
      <div className="w-48 bg-black backdrop-blur-md border border-green-400 p-4 rounded-xl text-white shadow">
        <h3 className="font-bold mb-2 text-center rounded-lg bg-gray-800 text-green-400 border-2 border-green-500">Online Users</h3>
        <ul>
          {online.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
