import { motion } from "framer-motion";
import { Draggable } from "react-beautiful-dnd";

const TaskItem = ({ task, index, handleDelete }) => {
  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          layout  // this enables smooth position transitions
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={`p-2 mb-2 border rounded flex justify-between items-center ${
            snapshot.isDragging ? "bg-blue-300" : "bg-white"
          }`}
        >
          <span>{task.title}</span>
{task.assignedTo && <span className="text-xs text-gray-500 ml-1">({task.assignedTo.name})</span>}

          <button
            onClick={() => handleDelete(task.id)}
            className="text-red-500 font-bold ml-2"
          >
            ✕
          </button>
        </motion.div>
      )}
    </Draggable>
  );
};
export default TaskItem;