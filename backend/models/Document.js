import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace" },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Document", DocumentSchema);
