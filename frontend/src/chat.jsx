// src/Chat.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Laugh, SendHorizontal } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import * as jwtDecode from "jwt-decode"
import { nanoid } from "nanoid";
import { toast } from "react-hot-toast";


// Debounce helper
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export default function Chat({ socket, user, workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);

  // --- Scroll control ---
  const scrollToBottom = () => {
    const el = messagesEndRef.current;
    if (!el) return;
    const parent = el.parentNode;
    const atBottom =
      parent.scrollHeight - parent.scrollTop - parent.clientHeight < 50;
    if (atBottom) el.scrollIntoView({ behavior: "smooth" });
  };

  // --- Debounced typing ---
  const handleTyping = useCallback(
  debounce(() => {
    if (!socket || !user || !workspaceId) return;
    socket.emit("chat:typing", { workspaceId, name: user.name, userId: user.id });

    const stopTimeout = setTimeout(() => {
      socket.emit("chat:stopTyping", { workspaceId, name: user.name });
    }, 1000);

  }, 300),
  [socket, user, workspaceId]
);




  // --- Send message ---
 const sendMessage = () => {
  if (!text.trim() || !socket || !user || !workspaceId) return;

  const optimisticMsg = {
    content: text,
    user,
    ts: new Date(),
    readBy: [user.id],
    reactions: [],
    _id: `temp-${Date.now()}`,
    workspaceId,
  };

  setMessages((prev) => [...prev, optimisticMsg]);
  scrollToBottom();
  setText("");

  socket.emit(
    "chat:message",
    { workspaceId, content: text },
    (savedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === optimisticMsg._id ? savedMsg : m))
      );
    }
  );
};


useEffect(() => {
  if (!socket || !workspaceId) return;

  // Leave previous workspace
  const prevWorkspace = socket.currentWorkspace;
  if (prevWorkspace) socket.emit("workspace:leave", { workspaceId: prevWorkspace });

  // --- Clear old messages and typing state ---
  setMessages([]);
  setTypingUsers([]);
  setLoading(true);

  // Join new workspace
  socket.emit("workspace:join", { workspaceId });
  socket.currentWorkspace = workspaceId;
}, [socket, workspaceId]);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);


  // --- Socket events ---
  useEffect(() => {
    if (!socket || !user || !workspaceId) return;

    const initListener = (msgs) => {
      setMessages(msgs);
      setLoading(false);
      scrollToBottom();
    };

    const newMsgListener = (msg) => {
      if (msg.workspaceId === workspaceId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      }
    };

    const readListener = ({ msgId, userId, workspaceId: wId }) => {
      if (wId !== workspaceId) return;
      setMessages((prev) =>
        prev.map((m) =>
          (m._id || m.id) === msgId
            ? { ...m, readBy: Array.from(new Set([...(m.readBy || []), userId])) }
            : m
        )
      );
    };

    const reactionListener = ({ msgId, reactions, workspaceId: wId }) => {
      if (wId !== workspaceId) return;
      setMessages((prev) =>
        prev.map((m) => ((m._id || m.id) === msgId ? { ...m, reactions } : m))
      );
    };

    const typingListener = ({ name, userId, workspaceId: wId }) => {
      if (wId !== workspaceId || userId === user.id) return;
      setTypingUsers((prev) => Array.from(new Set([...prev, name])));
    };

    const stopTypingListener = ({ name, workspaceId: wId }) => {
      if (wId !== workspaceId) return;
      setTypingUsers((prev) => prev.filter((n) => n !== name));
    };

    const presenceListener = (online) => setOnlineUsers(online);

    socket.on(`chat:init:${workspaceId}`, initListener);
    socket.on("chat:message", newMsgListener);
    socket.on("chat:read", readListener);
    socket.on("chat:reaction", reactionListener);
    socket.on("presence", presenceListener);
    socket.on("chat:typing", typingListener);
    socket.on("chat:stopTyping", stopTypingListener);

    return () => {
      socket.off(`chat:init:${workspaceId}`, initListener);
      socket.off("chat:message", newMsgListener);
      socket.off("chat:read", readListener);
      socket.off("chat:reaction", reactionListener);
      socket.off("presence", presenceListener);
      socket.off("chat:typing", typingListener);
      socket.off("chat:stopTyping", stopTypingListener);
    };
  }, [socket, user, workspaceId]);

  // --- Group messages by sender ---
  const groupedMessages = [];
  let lastSenderId = null;
  messages.forEach((msg) => {
    if (!lastSenderId || lastSenderId !== msg.user.id) {
      groupedMessages.push([msg]);
    } else {
      groupedMessages[groupedMessages.length - 1].push(msg);
    }
    lastSenderId = msg.user.id;
  });

  return (
    <div className="flex gap-4 mt-6">
      {/* Chat Box */}
      <div className="flex-1 rounded-xl border border-gray-400/40 bg-black p-4 shadow">
        <h3 className="font-bold mb-1 text-center border border-green-100/70 rounded-xl w-30 text-white cursor-default">
          Chat
        </h3>

        {typingUsers.length > 0 && (
          <small className="text-gray-400 mb-1">{typingUsers.join(", ")} typing...</small>
        )}

        <div className="h-70 overflow-y-auto scrollbar-overlay mb-2 p-2 bg-black text-white rounded-xl">
          {loading ? (
            <div className="text-center text-gray-400 py-4">Loading messages...</div>
          ) : (
            groupedMessages.map((group, i) => {
              const isMe = group[0].user.id === user.id;
              return (
                <div key={i} className={`mb-2 flex ${isMe ? "justify-end" : "justify-start"}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full text-green-400 border-2 bg-gray-900 border-gray-700/60 flex items-center justify-center mr-2">
                      {group[0].user.name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col max-w-[220px]">
                    {!isMe && (
                      <div className="text-sm text-left text-green-400 font-extrabold mb-1">
                        {group[0].user.name}
                      </div>
                    )}
                    {group.map((m) => (
                      <div
                        key={m._id || m.id}
                        className={`px-3 py-2 rounded-lg text-sm break-words ${
                          isMe
                            ? "border-2 border-green-700/60 bg-gray-900 mb-1 text-white rounded-br-none"
                            : "border-2 border-gray-800/60 bg-gray-900 text-gray-100 rounded-tl-none"
                        }`}
                      >
                        <div className="text-md text-left break-words">
                          {typeof m.content === "string" ? m.content : JSON.stringify(m.content)}
                        </div>
                        {m.reactions?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {m.reactions.map((r, idx) => (
                              <span key={idx}>{typeof r === "string" ? r : r.emoji}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex relative -right-3 justify-between items-center  text-[10px] text-gray-400/70 mt-0.5 -mb-1 px-1 rounded">
                          <span className="text-end">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span title={m.readBy?.join(", ")}>
                            {m.readBy?.length > 1 ? `✓${m.readBy.length - 1}` : ""}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input + Emoji */}
        <div className="flex opacity-100  items-center relative">
          <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-1.5 bg-gray-800 border-2 border-green-400 text-white rounded-xl flex items-center justify-center hover:border-green-400 hover:rounded-2xl transition-all"
          >
            <Laugh className="w-7 h-7" />
          </button>

          {showEmojiPicker && (
            <div className="absolute z-50 bottom-12 left-0">
              <Picker
                data={data}
                onEmojiSelect={(emoji) => setText((prev) => prev + emoji.native)}
                theme="light"
              />
            </div>
          )}

          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            className="flex-1 ml-2 text-white placeholder-gray-400 border-2 border-green-400 rounded-xl bg-gray-950/60 p-2 focus:outline-none focus:border-green-400 transition-colors duration-300"
            placeholder="Message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={sendMessage}
            className="ml-2 px-3 py-2 bg-gray-800 border-2 border-green-400 text-white rounded-xl flex items-center justify-center hover:border-green-400 hover:rounded-2xl transition-all"
          >
            <SendHorizontal />
          </button>
        </div>
      </div>

      {/* Online Users */}
      <div className="w-48 bg-black backdrop-blur-md border border-green-400 p-4 rounded-xl text-white shadow">
        <h3 className="font-bold mb-2 text-center rounded-lg bg-gray-900 text-green-400 border-2 border-green-100/50">
          Online Users
        </h3>
        <ul>
          {onlineUsers.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}






