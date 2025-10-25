
import React, { useEffect, useRef, useState } from "react";
import { EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Image as ImageIcon, Quote, Minus, Undo2, Redo2, Smile,
  Highlighter, AlignLeft, AlignCenter, AlignRight, FileCode,
  Save, Link as LinkIcon,
} from "lucide-react";




/* ---------- MenuBar component ---------- */
const MenuBar = ({ editor, toggleEmoji }) => {
  const [force, setForce] = useState(0);

  useEffect(() => {
    if (!editor) return;

    const update = () => setForce(f => f + 1); 
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!editor) return null;  // conditional return after hooks


  return (
    <div className="flex flex-wrap justify-start gap-2 mb-3 p-2 bg-gray-800 rounded-lg shadow-sm items-center overflow-x-auto">
  {/* --- Text Style --- */}
  <div className="flex gap-1 ">
    <button
  onClick={() => editor.chain().focus().toggleBold().run()}
  title="Bold"
  className={`p-1 rounded border border-gray-500/50  hover:scale-105 transition-all duration-300 cursor-pointer ${
    editor.isActive("bold")
      ? "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 border border-white rounded-lg"
      : "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200"
  }`}
>
  <Bold size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" />
</button>


    <button
      onClick={() => editor.chain().focus().toggleItalic().run()}
      title="Italic"
      className={`border border-gray-500/60 rounded p-1 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer ${
        editor.isActive("italic") ? "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 border border-white rounded-lg" : "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 "
      }`}
    >
      <Italic size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" />
    </button>

    <button
      onClick={() => editor.chain().focus().toggleStrike().run()}
      title="Strikethrough"
      className={`border border-gray-600 rounded p-1 hover:bg-gray-700 transition-colors hover:scale-105 transition-all duration-300 cursor-pointer ${
        editor.isActive("strike") ? "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 border border-white rounded-lg" : "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200"
      }`}
    >
      <Strikethrough size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" />
    </button>

    <button
      onClick={() => editor.chain().focus().toggleHighlight().run()}
      title="Highlight"
      className={`border border-gray-600 rounded p-1 hover:bg-gray-700 transition-colors hover:scale-105 transition-all duration-300 cursor-pointer ${
        editor.isActive("highlight") ? "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 border border-white rounded-lg" : "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200"
      }`}
    >
      <Highlighter size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" />
    </button>

    <button
      onClick={() => editor.chain().focus().toggleCode().run()}
      title="Inline Code"
      className={`border border-gray-600 rounded p-1 hover:bg-gray-700 transition-colors hover:scale-105 transition-all duration-300 cursor-pointer ${
        editor.isActive("code") ? "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200 border border-white rounded-lg" : "bg-gradient-to-r from-blue-500/20 to-blue-500/40 text-gray-200"
      }`}
    >
      <Code size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" />
    </button>
  </div>

  {/* --- Headings --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    {[1,2,3].map(lvl => (
      <button key={lvl} onClick={() => editor.chain().focus().toggleHeading({ level: lvl }).run()} title={`Heading ${lvl}`} className="border border-gray-600 rounded px-2 py-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 font-semibold ">
        H{lvl}
      </button>
    ))}
  </div>

  {/* --- Lists & Blockquote --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    <button onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><List size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><ListOrdered size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><Quote size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><Minus size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
  </div>

  {/* --- Alignment --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    <button onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align Left" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 hover:rounded-lg cursor-pointer"><AlignLeft size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align Center" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 hover:rounded-lg cursor-pointer"><AlignCenter size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align Right" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 hover:rounded-lg cursor-pointer"><AlignRight size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
  </div>

  {/* --- Undo/Redo --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    <button onClick={() => editor.chain().focus().undo().run()} title="Undo" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer"><Undo2 size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => editor.chain().focus().redo().run()} title="Redo" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer"><Redo2 size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
  </div>

  {/* --- Media & Links --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    <button onClick={() => { const url = prompt("Enter image URL"); if(url) editor.chain().focus().setImage({ src: url }).run(); }} title="Insert Image" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><ImageIcon size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={toggleEmoji} title="Insert Emoji" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><Smile size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
    <button onClick={() => { const url = prompt("Enter URL"); if(url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); }} title="Insert Link" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><LinkIcon size={18} className="sm:!w-5 sm:!h-5 md:!w-5 md:!h-6" /></button>
  </div>

  {/* --- Code Block & Save --- */}
  <div className="flex gap-1 border-l border-gray-600 pl-2">
    <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><FileCode size={18} className="sm:!w-5 sm:!h-5 md:!w-6 md:!h-6" /></button>
    <button onClick={() => console.log(editor.getHTML())} title="Save / Log HTML" className="border border-gray-600 rounded p-1 bg-gradient-to-r from-blue-500/20 to-blue-500/40 hover:bg-gray-700 hover:scale-105 transition-all duration-300 cursor-pointer hover:rounded-lg"><Save size={18} className="sm:!w-5 sm:!h-5 md:!w-6 md:!h-6" /></button>
  </div>
</div>

  );
};

// Use Yjs WebSocket URL or fallback
const defaultWsUrl = import.meta.env.VITE_YJS_WS_URL
  ? import.meta.env.VITE_YJS_WS_URL.replace(/^https?/, 'wss')
  : "ws://localhost:4000";

  // Optional: hide console logs in production
  if (import.meta.env.PROD) {
    console.log = () => {};
  }
/* ---------- CollaborativeEditor ---------- */
const CollaborativeEditor = ({ workspace, wsUrl = defaultWsUrl, user }) => {
  console.log("📘 CollaborativeEditor received workspace:", workspace);

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const awarenessRef = useRef(null);

  const [editor, setEditor] = useState(null);
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    console.log("Initializing CollaborativeEditor for workspace:", workspace, "and user:", user);
    if (!workspace?._id) return;

    const doc = new Y.Doc();
    ydocRef.current = doc;

    const provider = new WebsocketProvider(
      `${wsUrl}/${workspace._id}?token=${user.token}`,
      workspace._id,
      doc
    );
      console.log("WebSocket URL:", `${wsUrl}/${workspace._id}?token=${user.token}`);
    providerRef.current = provider;
    awarenessRef.current = provider.awareness;

    awarenessRef.current.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      color: randomColorFromId(user.id),
    });

    provider.on("status", (ev) => setConnected(ev.status === "connected"));

    const updateParticipants = () => {
      const states = Array.from(awarenessRef.current.getStates().values())
        .map(s => s.user)
        .filter(Boolean);
      setParticipants(states);
    };

    awarenessRef.current.on("change", updateParticipants);
    updateParticipants();

    // Initialize editor AFTER Y.Doc is ready
    const ed = new Editor({
      extensions: [
        StarterKit.configure({ link: false, codeBlock: false, }),
        Collaboration.configure({ document: doc }),
        Image,
        Placeholder.configure({ placeholder: "Start typing..." }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Highlight,
        Link,
      ],
      content: "<p></p>",
    });
    setEditor(ed);

    return () => {
      awarenessRef.current.off("change", updateParticipants);
      provider.destroy();
      doc.destroy();
      ed.destroy();
    };
  }, [workspace, wsUrl, user]);

  const toggleEmoji = () => setShowEmoji(s => !s);

  if (!workspace?._id) {
    return <p className="text-gray-400">Loading workspace editor...</p>;
  }

  return (
    <div className="border border-gray-600 rounded-xl p-4 bg-gray-900 shadow-lg text-white">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
    <div className="flex items-center gap-2">
      <strong className="text-lg">Workspace:</strong>
      <span className="text-xl font-semibold">{workspace?.name || "Loading..."}</span>
    </div>

    <div className="flex items-center gap-4 mt-2 sm:mt-0">
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        <span
          className={`h-3 w-3 rounded-full ${connected ? "bg-gradient-to-r from-green-400 to-green-600 animate-pulse" : "bg-red-500"}`}
        ></span>
        <span className="text-sm font-medium pl-1">{connected ? "Connected" : "Disconnected"}</span>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-1">
        {participants.length > 0 ? (
          participants.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-700 text-xs font-semibold"
              title={p.name}
            >
              {p.name.slice(0, 2).toUpperCase()}
            </div>
          ))
        ) : (
          <span className="text-sm text-gray-400">No users</span>
        )}
      </div>
    </div>
  </div>


      <MenuBar editor={editor} toggleEmoji={toggleEmoji} />

      {showEmoji && editor && (
        <div className="mb-2">
          <Picker
            data={data}
            onEmojiSelect={(emoji) => {
              editor.chain().focus().insertContent(emoji.native).run();
              setShowEmoji(false);
            }}
            theme="light"
          />
        </div>
      )}

      {editor ? (
        <EditorContent
          editor={editor}
          className="prose rounded-lg border border-gray-500 bg-white text-black max-w-full p-4 focus:outline-none"
        />
      ) : (
        <p>Loading editor...</p>
      )}
    </div>
  );
};

/* ---------- Helper ---------- */
function randomColorFromId(id) {
  const seed = Array.from(String(id)).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const hue = seed % 360;
  return `hsl(${hue} 70% 50%)`;
}

export default CollaborativeEditor;
