import { Trash } from "lucide-react";
import React, { memo } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";

const TaskColumn = ({ status = "todo", tasks = [], handleDelete, members, socket, workspaceId, ownerId, userId }) => {
  const assignUser = (taskId, member) => {
  socket.emit("task:update", {
    id: taskId,
    assignedTo: member ? member.id : null, // only id
    workspaceId,
  });
};


  return (
    <Droppable droppableId={status}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-2 border bg-gray-900  border-2 border-blue-500/20 hover:border-blue-500/40 rounded-xl min-w-[250px] max-h-[75vh] overflow-y-auto transition-colors ${
            snapshot.isDraggingOver ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          <h3 className="bg-gradient-to-tr text-center from-amber-500 to-amber-700 bg-clip-text text-transparent font-bold mb-2">{status.toUpperCase()}</h3>
          {tasks.map((task, index) => (
            <Draggable key={task.id} draggableId={task.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`p-2 mb-2 border rounded flex flex-col gap-1 ${snapshot.isDragging ? "bg-gray-700/50 text-white border-transparent rounded-xl" : "bg-gray-800/50 text-gray-200 border-gray-200/20 border-2 shadow-2xl shadow-white/5 rounded-xl hover:rounded-lg transition-all duration-500 hover:scale-101"}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{task.title}</span>
                    {!snapshot.isDragging && (
          <button
            className="opacity-30 hover:opacity-100 text-red-500 border border-transparent hover:text-red-500 hover:bg-gray-200/15 font-bold ml-2 p-1 rounded-lg cursor-pointer transition-all duration-500"
            onClick={() => handleDelete(task.id)}
          >
            <Trash size={19} />
          </button>
        )}
                  </div>

                  {/* 👇 Assign User Dropdown */}
                  <select
  disabled={!userId || !ownerId || userId !== ownerId}
  value={task.assignedTo?.id || ""}
  onChange={(e) => {
    const selected = members.find(m => m.id === e.target.value);
    assignUser(task.id, selected);
  }}
  className={`text-xs border p-1 rounded bg-gray-800 text-white 
              ${userId !== ownerId ? "opacity-50 cursor-not-allowed" : "hover:border-amber-500 transition-all"}`}
>
  <option value="">Unassigned</option>
  {members.map((m) => (
    <option key={m.id} value={m.id}>
      {m.name}
    </option>
  ))}
</select>


                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default memo(TaskColumn);
