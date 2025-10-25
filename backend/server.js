// --- Load environment variables first ---
import dotenv from "dotenv";
dotenv.config();
console.log("JWT_SECRET loaded:", process.env.JWT_SECRET);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env");
  process.exit(1);
}


import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";

import authRoutes, { verifyToken } from "./routes/auth.js";
import { Message } from "./models/Message.js";
import { Task } from "./models/Task.js";
import workspaceRoutes from "./routes/workspace.js";
import { Workspace } from "./models/Workspace.js";
import { initIO } from "./utils/socketServer.js";
import { initWhiteboardSocket } from "./utils/whiteboardSocket.js";




// Debugging .env values
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("PORT:", process.env.PORT);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/workspace", workspaceRoutes);

// --- MongoDB connection ---
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Check your .env file.");
  process.exit(1);
}

// In-memory whiteboard state for each workspace
const whiteboardState = {}; // { workspaceId: { lines: [], shapes: [], texts: [] } }


// --- Socket.io Server ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
    methods: ["GET", "POST"],
  },
});
global._io = io;
global.onlineUsers = {}; // userId -> [socketIds]

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    // console.log("✅ MongoDB Connected");

    // Start the server only after DB is ready
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));


// --- Express Routes ---
app.use("/auth", authRoutes);

// Example protected route
app.get("/protected", verifyToken, (req, res) => {
  res.json({ message: `Hello ${req.user.email}, you accessed a protected route!` });
});

// Optional REST endpoint to get latest messages
app.get("/messages", async (req, res) => {
  const msgs = await Message.find().sort({ ts: -1 }).limit(50);
  res.json(msgs.reverse());
});

// --- Helper Functions ---
const users = {};
const online = {};

// Add this helper
async function buildOnlineListForWorkspace(workspaceId, currentSocketId = null) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return [];

  const memberIds = workspace.members.map(m => m.userId.toString());
  return memberIds
    .filter(id => users[id])
    .map(id => ({
      id,
      name: users[id].socketIds.includes(currentSocketId)
        ? `${users[id].name} (you)`
        : users[id].name
    }));
}





io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log("Socket auth token received:", token);

  if (!token) return next(new Error("Authentication error: token missing"));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = { id: decoded.id, name: decoded.name || decoded.email };
    next();
  } catch (err) {
    console.warn("⚠️ Invalid socket token:", err.message);
    next(new Error("Authentication error: invalid token"));
  }
});




  io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);
  const user = socket.user;

  // Track online users
  const userId = user.id;
  if (!global.onlineUsers[userId]) global.onlineUsers[userId] = [];
  if (!global.onlineUsers[userId].includes(socket.id)) global.onlineUsers[userId].push(socket.id);

  if (!users[userId]) users[userId] = { name: user.name, socketIds: [] };
  if (!users[userId].socketIds.includes(socket.id)) users[userId].socketIds.push(socket.id);

  console.log("Current onlineUsers:", global.onlineUsers);
  console.log("Current users:", users);


  // --- 📨 Chat Events ---

  // Listen for new messages
  socket.on("chat:message", async ({ workspaceId, content }) => {
  if (!workspaceId || !content) return;

  const message = {
    workspaceId,
    content,
    user,
    ts: new Date(),
    readBy: [user.id],
    reactions: [],
  };

  try {
    const saved = await Message.create(message);
    console.log("✅ Message saved:", saved);
    io.to(workspaceId).emit("chat:message", saved);
  } catch (err) {
    console.error("❌ Failed to save message:", err);
  }
});

  // When user selects/joins a workspace
socket.on("workspace:join", async ({ workspaceId }) => {
  if (!workspaceId) return;
  const workspace = await Workspace.findById(workspaceId);
  const isMember = workspace?.members.some(m => m.userId.toString() === user.id);
  if (!workspace || !isMember) return;

  socket.join(workspaceId);
  socket.currentWorkspace = workspaceId;

  console.log(`${user.name} joined workspace ${workspaceId}`);

  // Await the online list
  const onlineList = await buildOnlineListForWorkspace(workspaceId, socket.id);
  io.to(workspaceId).emit("presence", onlineList);


    // Send recent messages & tasks
    const recentMessages = await Message.find({ workspaceId }).sort({ ts: -1 }).limit(50);
    const tasks = await Task.find({ workspaceId });
    socket.emit(`chat:init:${workspaceId}`, recentMessages.reverse());
    socket.emit(`tasks:init:${workspaceId}`, tasks.map(t => ({ ...t._doc, id: String(t._id) })));
  });


  // --- Workspace leave ---
  socket.on("workspace:leave", ({ workspaceId }) => {
    socket.leave(workspaceId);
    if (socket.currentWorkspace === workspaceId) socket.currentWorkspace = null;
    io.to(workspaceId).emit("presence", buildOnlineListForWorkspace(workspaceId));
  });


  // Add task
socket.on("task:add", async ({ title, status, workspaceId }) => {
  console.log(`📝 Task add received: ${title}, workspace: ${workspaceId}`);
  if (!title?.trim() || !workspaceId) return;

  const workspace = await Workspace.findById(workspaceId);
  const isMember = workspace?.members.some(m => m.userId.toString() === user.id);
  if (!workspace || !isMember) return;

  try {
    const task = await Task.create({ title: title.trim(), status: status || "todo", workspaceId });
    const allTasks = await Task.find({ workspaceId });
    io.to(workspaceId).emit(`tasks:update:${workspaceId}`, allTasks.map(t => ({ ...t._doc, id: String(t._id) })));
    console.log("✅ Task created:", task);
  } catch (err) {
    console.error("❌ Task creation failed:", err);
  }
});



  // Update task
socket.on("task:update", async ({ id, status, workspaceId, assignedTo }) => {
  if (!id || !workspaceId) return;

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return;

  // verify the user is at least a member
  const member = workspace.members.find(m => m.userId.toString() === user.id);
  if (!member) return;

  // only owner can assign members
  const isOwner = workspace.owner.toString() === user.id;

  const task = await Task.findById(id);
  if (!task) return;

  if (status) task.status = status;

  // ✅ allow assignment only for owner
  if (assignedTo && isOwner) {
    task.assignedTo = assignedTo;
  } else if (assignedTo && !isOwner) {
    console.warn(`User ${user.id} is not owner and cannot assign tasks.`);
    return; // prevent unauthorized assignment
  }

  await task.save();

  const allTasks = await Task.find({ workspaceId });
  io.to(workspaceId).emit(`tasks:update:${workspaceId}`,
    allTasks.map(t => ({ ...t._doc, id: String(t._id) }))
  );
});

// Delete task
socket.on("task:delete", async ({ id, workspaceId }) => {
  if (!id || !workspaceId) return;

  const workspace = await Workspace.findById(workspaceId);
  const isMember = workspace?.members.some(m => m.userId.toString() === user.id);
  if (!workspace || !isMember) return;

  await Task.findByIdAndDelete(id);
  const allTasks = await Task.find({ workspaceId });
  io.to(workspaceId).emit(`tasks:update:${workspaceId}`, allTasks.map(t => ({ ...t._doc, id: String(t._id) })));
});

initWhiteboardSocket(io, whiteboardState);

  // --- WebRTC Signaling for workspace-specific video calls ---
 socket.on("join-room", async (workspaceId) => {
    const workspace = await Workspace.findById(workspaceId);
    const isMember = workspace?.members.some(m => m.userId.toString() === user.id);
    if (!workspace || !isMember) return;
    socket.join(workspaceId);

     // Notify the joining socket about existing users
  const clients = Array.from(io.sockets.adapter.rooms.get(workspaceId) || []);
  clients.forEach(clientId => {
    if (clientId !== socket.id) {
      socket.emit("user-joined", clientId);
    }
  });
  
    socket.to(workspaceId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

    // --- Disconnect ---
  socket.on("disconnect", () => {
    // Remove socket from users
    if (users[user.id]) {
      users[user.id].socketIds = users[user.id].socketIds.filter(sid => sid !== socket.id);
      if (users[user.id].socketIds.length === 0) delete users[user.id];
    }

    // Remove socket from global onlineUsers
    if (global.onlineUsers[user.id]) {
      global.onlineUsers[user.id] = global.onlineUsers[user.id].filter(sid => sid !== socket.id);
      if (global.onlineUsers[user.id].length === 0) delete global.onlineUsers[user.id];
    }

    // Emit presence only if user was in a workspace
    const workspaceId = socket.currentWorkspace;
    if (workspaceId) {
      io.to(workspaceId).emit("presence", buildOnlineListForWorkspace(workspaceId));
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

