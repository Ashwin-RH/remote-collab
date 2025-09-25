import React, { memo } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";

// Provide default values directly in the parameter destructuring
const TaskColumn = ({ status = "todo", tasks = [], handleDelete = () => {} }) => {
  console.log("Rendering column", status, tasks);

  return (
    <Droppable
      droppableId={status}
      isDropDisabled={false}
      isCombineEnabled={false}
      ignoreContainerClipping={false}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-2 bg-amber-400 text-black border rounded-xl text-center min-w-[200px] ${
            snapshot.isDraggingOver ? "bg-blue-100" : "bg-gray-100"
          }`}
        >
          <h3 className="font-bold mb-2">{status.toUpperCase()}</h3>

          {tasks.map((task, index) => (
            <Draggable
              key={task.id}
              draggableId={String(task.id)}
              index={index}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`p-2 mb-2 text-black border rounded flex justify-between items-center transition-all duration-300 ${
                    snapshot.isDragging ? "bg-blue-300" : "bg-white"
                  }`}
                >
                  <span>{task.title}</span>
                  <button
                    className="text-red-500 font-bold ml-2"
                    onClick={() => handleDelete(task.id)}
                  >
                    ✕
                  </button>
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

// Keep memo for performance
export default memo(TaskColumn);
