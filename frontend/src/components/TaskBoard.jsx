import { useEffect, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import io from "socket.io-client";
import TaskColumn from "./TaskColumn";

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [socket, setSocket] = useState(null);

  const columns = ["todo", "inprogress", "done"];

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const s = io("http://localhost:4000", { auth: { token } });
  setSocket(s);

  s.on("tasks:init", (data) => {
    // Replace tasks array and ensure unique IDs
    const uniqueTasks = data.map((t) => ({ ...t, id: String(t.id) }));
    setTasks(uniqueTasks);
  });

 s.on("tasks:update", (data) => {
  const uniqueTasks = Array.from(new Map(data.map((t) => [t.id, t])).values());
  setTasks(uniqueTasks.map(t => ({ ...t, id: String(t.id) })));
});


  return () => {
    s.disconnect();
  };
}, []);

  const handleDelete = (id) => {
  if (!socket) return;
  socket.emit("task:delete", id);
};

  const onDragEnd = (result) => {
  const { destination, source, draggableId } = result;
  if (!destination) return;
  if (
    destination.droppableId === source.droppableId &&
    destination.index === source.index
  )
    return;

  if (socket) {
    socket.emit("task:update", {
      id: draggableId,
      status: destination.droppableId,
    });
  }
};


  const addTask = (title) => {
    if (!socket || !title) return;
    socket.emit("task:add", { title, status: "todo" });
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      <input
        type="text"
        placeholder="New task..."
        onKeyDown={(e) => e.key === "Enter" && addTask(e.target.value)}
        className="border p-2 rounded w-full"
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          {columns.map((col) => (
            <TaskColumn
              key={col}
              status={col}
              tasks={tasks.filter((t) => t.status === col)}
              handleDelete={handleDelete}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default TaskBoard;
