import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "Anonymous" },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }]
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
