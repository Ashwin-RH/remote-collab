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
const users = {};   // userId -> user info
const messages = []; // chat history
const online = {};   // userId -> socketId
const tasks=[];

// 🟢 Login (name only for now)
app.post("/login", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const id = "u" + Math.random().toString(36).substr(2, 6);
  const user = { id, name };
  users[id] = user;

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "6h" });
  res.json({ token, user });
});

// 🟢 Get last 50 messages
app.get("/messages", (req, res) => {
  res.json(messages.slice(-50));
});

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ---- Authentication ----
  const token = socket.handshake.auth?.token;
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET);
      online[user.id] = socket.id;
      io.emit("presence", Object.keys(online));
    } catch (err) {
      console.log("Invalid token");
    }
  }

  // ---- Chat ----
  socket.on("chat:message", (msg) => {
    const message = {
      id: Date.now(),
      user: user || { id: "anon", name: "Anonymous" },
      text: msg,
      ts: new Date(),
    };
    messages.push(message);
    io.emit("chat:message", message);
  });

  // ---- Tasks ----
  socket.emit("tasks:init", tasks); // send existing tasks

socket.on("task:add", (task) => {
  if (!tasks.find(t => t.title === task.title && t.status === task.status)) {
    const newTask = { id: nanoid(), ...task };
    tasks.push(newTask);
    io.emit("tasks:update", tasks);
  }
});




 socket.on("task:update", ({ id, status }) => {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = status;
    io.emit("tasks:update", tasks);
  }
});


  socket.on("task:delete", (id) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks.splice(index, 1);
      io.emit("tasks:update", tasks);
    }
  });

  // ---- Disconnect ----
  socket.on("disconnect", () => {
    if (user) {
      delete online[user.id];
      io.emit("presence", Object.keys(online));
    }
    console.log("User disconnected:", socket.id);
  });
});



const PORT = 4000;
server.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`)
);
