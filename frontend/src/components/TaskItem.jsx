import { Draggable } from "react-beautiful-dnd";

const TaskItem = ({ task, index }) => {
  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="bg-white p-2 mb-2 rounded shadow cursor-pointer"
        >
          {task.title}
        </div>
      )}
    </Draggable>
  );
};

export default TaskItem;
