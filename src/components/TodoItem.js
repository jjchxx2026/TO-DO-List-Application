"use client";

import { Button, Checkbox, Flex, Popconfirm, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, EditOutlined, HolderOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DATE_FORMAT, formatCreatedAt, getCategoryColor } from "@/utils/constants";

const { Text } = Typography;

// One row in the task list.
// `dragHandleProps` is only passed when drag-and-drop is on; the ⠿ handle is then the only
// part you can drag by, so clicking the checkbox or buttons still works normally.
export default function TodoItem({ todo, dragHandleProps, onToggle, onEdit, onDelete }) {
  const due = dayjs(todo.dueDate, DATE_FORMAT);
  const isOverdue = !todo.completed && due.isBefore(dayjs(), "day");
  const isDueToday = !todo.completed && due.isSame(dayjs(), "day");

  return (
    <Flex align="center" gap={12} className={`todo-item${todo.completed ? " is-done" : ""}`}>
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          className="drag-handle"
          aria-label={`Drag to reorder: ${todo.description}. Press space to pick up, arrow keys to move, space to drop.`}
          title="Drag to reorder"
        >
          <HolderOutlined />
        </span>
      )}
      <Checkbox
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
      />

      <Flex vertical gap={4} className="todo-item-main">
        <Text delete={todo.completed} type={todo.completed ? "secondary" : undefined}>
          {todo.description}
        </Text>
        <Flex gap={8} align="center" wrap>
          <Tag color={getCategoryColor(todo.category)}>{todo.category}</Tag>
          <Text type={isOverdue ? "danger" : "secondary"} className="todo-item-date">
            Due {due.format("D MMM YYYY")}
            {isOverdue && " · Overdue"}
            {isDueToday && " · Today"}
          </Text>
        </Flex>
        <Text type="secondary" className="todo-item-created">
          Created {formatCreatedAt(todo.createdAt)}
        </Text>
      </Flex>

      <Flex gap={4}>
        <Tooltip title="Edit">
          <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(todo)} aria-label="Edit task" />
        </Tooltip>
        <Popconfirm
          title="Delete this task?"
          description="This can't be undone."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(todo.id)}
        >
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} aria-label="Delete task" />
          </Tooltip>
        </Popconfirm>
      </Flex>
    </Flex>
  );
}
