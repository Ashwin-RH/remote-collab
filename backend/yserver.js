import http from "http";
import express from "express";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js"; // path depends on version
import * as Y from "yjs";
import dotenv from "dotenv";
import { MongoClient, Binary } from "mongodb";
import { Workspace } from "./models/Workspace.js";
import jwt from "jsonwebtoken";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error("MONGO_URI missing");

const mongoClient = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
await mongoClient.connect();
const db = mongoClient.db(process.env.MONGO_DB || "yjs");

// Collections:
// 1️⃣ yjs_snapshots → stores document binary data
// 2️⃣ yjs_metadata → stores metadata (title, lastEdited, etc.)
const snaps = db.collection("yjs_snapshots");
const metadata = db.collection("yjs_metadata");

/**
 * Restore a Y.Doc from MongoDB snapshot
 */
async function restoreYDocFromSnapshot(ydoc, room) {
  const rec = await snaps.findOne({ room });
  if (!rec) return false;

  const buf = rec.snapshot.buffer ? rec.snapshot.buffer : rec.snapshot;
  const uint8 = new Uint8Array(buf);
  Y.applyUpdate(ydoc, uint8);
  return true;
}

/**
 * Save Y.Doc snapshot & metadata into MongoDB
 */
async function persistDocSnapshot(ydoc, room) {
  try {
    const state = Y.encodeStateAsUpdate(ydoc);

    // Store snapshot
    await snaps.updateOne(
      { room },
      {
        $set: {
          room,
          snapshot: new Binary(Buffer.from(state)),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Update metadata (optional: add title, etc.)
    await metadata.updateOne(
      { room },
      {
        $set: {
          room,
          lastEditedAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`✅ Persisted snapshot for room ${room}`);
  } catch (err) {
    console.error("❌ persistDocSnapshot error:", err);
  }
}

/**
 * Manage in-memory Y.Doc map
 */
const docs = new Map(); // room -> { ydoc, saveTimer }

function getOrCreateDoc(room) {
  if (docs.has(room)) return docs.get(room).ydoc;

  const ydoc = new Y.Doc();

  // restore from MongoDB if exists
  restoreYDocFromSnapshot(ydoc, room)
    .then((restored) => console.log(`🧩 ${room} restored:`, restored))
    .catch((e) => console.error("restore failed:", e));

  // set periodic auto-save
  const saveTimer = setInterval(() => persistDocSnapshot(ydoc, room), 20_000);
  docs.set(room, { ydoc, saveTimer });

  return ydoc;
}

/**
 * WebSocket connection handler
 */
wss.on("connection", async (conn, req) => {
  const room = req.url.slice(1).split("?")[0] || "default";

  // Extract user token from query
  const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get("token");
  if (!token) return conn.close();

  let user;
  try { user = jwt.verify(token, JWT_SECRET); } catch { return conn.close(); }

  // Check if user is member of workspace
  const workspace = await Workspace.findById(room);
  if (!workspace || !workspace.members.some(m => m.userId.toString() === user.id)) {
    return conn.close();
  }

  const ydoc = getOrCreateDoc(room);
  setupWSConnection(conn, req, { docMap: new Map([[room, ydoc]]), gc: true });
});


const PORT = process.env.PORT || 1234;
server.listen(PORT, () =>
  console.log(`🚀 y-websocket server listening on port ${PORT}`)
);
