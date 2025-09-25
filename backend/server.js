const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = "dev-secret";
const users = {};          // userId -> user info
const messages = [];       // chat history
const online = {};         // userId -> array of socketIds
const tasks = [];
const whiteboardLines = [];
const whiteboardShapes = [];
const whiteboardTexts = [];

// --- Login ---
app.post("/login", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const id = "u" + Math.random().toString(36).substr(2, 6);
  const user = { id, name };
  users[id] = user;

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "6h" });
  res.json({ token, user });
});

// --- Get last 50 messages ---
app.get("/messages", (req, res) => res.json(messages.slice(-50)));

app.get("/", (req, res) => res.send("Backend running ✅"));

// --- Helper to build online users array ---
function buildOnlineList() {
  return Object.keys(online).map((id) => ({
    id,
    name: users[id]?.name || "Unknown",
  }));
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // --- Authentication ---
  const token = socket.handshake.auth?.token;
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET);

      if (!online[user.id]) online[user.id] = [];
      online[user.id].push(socket.id);

      io.emit("presence", buildOnlineList());
    } catch (err) {
      console.log("Invalid token");
    }
  }

  // --- Chat ---
  socket.on("chat:message", (msg) => {
    const message = {
      id: Date.now(),
      user: user || { id: "anon", name: "Anonymous" },
      text: msg,
      ts: new Date()
    };
    messages.push(message);
    io.emit("chat:message", message);
  });

  // --- Tasks ---
  socket.emit("tasks:init", tasks);
  socket.on("task:add", (task) => {
    if (!tasks.find(t => t.title === task.title && t.status === task.status)) {
      const newTask = { id: nanoid(), ...task };
      tasks.push(newTask);
      io.emit("tasks:update", tasks);
    }
  });
  socket.on("task:update", ({ id, status }) => {
    const task = tasks.find((t) => t.id === id);
    if (task) { task.status = status; io.emit("tasks:update", tasks); }
  });
  socket.on("task:delete", (id) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) { tasks.splice(index, 1); io.emit("tasks:update", tasks); }
  });

  // --- Whiteboard real-time ---
  socket.emit("whiteboard:init", {
    lines: whiteboardLines,
    shapes: whiteboardShapes,
    texts: whiteboardTexts
  });

  socket.on("whiteboard-line", (line) => {
    whiteboardLines.push(line);
    socket.broadcast.emit("whiteboard-line", line);
  });

  socket.on("whiteboard-shape", (shape) => {
    whiteboardShapes.push(shape);
    socket.broadcast.emit("whiteboard-shape", shape);
  });

  socket.on("whiteboard-text", (text) => {
    whiteboardTexts.push(text);
    io.emit("whiteboard-text", text);
  });

  socket.on("whiteboard-transform", (updated) => {
    if (updated.type === "shape") {
      const index = whiteboardShapes.findIndex(s => s.id === updated.id);
      if (index !== -1) whiteboardShapes[index] = updated;
      io.emit("whiteboard-transform", updated);
    } else if (updated.type === "text") {
      const index = whiteboardTexts.findIndex(t => t.id === updated.id);
      if (index !== -1) whiteboardTexts[index] = updated;
      io.emit("whiteboard-transform", updated);
    }
  });

  socket.on("whiteboard-clear", () => {
    whiteboardLines.length = 0;
    whiteboardShapes.length = 0;
    whiteboardTexts.length = 0;
    io.emit("whiteboard-clear");
  });

  // --- Video Call (WebRTC Signaling) ---
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("user-joined", socket.id);
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
    if (user && online[user.id]) {
      online[user.id] = online[user.id].filter(id => id !== socket.id);
      if (online[user.id].length === 0) delete online[user.id];
      io.emit("presence", buildOnlineList());
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
