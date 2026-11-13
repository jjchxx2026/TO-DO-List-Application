"use client";

import { Empty, Skeleton } from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import TodoItem from "./TodoItem";

// Shows a list of tasks (already searched/filtered/sorted/paged by the parent).
// `emptyText` lets the parent say *why* the list is empty.
//
// Drag-and-drop (optional requirement 8) uses @hello-pangea/dnd, the maintained
// version of react-beautiful-dnd. It is only switched on (`canReorder`) when the list
// is in "My order" with no search or filter, because dragging a sorted or filtered
// list would be confusing.
export default function TodoList({
  todos,
  isLoaded,
  emptyText,
  emptyAction,
  canReorder = false,
  onReorder,
  onToggle,
  onEdit,
  onDelete,
}) {
  if (!isLoaded) {
    return <Skeleton active paragraph={{ rows: 3 }} />;
  }

  if (todos.length === 0) {
    return <Empty description={emptyText}>{emptyAction}</Empty>;
  }

  if (!canReorder) {
    return (
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}>
            <TodoItem todo={todo} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          </li>
        ))}
      </ul>
    );
  }

  const handleDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    // Tell the parent: "move this task to where that task is".
    onReorder(todos[source.index].id, todos[destination.index].id);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todo-list">
        {(dropProvided) => (
          <ul className="todo-list" ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {todos.map((todo, index) => (
              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                {(dragProvided, snapshot) => (
                  <li
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={snapshot.isDragging ? "is-dragging" : undefined}
                  >
                    <TodoItem
                      todo={todo}
                      dragHandleProps={dragProvided.dragHandleProps}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </li>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
