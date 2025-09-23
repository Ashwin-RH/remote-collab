import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { API } from "./api";

export default function Chat({ user, token }) {
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load old messages
    API.get("/messages").then((res) => setMessages(res.data));

    // Connect socket
    const socket = io("http://localhost:4000", { auth: { token } });
    socketRef.current = socket;

    socket.on("chat:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    socket.on("presence", (list) => {
      setOnline(list);
    });

    return () => socket.disconnect();
  }, []);

  function sendMessage() {
    if (text.trim()) {
      socketRef.current.emit("chat:message", text);
      setText("");
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex gap-4 mt-6">
      {/* Chat messages */}
      <div className="flex-1 border p-4 rounded bg-white shadow">
        <h3 className="font-bold mb-2">Chat</h3>
        <div className="h-64 overflow-y-auto mb-2">
          {messages.map((m) => (
            <div key={m.id} className="mb-2">
              <strong>{m.user.name}:</strong> {m.text}
              <div className="text-xs text-gray-500">
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
            className="flex-1 border rounded p-2"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>

      {/* Online users */}
      <div className="w-48 border p-4 rounded bg-white shadow">
        <h3 className="font-bold mb-2">Online Users</h3>
        <ul>
          {online.map((id) => (
            <li key={id}>{id === user.id ? `${user.name} (you)` : id}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
