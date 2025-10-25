// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Panel, PanelGroup } from "react-resizable-panels";
import { getSocket } from "../socket";
import axios from "axios";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableItem } from "../components/SortableItem"; // 👈 you'll create this small helper below
import { Star, MoreVertical, Search, LogOut, UserPlus, Loader2, Send, Mail, X, Delete, DeleteIcon, Trash, Pen } from "lucide-react";
import { toast } from "react-hot-toast";
import EditorWhiteboardToggle from "../../EditorWhiteboardToggle";


import Chat from "../chat";
import VideoCall from "../VideoCall";
import TaskBoard from "../components/TaskBoard";
import CollaborativeEditor from "../CollaborativeEditor";
import Whiteboard from "./Whiteboard";

// -----------------------
// Invite Modal Logic
// -----------------------


const sendInvite = async () => {
  if (!email.trim()) {
    setStatus("Please enter a valid email");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setStatus("Invalid email format");
    return;
  }

  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `http://localhost:4000/workspace/${activeWorkspace._id}/invite`,
      { email },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    toast.success(res.data.message);
    setStatus(res.data.message);
    setEmail("");
  } catch (err) {
    console.error("Invite error:", err);
    toast.error(err.response?.data?.message || "Failed to send invite");
    setStatus(err.response?.data?.message || "Failed to send invite");
  } finally {
    setLoading(false);
    setTimeout(() => setStatus(""), 4000);
  }
};





// =======================
// Dashboard Component
// =======================
export default function Dashboard({ user, token, setToken, setUser }) {
  const [socket, setSocket] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showEditor, setShowEditor] = useState(true); // true → show editor, false → whiteboard
const [showModal, setShowModal] = useState(false);
const [email, setEmail] = useState("");
const [status, setStatus] = useState("");
const [loading, setLoading] = useState(false);

  // Construct user object from localStorage
const userObj = {
  id: user?.id || localStorage.getItem("userId"),
  name: user?.name || localStorage.getItem("userName"),
  token: token || localStorage.getItem("token"),
};

  const handleAcceptInvite = async (token) => {
  try {
    const authToken = localStorage.getItem("token");
    const { data } = await axios.post(
      `http://localhost:4000/workspace/join-with-token`,
      { token },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    toast.success(data.message);

    // Refresh workspaces after joining
    fetchWorkspaces();

    // Remove accepted invite from list
    setPendingInvites((prev) => prev.filter((i) => i.token !== token));
  } catch (err) {
    console.error("Failed to accept invite:", err);
    toast.error(err.response?.data?.message || "Failed to accept invite");
  }
};

// Reject Invite Handler
const handleRejectInvite = async (token) => {
  try {
    // Optionally, you can notify backend about rejection
    const authToken = localStorage.getItem("token");
    await axios.post(
      `http://localhost:4000/workspace/reject-invite`,
      { token },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    // Remove rejected invite from state
    setPendingInvites((prev) => prev.filter((i) => i.token !== token));
    toast.success("Invite rejected");
  } catch (err) {
    console.error("Failed to reject invite:", err);
    toast.error(err.response?.data?.message || "Failed to reject invite");
  }
};


  useEffect(() => {
  fetch("/workspace/invites", { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => setInvites(data.invites));
}, []);

  const filteredWorkspaces = workspaces.filter((ws) =>
  ws.name.toLowerCase().includes(search.toLowerCase())
);

  // -----------------------
  // Fetch workspaces
  // -----------------------
  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get("http://localhost:4000/workspace", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkspaces(data.workspaces || []);
      if (!activeWorkspace && data.workspaces.length) {
        setActiveWorkspace(data.workspaces[0]);
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
    }
  };

  const fetchPendingInvites = async () => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await axios.get("http://localhost:4000/workspace/invites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPendingInvites(data.invites || []);
  } catch (err) {
    console.error("Failed to fetch pending invites:", err);
  }
};

  useEffect(() => {
    fetchWorkspaces();
    fetchPendingInvites();
  }, []);

  // -----------------------
  // Initialize Socket
  // -----------------------
useEffect(() => {
  const latestToken = localStorage.getItem("token");
  if (!latestToken) return;

  const s = getSocket(latestToken);

  s.on("connect", () => console.log("Socket connected:", s.id));

  s.on("connect_error", (err) => console.error(err));

  s.on("workspace:invited", (data) => {
    console.log("📨 Received workspace invite:", data);
    toast.success(
      `You’ve been invited to join "${data.workspaceName}" by ${data.invitedBy}`
    );
    setPendingInvites((prev) => [...prev, data]);
  });

  setSocket(s);

  return () => {
    s.disconnect();
  };
}, []);


  // -----------------------
  // Workspace CRUD Handlers
  // -----------------------
  const handleWorkspaceSwitch = (workspace) => setActiveWorkspace(workspace);

  const handleLogout = () => {
    if (socket) socket.disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const createWorkspace = async () => {
    const name = prompt("Enter new workspace name:");
    if (!name?.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        "http://localhost:4000/workspace",
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkspaces((prev) => [...prev, data.workspace]);
      setActiveWorkspace(data.workspace);
    } catch (err) {
      console.error("Failed to create workspace:", err);
      alert("Workspace creation failed!");
    }
  };

  const renameWorkspace = async (ws) => {
    const name = prompt("Enter new name for workspace:", ws.name);
    if (!name || name === ws.name) return;

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.put(
        `http://localhost:4000/workspace/${ws._id}`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWorkspaces((prev) =>
        prev.map((w) => (w._id === ws._id ? data.workspace : w))
      );
      if (activeWorkspace._id === ws._id) setActiveWorkspace(data.workspace);
    } catch (err) {
      console.error("Failed to rename workspace:", err);
      alert("Rename failed!");
    }
  };

  const deleteWorkspace = async (ws) => {
    if (!window.confirm(`Delete workspace "${ws.name}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:4000/workspace/${ws._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkspaces((prev) => prev.filter((w) => w._id !== ws._id));
      if (activeWorkspace._id === ws._id)
        setActiveWorkspace(workspaces[0] || null);
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      alert("Delete failed!");
    }
  };

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="relative bg-gray-900 text-white h-screen w-screen py-8  overflow-auto">
      {/* Header */}
      <div className="flex z-60 hover:scale-102 transition-all duration-500 justify-between rounded-2xl mx-4 my-4 border-2 items-center p-4 bg-gray-950/50 border-gray-700 shadow-2xl shadow-blue-900/10 hover:shadow-2xl hover:shadow-blue-500/20">
        <h2 className="text-xl font-bold">
          Welcome, {user.name || user.email}
        </h2>
        <button
          onClick={handleLogout}
          className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
        >
          <LogOut />
        </button>
      </div>

      {/* ✨ Invite Modal (Fullscreen) */}
{showModal && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
    {/* Fullscreen overlay */}
    <div className="absolute inset-0 bg-black/50"></div>

    {/* Modal content */}
    <div className="relative z-50 w-full max-w-md mx-auto bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 p-6 flex flex-col justify-center">
      {/* Close Button */}
      <button
        onClick={() => setShowModal(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
      >
        <X size={24} />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 justify-center">
        <UserPlus size={28} className="text-green-400" />
        <h3 className="text-xl font-bold text-green-400">Invite User</h3>
      </div>

      {/* Input */}
      <div className="relative mb-6 w-full">
        <Mail
          size={20}
          className="absolute left-3 top-3 text-gray-400 pointer-events-none"
        />
        <input
          type="email"
          placeholder="Enter user email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-10 pr-3 py-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-green-500 focus:ring-2 focus:ring-green-500/50 outline-none transition-all duration-200 placeholder-gray-400"
          disabled={loading}
        />
      </div>

      {/* Send Button */}
      <button
        onClick={sendInvite}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl w-full font-semibold transition-all duration-300 cursor-pointer ${
          loading
            ? "bg-gray-700 cursor-not-allowed text-gray-400"
            : "bg-green-500 hover:bg-green-600 text-black shadow-md hover:shadow-green-500/30"
        }`}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send size={20} /> Send Invite
          </>
        )}
      </button>

      {/* Status */}
      {status && (
        <p className="mt-4 text-sm text-center text-gray-300 animate-fade-in">
          {status}
        </p>
      )}
    </div>
  </div>
)}

      {/* Workspace Selector with Search, Favorites, Reorder */}
<div className="m-4 p-5 bg-gray-900/60 border border-gray-700/70 backdrop-blur-md rounded-2xl shadow-lg flex flex-col gap-4">

  {/* 🔝 Toolbar Section */}
  <div className="flex flex-wrap items-center justify-between gap-4">
    {/* Workspace Label + Search */}
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-gray-300 font-medium flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        Workspace
      </span>

      <div className="relative w-64">
        <input
          type="text"
          placeholder="Search workspace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-3 pr-10 py-2 rounded-xl bg-gray-800/70 border border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all duration-300 outline-none"
        />
        <Search
          size={18}
          className="absolute right-3 top-2.5 text-gray-400 pointer-events-none"
        />
      </div>
    </div>

    {/* Invite Button */}
    {activeWorkspace && (
      <button
        onClick={() => setShowModal(true)}
        title="Invite user to workspace"
        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/40 text-green-400 font-medium rounded-xl hover:bg-green-500/20 hover:scale-105 hover:shadow-md transition-all will-change-transform duration-300"
      >
        <UserPlus size={18} className="text-green-400" />
        <span className="hidden sm:inline">Invite</span>
      </button>
    )}
  </div>

  

  {/* 🧱 Workspace List Section */}
  <div className="border-t border-gray-700/50 pt-3">
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (active.id !== over?.id) {
          const oldIndex = workspaces.findIndex((w) => w._id === active.id);
          const newIndex = workspaces.findIndex((w) => w._id === over.id);
          setWorkspaces((prev) => arrayMove(prev, oldIndex, newIndex));
        }
      }}
    >
      <SortableContext
        items={filteredWorkspaces.map((w) => w._id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex flex-wrap gap-3 mt-3">
          {filteredWorkspaces.map((ws) => {
            const isActive = activeWorkspace?._id === ws._id;
            const isFav = ws.favorite;
            const isOwner = (ws.owner?._id || ws.owner) === user.id;

            return (
              <SortableItem key={ws._id} id={ws._id}>
                <div
                  title={`Created: ${new Date(ws.createdAt).toLocaleDateString()} | Members: ${ws.members?.length || 0}`}
                  onClick={() => handleWorkspaceSwitch(ws)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all will-change-transform duration-300 border ${
                    isActive
                      ? "bg-green-600/20 border-green-500/40 text-green-300"
                      : "bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/50"
                  } hover:scale-105 hover:shadow-md`}
                >
                  <span className="whitespace-nowrap font-medium will-change-transform">
                    {ws.name}
                  </span>

                  {/* ⭐ Favorite Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setWorkspaces((prev) =>
                        prev.map((w) =>
                          w._id === ws._id
                            ? { ...w, favorite: !w.favorite }
                            : w
                        )
                      );
                    }}
                    className="ml-1"
                  >
                    <Star
                      size={15}
                      className={
                        isFav
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-400 group-hover:text-yellow-300"
                      }
                    />
                  </button>

                  {/* 👤 Members */}
                  {ws.members?.length > 0 && (
                    <div className="flex -space-x-2 ml-1">
                      {ws.members.slice(0, 3).map((m) => (
                        <img
                          key={m.userId._id}
                          src={m.userId.avatar || "/default-avatar.png"}
                          className="w-5 h-5 rounded-full border-2 border-gray-900"
                          alt={m.userId.name}
                        />
                      ))}
                    </div>
                  )}

                  {/* ⋮ Menu */}
                  {isOwner && (
                    <div className="relative ml-2 z-50">
                      <button
                        className="p-1 rounded  hover:bg-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(
                            (prev) => (prev === ws._id ? null : ws._id)
                          );
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {menuOpen === ws._id && (
                        <div className="absolute top-7 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-lg text-sm overflow-hidden z-50">
  {/* Rename Button */}
  <button
    onClick={() => {
      setMenuOpen(null);
      renameWorkspace(ws);
    }}
    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 transition-colors duration-200 w-full"
  >
    <Pen size={18} className="text-gray-400 hover:text-green-400 transition-colors duration-200" />
    <span className="text-gray-200 hover:text-green-400">Rename</span>
  </button>

  {/* Delete Button */}
  <button
    onClick={() => {
      setMenuOpen(null);
      deleteWorkspace(ws);
    }}
    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 transition-colors duration-200 w-full"
  >
    <Trash size={18} className="text-red-400 hover:text-red-500 transition-colors duration-200" />
    <span className="text-red-400 hover:text-red-500">Delete</span>
  </button>
</div>

                      )}
                    </div>
                  )}
                </div>
              </SortableItem>
            );
          })}

          {/* ➕ Add Button */}
          <button
            onClick={createWorkspace}
            className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 hover:bg-blue-500/30 hover:scale-105 transition-all duration-300"
          >
            + Add
          </button>
        </div>
      </SortableContext>
    </DndContext>
  </div>
</div>





{/* Pending Invites */}
{pendingInvites.length > 0 && (
  <div className="p-4 bg-gray-800 mt-2 rounded-lg">
    <h3 className="font-bold mb-2 text-green-400">Pending Invites</h3>
    {pendingInvites.map((invite) => (
      <div
        key={invite.token}
        className="flex justify-between items-center bg-gray-700 p-2 rounded mb-2"
      >
        <div>
          <p className="font-semibold">{invite.workspaceName}</p>
          <p className="text-sm text-gray-400">
            Invited by: {invite.invitedBy}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAcceptInvite(invite.token)}
            className="bg-green-500 hover:bg-green-600 text-black px-3 py-1 rounded"
          >
            Accept
          </button>
          <button
            onClick={() => handleRejectInvite(invite.token)}
            className="bg-red-500 hover:bg-red-600 text-black px-3 py-1 rounded"
          >
            Reject
          </button>
        </div>
      </div>
    ))}
  </div>
)}


      


      {/* Workspace Panels */}
      {activeWorkspace ? (
  <div className="h-[calc(100%)] w-full p-4 flex flex-col gap-4">
    
    {/* Row 1: Chat + Video */}
    <div className="flex flex-1 gap-2 -mt-8 ">
      <div className="flex-1 bg-transparent rounded  min-h-[400px]  overflow-auto">
        {socket && (
          <Chat
            user={user}
            socket={socket}
            workspaceId={activeWorkspace._id}
          />
        )}
      </div>
      <div className="w-1/3 bg-transparent rounded overflow-auto mt-20 h-[250px] flex flex-col items-center justify-center">
        {socket && <VideoCall workspaceId={activeWorkspace._id} user={user} socket={socket} />}
      </div>
    </div>

    {/* Row 2: TaskBoard */}
    <div className="min-h-[200px] bg-transparent rounded mb-20 overflow">
      {socket && (
        <TaskBoard socket={socket} workspaceId={activeWorkspace._id} />
      )}
    </div>

    {/* Row 3: Editor / Whiteboard */}
    <div className="flex-1 bg-transparent rounded overflow-auto min-h-[1100px]   overflow-x-hidden flex flex-col">
      <div className="flex justify-end pr-4 pb-2">
        <EditorWhiteboardToggle
          isEditor={showEditor}
          onToggle={() => setShowEditor((prev) => !prev)}
        />
      </div>
      <div className="flex-1 overflow-x-hidden rounded-b-lg">
        {socket && showEditor ? (
          <CollaborativeEditor user={userObj} workspace={activeWorkspace} />
        ) : (
          <Whiteboard
            user={user}
            socket={socket}
            workspaceId={activeWorkspace._id}
          />
        )}
      </div>
    </div>

  </div>
) : (
  <p className="text-center w-full mt-10">No workspace selected.</p>
)}
    </div>
  );
}