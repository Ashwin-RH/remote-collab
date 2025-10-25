// models/Workspace.js
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
  },
  { _id: false }
);

const inviteSchema = new mongoose.Schema(
  {
    email: { type: String },
    token: { type: String },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [memberSchema],
  invites: [inviteSchema],
  createdAt: { type: Date, default: Date.now },
  actions: { type: Array, default: [] }, 
  undone: { type: Array, default: [] },

});

export const Workspace = mongoose.model("Workspace", workspaceSchema);
