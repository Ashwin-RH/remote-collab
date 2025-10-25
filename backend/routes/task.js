import express from "express";
import { Task } from "../models/Task.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create Task
router.post("/:workspaceId", authMiddleware, async (req, res) => {
  const { title, status, assignedTo } = req.body;
  const { workspaceId } = req.params;

  if (!title) return res.status(400).json({ message: "Title required" });

  const task = await Task.create({
    title,
    status: status || "todo",
    workspaceId,
    createdBy: req.user.id,
    assignedTo: assignedTo || null
  });

  res.status(201).json({ message: "Task created", task });
});

// Get Tasks for Workspace
router.get("/:workspaceId", authMiddleware, async (req, res) => {
  const { workspaceId } = req.params;
  const tasks = await Task.find({ workspaceId });
  res.json({ tasks });
});

// Update Task
router.put("/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { title, status, assignedTo } = req.body;
  const task = await Task.findById(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (title) task.title = title;
  if (status) task.status = status;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;

  await task.save();
  res.json({ message: "Task updated", task });
});

// Delete Task
router.delete("/:taskId", authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
});

export default router;
