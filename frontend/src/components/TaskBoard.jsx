import { useEffect, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import TaskColumn from "./TaskColumn";
import { getSocket } from "../socket";
import { toast } from "react-hot-toast";

const TaskBoard = ({ workspaceId }) => {
  const [tasks, setTasks] = useState([]);
  const [socket, setSocket] = useState(null);
  const [members, setMembers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
const [userId, setUserId] = useState(null); // current logged-in user


  const columns = ["todo", "inprogress", "done"];

  const normalizeTasks = (tasks) =>
  tasks.map(t => ({
    ...t,
    id: t._id || t.id,
    assignedTo: t.assignedTo
      ? typeof t.assignedTo === "string"
        ? { id: t.assignedTo, name: members.find(m => m.id === t.assignedTo)?.name || "Unknown" }
        : t.assignedTo
      : null
  }));


useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1])); // decode JWT payload
    setUserId(payload.id);
  }
}, []);


  useEffect(() => {
    if (!workspaceId) return;

    // Fetch workspace members 👥
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/workspace/${workspaceId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) {
          setMembers(data.workspace.members.map(m => ({
            id: m.userId._id,
            name: m.userId.name,
            email: m.userId.email
          })));
          setOwnerId(data.workspace.owner._id); 
        }
      } catch (err) {
        console.error("Failed to fetch members", err);
      }
    };

    fetchMembers();

    const s = getSocket(localStorage.getItem("token"));
    if (!s) return;
    setSocket(s);

    s.emit("workspace:join", { workspaceId });

    s.on(`tasks:init:${workspaceId}`, data => setTasks(normalizeTasks(data)));
  
  s.on(`tasks:update:${workspaceId}`, (data) => {
  console.log("📥 Received tasks update:", data);
  setTasks(normalizeTasks(data));
});

    return () => {
      s.off(`tasks:init:${workspaceId}`);
      s.off(`tasks:update:${workspaceId}`);
      // s.disconnect();
    };
  }, [workspaceId]);

  const addTask = (title, clearInput) => {
  if (!title.trim() || !socket) return;

  const tempTask = { 
    id: `temp-${Date.now()}`, 
    title, 
    status: "todo", 
    assignedTo: null 
  };

  // Optimistic add
  setTasks(prev => [...prev, tempTask]);
  clearInput?.();

  // Emit and replace temp with actual task
  socket.emit("task:add", { title, workspaceId }, (savedTask) => {
    setTasks(prev => prev.map(t => 
      t.id === tempTask.id ? savedTask : t
    ));
  });
};


  const handleDelete = (id) => {
    if (!socket || !workspaceId) return;
    socket.emit("task:delete", { id, workspaceId });
    toast("🗑 Task deleted", { icon: "⚡" });
  };

  const onDragEnd = (result) => {
  const { destination, source, draggableId } = result;
  if (!destination ||
    (destination.droppableId === source.droppableId && destination.index === source.index)) return;

  setTasks(prev => {
    const updated = Array.from(prev);
    const draggedIndex = updated.findIndex(t => t.id === draggableId);
    const [moved] = updated.splice(draggedIndex, 1);
    moved.status = destination.droppableId;

    // insert at correct position
    const insertIndex = updated.findIndex(
      (t, idx) =>
        t.status === destination.droppableId && idx >= destination.index
    );
    if (insertIndex === -1) updated.push(moved);
    else updated.splice(insertIndex, 0, moved);

    return updated;
  });

  socket.emit("task:update", { id: draggableId, status: destination.droppableId, workspaceId });
};



  return (
    <div className="flex flex-col bg-gray-900 border border-gray-600 rounded-2xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-700 p-6 gap-6 z-30">
  <input
    type="text"
    placeholder="New task ...."
    onKeyDown={(e) => {
      if (e.key === "Enter") addTask(e.target.value, () => (e.target.value = ""));
    }}
    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-2.5 text-gray-100 focus:shadow-2xl focus:shadow-blue-500/10 placeholder-gray-300/50 focus:ring-1  focus:ring-blue-500/50 focus:outline-none  focus:duration-1000 transition-all duration-300 z-10"
  />

  <DragDropContext onDragEnd={onDragEnd}>
    <div className="flex flex-wrap justify-center md:justify-between gap-6">
      {columns.map((col) => (
        <TaskColumn
           key={col}
          status={col}
          tasks={tasks.filter(t => t.status === col)}
          handleDelete={handleDelete}
          members={members}
          socket={socket}
          workspaceId={workspaceId}
          ownerId={ownerId}
          userId={userId}
        />
      ))}
    </div>
  </DragDropContext>
</div>

  );
};

export default TaskBoard;
