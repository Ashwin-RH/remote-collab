// routes/workspace.js
import express from "express";
import { Workspace } from "../models/Workspace.js";
import { User } from "../models/User.js";
import { verifyToken } from "./auth.js";
import { nanoid } from "nanoid";


const router = express.Router();

/**
 * POST /workspace
 * Create workspace (owner becomes admin + added to user's workspaces)
 */
router.post("/", verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });

  try {
    const workspace = await Workspace.create({
      name,
      owner: req.user.id,
      members: [{ userId: req.user.id, role: "admin" }],
    });

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { workspaces: workspace._id } });

    // return populated workspace for client convenience
    const populated = await Workspace.findById(workspace._id)
      .populate("owner", "name email")
      .populate("members.userId", "name email");

    res.status(201).json({ workspace: populated });
  } catch (err) {
    console.error("Create workspace error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /workspace
 * Get all workspaces for current user
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    // Option A: populate from user record
    const user = await User.findById(req.user.id).populate({
      path: "workspaces",
      populate: [{ path: "owner", select: "name email" }, { path: "members.userId", select: "name email" }],
    });

    // user.workspaces may be undefined if user doesn't have the field — guard it
    res.json({ workspaces: user?.workspaces || [] });
  } catch (err) {
    console.error("Fetch workspaces error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /workspace/join
 * Join a workspace (adds member if not already present)
 */
router.post("/join", verifyToken, async (req, res) => {
  const { workspaceId } = req.body;
  if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    console.log("Inviting to workspace:", workspaceId);

    const already = workspace.members.some((m) => m.userId.toString() === req.user.id);
    if (!already) {
      workspace.members.push({ userId: req.user.id, role: "member" });
      await workspace.save();
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { workspaces: workspace._id } });
    }

    const populated = await Workspace.findById(workspace._id)
      .populate("owner", "name email")
      .populate("members.userId", "name email");

    res.json({ workspace: populated });
  } catch (err) {
    console.error("Join workspace error:", err);
    res.status(500).json({ message: err.message });
  }
});


// GET /workspace/invites
router.get("/invites", verifyToken, async (req, res) => {
  try {
    const invites = await Workspace.aggregate([
  { $unwind: "$invites" },
  { $match: { "invites.email": req.user.email } },
  {
    $lookup: {
      from: "users",
      localField: "invites.invitedBy",
      foreignField: "_id",
      as: "inviter",
    },
  },
  {
    $project: {
      _id: 0,
      workspaceName: "$name",
      invitedBy: { $arrayElemAt: ["$inviter.email", 0] },
      token: "$invites.token",
    },
  },
]);

    res.json({ invites });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invites" });
  }
});


/**
 * GET /workspace/:id
 * Fetch workspace details (with ownerId included)
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate("owner", "name email")
      .populate("members.userId", "name email");

    if (!workspace)
      return res.status(404).json({ message: "Workspace not found" });

    res.json({
      workspace: {
        ...workspace.toObject(),
        ownerId: workspace.owner._id, // 👈 add this explicitly
      },
    });
  } catch (err) {
    console.error("Fetch workspace error:", err);
    res.status(500).json({ message: err.message });
  }
});


/**
 * PUT /workspace/:id
 * Rename workspace (only owner or admin can rename)
 */
router.put("/:id", verifyToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name required" });

  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Check permissions: owner OR admin in members
    const isOwner = workspace.owner?.toString() === req.user.id;
    const isAdmin = workspace.members.some((m) => m.userId.toString() === req.user.id && m.role === "admin");

    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Not authorized" });

    workspace.name = name;
    await workspace.save();

    const populated = await Workspace.findById(workspace._id)
      .populate("owner", "name email")
      .populate("members.userId", "name email");

    res.json({ workspace: populated });
  } catch (err) {
    console.error("Rename workspace error:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /workspace/:id
 * Delete workspace (only owner can delete)
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Owner only
    if (!workspace.owner || workspace.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await workspace.deleteOne();

    // Remove from users
    await User.updateMany({ workspaces: workspace._id }, { $pull: { workspaces: workspace._id } });

    // TODO (optional): delete tasks/messages/docs that belong to workspace
    res.json({ message: "Workspace deleted successfully" });
  } catch (err) {
    console.error("Delete workspace error:", err);
    res.status(500).json({ message: err.message });
  }
});

// POST /workspace/:workspaceId/invite
router.post("/:workspaceId/invite", verifyToken, async (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;
  const inviter = req.user;
  const io = global._io;

  console.log("Email:", email)
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Step 1: Check if user exists
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ message: "User not found" });

    const invitedUserId = userToInvite._id.toString();

    // Step 2: Check if already a member
    const alreadyMember = workspace.members.some(
      (m) => m.userId.toString() === userToInvite._id.toString()
    );
    if (alreadyMember) return res.status(400).json({ message: "User is already in workspace" });

    if (!workspace.invites) {
  workspace.invites = []; // initialize if not present
}
    // Step 3: Check if already invited
    const alreadyInvited = workspace.invites.some((inv) => inv.email === email);
    if (alreadyInvited) return res.status(400).json({ message: "User is already invited" });

    // Step 4: Create invite token and save
    const token = nanoid(20);
    workspace.invites.push({ email, token, invitedBy: inviter.id });
    await workspace.save();

    if (global.onlineUsers && global.onlineUsers[invitedUserId]) {
  const sockets = global.onlineUsers[invitedUserId];
  sockets.forEach((socketId) => {
    io.to(socketId).emit("workspace:invited", {
      workspaceId,
      workspaceName: workspace.name,
      invitedBy: inviter.email,
      token, // optional
    });
  });
}

    // Step 5: Respond (no email sending)
    res.json({ message: `Invite created for ${email}`, token });
  } catch (err) {
    console.error("Workspace invite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /workspace/reject-invite
router.post("/reject-invite", verifyToken, async (req, res) => {
  const { token } = req.body;
  try {
    const workspace = await Workspace.findOne({ "invites.token": token });
    if (!workspace) return res.status(404).json({ message: "Invalid invite token" });

    workspace.invites = workspace.invites.filter(inv => inv.token !== token);
    await workspace.save();

    res.json({ message: "Invite rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// POST /workspace/join-with-token
router.post("/join-with-token", verifyToken, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });

  try {
    const workspace = await Workspace.findOne({ "invites.token": token });
    if (!workspace) return res.status(404).json({ message: "Invalid invite token" });

    const userAlreadyMember = workspace.members.some(m => m.userId.toString() === req.user.id);
    if (!userAlreadyMember) {
      workspace.members.push({ userId: req.user.id, role: "member" });
      await workspace.save();
      await User.findByIdAndUpdate(req.user.id, { $addToSet: { workspaces: workspace._id } });
    }

    // Remove invite
    workspace.invites = workspace.invites.filter(inv => inv.token !== token);
    await workspace.save();

    res.json({ message: `Joined workspace "${workspace.name}" successfully`, workspace });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
