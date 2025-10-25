import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true }, // keep as string or ObjectId
  content: { type: String, required: true },
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  ts: { type: Date, default: Date.now },
  readBy: [{ type: String }], // user ids who have read
  reactions: [{ 
    emoji: String, 
    userId: String 
  }],
});


export const Message = mongoose.model("Message", messageSchema);
