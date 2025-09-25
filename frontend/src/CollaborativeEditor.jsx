import React, { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Image from "@tiptap/extension-image";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Image as ImageIcon,
  Quote,
  Minus,
  CornerDownLeft,
  Undo2,
  Redo2,
  Smile,
} from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

// -------- MenuBar --------
const MenuBar = ({ editor }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [, setEditorState] = useState(0);

  useEffect(() => {
  if (!editor) return;

  const update = () => setEditorState((x) => x + 1);

  editor.on("selectionUpdate", update);
  editor.on("transaction", update);

  return () => {
    editor.off("selectionUpdate", update);
    editor.off("transaction", update);
  };
}, [editor]);


  if (!editor) return null;

  const toggleHeading = (level) =>
    editor.chain().focus().toggleHeading({ level }).run();

  return (
    <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg shadow-sm items-center duration-500 ">
      {/* Bold */}
       <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("bold")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800  shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <Bold size={18} />
      </button>

      {/* Italic */}
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("italic")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <Italic size={18} />
      </button>

      {/* Strike */}
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("strike")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <Strikethrough size={18} />
      </button>

      {/* Code */}
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("code")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <Code size={18} />
      </button>

      {/* Lists */}
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("bulletList")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <List size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("orderedList")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <ListOrdered size={18} />
      </button>

      {/* Headings */}
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          onClick={() => toggleHeading(level)}
          className={`px-3 py-1 rounded-xl ${
            editor.isActive("heading", { level })
              ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
              : "bg-white text-gray-800 shadow-amber-600/60"
          } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
        >
          H{level}
        </button>
      ))}

      {/* Blockquote */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl shadow-md duration-300 ${
          editor.isActive("blockquote")
            ? "bg-gray-800 text-amber-400 shadow-amber-600/60"
            : "bg-white text-gray-800 shadow-amber-600/60"
        } hover:scale-105 hover:rounded-lg will-change-transform transition-all cursor-pointer`}
      >
        <Quote size={18} />
      </button>

      {/* Horizontal Rule */}
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
      >
        <Minus size={18} />
      </button>

      {/* Hard Break */}
      <button
        onClick={() => editor.chain().focus().setHardBreak().run()}
        className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
      >
        <CornerDownLeft size={18} />
      </button>

      {/* Undo / Redo */}
      <button
        onClick={() => editor.chain().focus().undo().run()}
        className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
      >
        <Undo2 size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
      >
        <Redo2 size={18} />
      </button>

      {/* Image Insertion */}
      <button
        onClick={() => {
          const url = prompt("Enter image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }}
        className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
      >
        <ImageIcon size={18} />
      </button>

      {/* Emoji Picker */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className="p-2 rounded-xl bg-white text-gray-800 hover:bg-blue-400"
        >
          <Smile size={18} />
        </button>
        {showEmojiPicker && (
          <div className="absolute z-50 mt-2">
            <Picker
              data={data}
              onEmojiSelect={(emoji) =>
                editor.chain().focus().insertContent(emoji.native).run()
              }
              theme="light"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// -------- Collaborative Editor --------
const CollaborativeEditor = () => {
  const ydoc = new Y.Doc();

  const editor = useEditor({
    extensions: [StarterKit, Collaboration.configure({ document: ydoc }), Image],
    content: "<p>Start typing...</p>",
  });

  useEffect(() => {
    if (!editor) return;

    const provider = new WebsocketProvider("ws://localhost:1234", "my-room", ydoc);
    provider.on("status", (event) => console.log("WebSocket status:", event.status));

    return () => {
      provider.destroy();
      editor.destroy();
    };
  }, [editor, ydoc]);

  return (
    <div className="border rounded-xl p-4 bg-gray-800 shadow-md">
      <MenuBar editor={editor} />
      {editor ? (
        <EditorContent editor={editor} className="prose rounded-lg border border-gray-500 bg-gray-100 max-w-full p-2 focus:outline-none" />
      ) : (
        <p>Loading editor...</p>
      )}
    </div>
  );
};

export default CollaborativeEditor;
