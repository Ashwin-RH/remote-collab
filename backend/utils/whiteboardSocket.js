// utils/whiteboardSocket.js
import { nanoid } from "nanoid";

export function initWhiteboardSocket(io, whiteboardState) {
  global.onlineUsers = global.onlineUsers || {};
  const users = {};

  function buildOnlineList(excludeSocketId) {
    return Object.entries(users).map(([id, info]) => ({
      id,
      name: info.name,
      online: true,
    }));
  }

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // ------------- USER SETUP -------------
    let user = socket.user; // if using JWT middleware
    if (!user) {
      const anonId = socket.handshake.auth?.anonId || "anon_" + nanoid(6);
      user = { id: anonId, name: "Anonymous" };
      socket.user = user;
    }
    const userId = user.id;

    // Initialize tracking
    if (!global.onlineUsers[userId]) global.onlineUsers[userId] = [];
    if (!global.onlineUsers[userId].includes(socket.id))
      global.onlineUsers[userId].push(socket.id);

    if (!users[userId]) users[userId] = { name: user.name, socketIds: [] };
    if (!users[userId].socketIds.includes(socket.id))
      users[userId].socketIds.push(socket.id);

    io.emit("presence", buildOnlineList(socket.id));

    // Ensure workspace structure
    function ensureWorkspaceState(wid) {
      if (!whiteboardState[wid]) {
        whiteboardState[wid] = {
          lines: [],
          shapes: [],
          texts: [],
          actions: [],
          undone: [],
          cursors: {},
          activeUsers: {},
        };
      }
      return whiteboardState[wid];
    }

    // ------------- JOIN WHITEBOARD -------------
    socket.on("whiteboard:join", ({ workspaceId }) => {
      if (!workspaceId) return;
      socket.join(workspaceId);
      const board = ensureWorkspaceState(workspaceId);

      socket.emit("whiteboard:init", {
        workspaceId,
        lines: board.lines,
        shapes: board.shapes,
        texts: board.texts,
      });

      io.to(socket.id).emit("whiteboard:activity", {
        workspaceId,
        activeUsers: board.activeUsers,
      });
      io.to(socket.id).emit("whiteboard:cursors", {
        workspaceId,
        cursors: board.cursors,
      });
    });

    // ------------- DRAW / SHAPE / TEXT -------------
    socket.on("whiteboard:line", ({ workspaceId, line }) => {
      if (!workspaceId || !line) return;
      const board = ensureWorkspaceState(workspaceId);
      board.lines.push(line);
      board.actions.push({ type: "add_line", payload: line, user: userId });
      board.undone = [];
      socket.to(workspaceId).emit("whiteboard:line", { workspaceId, line });
    });

    socket.on("whiteboard:shape", ({ workspaceId, shape }) => {
      if (!workspaceId || !shape) return;
      const board = ensureWorkspaceState(workspaceId);
      board.shapes.push(shape);
      board.actions.push({ type: "add_shape", payload: shape, user: userId });
      board.undone = [];
      socket.to(workspaceId).emit("whiteboard:shape", { workspaceId, shape });
    });

    socket.on("whiteboard:text", ({ workspaceId, text }) => {
      if (!workspaceId || !text) return;
      const board = ensureWorkspaceState(workspaceId);
      board.texts.push(text);
      board.actions.push({ type: "add_text", payload: text, user: userId });
      board.undone = [];
      socket.to(workspaceId).emit("whiteboard:text", { workspaceId, text });
    });

    // ------------- ERASER FEATURE -------------
socket.on("whiteboard:erase", ({ workspaceId, x, y, radius = 10 }) => {
  if (!workspaceId) return;
  const board = ensureWorkspaceState(workspaceId);

  // Remove nearby lines
  board.lines = board.lines.filter((line) => {
    for (let i = 0; i < line.points.length; i += 2) {
      const dx = line.points[i] - x;
      const dy = line.points[i + 1] - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) return false;
    }
    return true;
  });

  // Remove nearby shapes
  board.shapes = board.shapes.filter((shape) => {
    const dx = shape.x - x;
    const dy = shape.y - y;
    return Math.sqrt(dx * dx + dy * dy) > radius;
  });

  // Remove nearby text
  board.texts = board.texts.filter((t) => {
    const dx = t.x - x;
    const dy = t.y - y;
    return Math.sqrt(dx * dx + dy * dy) > radius;
  });

  board.actions.push({ type: "erase", user: userId, payload: { x, y, radius } });
  board.undone = [];

  io.to(workspaceId).emit("whiteboard:erase", { workspaceId, x, y, radius });
});


    socket.on("whiteboard:transform", ({ workspaceId, updated }) => {
      if (!workspaceId || !updated) return;
      const board = ensureWorkspaceState(workspaceId);

      if (updated.type === "shape") {
        board.shapes = board.shapes.map((s) =>
          s.id === updated.id ? updated : s
        );
        board.actions.push({ type: "transform_shape", payload: updated, user: userId });
      } else if (updated.type === "text") {
        board.texts = board.texts.map((t) =>
          t.id === updated.id ? { ...t, ...updated } : t
        );
        board.actions.push({ type: "transform_text", payload: updated, user: userId });
      }
      board.undone = [];
      socket.to(workspaceId).emit("whiteboard:transform", { workspaceId, updated });
    });

    socket.on("whiteboard:clear", ({ workspaceId }) => {
      if (!workspaceId) return;
      const board = ensureWorkspaceState(workspaceId);
      board.lines = [];
      board.shapes = [];
      board.texts = [];
      board.actions.push({ type: "clear", user: userId });
      board.undone = [];
      io.to(workspaceId).emit("whiteboard:clear", { workspaceId });
    });

    // ------------- CURSORS + ACTIVITY -------------
    socket.on("whiteboard:cursor", ({ workspaceId, x, y }) => {
      if (!workspaceId) return;
      const board = ensureWorkspaceState(workspaceId);
      board.cursors[userId] = { x, y, name: user.name, ts: Date.now() };
      socket
        .to(workspaceId)
        .emit("whiteboard:cursors", {
          workspaceId,
          cursors: { [userId]: board.cursors[userId] },
        });
    });

    socket.on("whiteboard:active", ({ workspaceId, active }) => {
      if (!workspaceId) return;
      const board = ensureWorkspaceState(workspaceId);
      if (active) {
        board.activeUsers[userId] = { name: user.name, lastActiveAt: Date.now() };
      } else {
        delete board.activeUsers[userId];
      }
      io.to(workspaceId).emit("whiteboard:activity", {
        workspaceId,
        activeUsers: board.activeUsers,
      });
    });

    socket.on("whiteboard:interact", ({ workspaceId, tool }) => {
  if (!workspaceId) return;
  const board = ensureWorkspaceState(workspaceId);

  board.activeUsers[userId] = {
    name: user.name,
    lastActiveAt: Date.now(),
    tool,
  };

  io.to(workspaceId).emit("whiteboard:activity", {
    workspaceId,
    activeUsers: board.activeUsers,
  });
});

    // ------------- UNDO / REDO -------------
    function rebuildFromActions(workspaceId) {
  const state = whiteboardState[workspaceId];
  if (!state) return;

  let lines = [];
  let shapes = [];
  let texts = [];

  state.actions.forEach(action => {
    switch(action.type) {
      case 'add_line':
        lines.push(action.payload);
        break;
      case 'add_shape':
        shapes.push(action.payload);
        break;
      case 'add_text':
        texts.push(action.payload);
        break;
      case 'erase':
        const { x, y, radius } = action.payload;

        lines = lines.filter(line => {
          for (let i = 0; i < line.points.length; i += 2) {
            const dx = line.points[i] - x;
            const dy = line.points[i + 1] - y;
            if (Math.sqrt(dx*dx + dy*dy) < radius) return false;
          }
          return true;
        });

        shapes = shapes.filter(shape => {
          const dx = shape.x - x;
          const dy = shape.y - y;
          return Math.sqrt(dx*dx + dy*dy) > radius;
        });

        texts = texts.filter(t => {
          const dx = t.x - x;
          const dy = t.y - y;
          return Math.sqrt(dx*dx + dy*dy) > radius;
        });
        break;

      case 'transform_shape':
        for (let i = 0; i < shapes.length; i++) {
          if (shapes[i].id === action.payload.id) shapes[i] = action.payload;
        }
        break;

      case 'transform_text':
        for (let i = 0; i < texts.length; i++) {
          if (texts[i].id === action.payload.id) texts[i] = { ...texts[i], ...action.payload };
        }
        break;

      case 'clear':
        lines = [];
        shapes = [];
        texts = [];
        break;
    }
  });

  state.lines = lines;
  state.shapes = shapes;
  state.texts = texts;
}


socket.on("whiteboard:undo", ({ workspaceId }) => {
  if (!workspaceId) return;
  const board = ensureWorkspaceState(workspaceId);
  if (board.actions.length === 0) return;

  const action = board.actions.pop();
  board.undone.push(action);

  rebuildFromActions(workspaceId); // ✅ use the new version

  io.to(workspaceId).emit("whiteboard:init", {
    workspaceId,
    lines: board.lines,
    shapes: board.shapes,
    texts: board.texts,
  });
});

socket.on("whiteboard:redo", ({ workspaceId }) => {
  if (!workspaceId) return;
  const board = ensureWorkspaceState(workspaceId);
  if (board.undone.length === 0) return;

  const action = board.undone.pop();
  board.actions.push(action);

  rebuildFromActions(workspaceId); // ✅ use the new version

  io.to(workspaceId).emit("whiteboard:init", {
    workspaceId,
    lines: board.lines,
    shapes: board.shapes,
    texts: board.texts,
  });
});


    // ------------- DISCONNECT CLEANUP -------------
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      if (users[userId]) {
        users[userId].socketIds = users[userId].socketIds.filter(
          (sid) => sid !== socket.id
        );
        if (users[userId].socketIds.length === 0) delete users[userId];
      }
      if (global.onlineUsers[userId]) {
        global.onlineUsers[userId] = global.onlineUsers[userId].filter(
          (sid) => sid !== socket.id
        );
        if (global.onlineUsers[userId].length === 0)
          delete global.onlineUsers[userId];
      }
      for (const [wid, board] of Object.entries(whiteboardState)) {
        if (board.cursors && board.cursors[userId]) {
          delete board.cursors[userId];
          io.to(wid).emit("whiteboard:cursors", {
            workspaceId: wid,
            cursors: { [userId]: null },
          });
        }
        if (board.activeUsers && board.activeUsers[userId]) {
          delete board.activeUsers[userId];
          io.to(wid).emit("whiteboard:activity", {
            workspaceId: wid,
            activeUsers: board.activeUsers,
          });
        }
      }
      io.emit("presence", buildOnlineList());
    });
  });
}
