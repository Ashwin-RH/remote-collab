import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: { type: String, default: "todo" },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedTo: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, default: null }
  }
}, { timestamps: true });

export const Task = mongoose.model("Task", taskSchema);
