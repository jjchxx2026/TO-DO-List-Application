"use client";

import { useMemo, useState } from "react";
import { Badge, Calendar as AntCalendar, Empty, Flex, Grid, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { CATEGORIES, DATE_FORMAT, getCategoryHex } from "@/utils/constants";
import TodoItem from "./TodoItem";

const { Text, Title } = Typography;
const MAX_TASKS_IN_CELL = 3;

// Calendar view (optional requirement 7).
//   - Each day shows the tasks due that day, coloured by category.
//   - Click a day to see its tasks below the calendar, where they can be
//     completed, edited or deleted just like in the list.
//   - On phones the calendar is compact and shows coloured dots instead of task names.
export default function TaskCalendar({ todos, onToggle, onEdit, onDelete }) {
  const screens = Grid.useBreakpoint();
  const isWide = screens.md !== false; // treat "unknown" (first render) as wide
  const [selectedDate, setSelectedDate] = useState(() => dayjs());

  // Group tasks by due date ("YYYY-MM-DD") and by month ("YYYY-MM") once per change.
  const { byDay, byMonth } = useMemo(() => {
    const day = new Map();
    const month = new Map();
    for (const todo of todos) {
      if (!todo.dueDate) continue;
      if (!day.has(todo.dueDate)) day.set(todo.dueDate, []);
      day.get(todo.dueDate).push(todo);
      const monthKey = todo.dueDate.slice(0, 7);
      month.set(monthKey, (month.get(monthKey) ?? 0) + 1);
    }
    return { byDay: day, byMonth: month };
  }, [todos]);

  const tasksOnSelectedDay = byDay.get(selectedDate.format(DATE_FORMAT)) ?? [];

  const renderDayCell = (date) => {
    const tasks = byDay.get(date.format(DATE_FORMAT));
    if (!tasks) return null;

    // Phones: one coloured dot per category that has tasks that day.
    if (!isWide) {
      const categories = [...new Set(tasks.map((t) => t.category))];
      return (
        <Flex justify="center" gap={2} className="cal-dots">
          {categories.map((c) => (
            <span key={c} className="cal-dot" style={{ background: getCategoryHex(c) }} />
          ))}
        </Flex>
      );
    }

    // Desktop: task names as small coloured bars.
    const shown = tasks.slice(0, MAX_TASKS_IN_CELL);
    const hidden = tasks.length - shown.length;
    return (
      <ul className="cal-tasks">
        {shown.map((task) => (
          <li key={task.id}>
            <Tooltip title={`${task.description} · ${task.category}${task.completed ? " · Completed" : ""}`}>
              <span
                className={`cal-task${task.completed ? " is-done" : ""}`}
                style={{ borderLeftColor: getCategoryHex(task.category), background: `${getCategoryHex(task.category)}14` }}
              >
                {task.description}
              </span>
            </Tooltip>
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <Text type="secondary" className="cal-more">
              +{hidden} more
            </Text>
          </li>
        )}
      </ul>
    );
  };

  // Year view: number of tasks due in each month.
  const renderMonthCell = (date) => {
    const count = byMonth.get(date.format("YYYY-MM"));
    return count ? <Badge count={count} color="#1677ff" overflowCount={999} /> : null;
  };

  const cellRender = (date, info) => {
    if (info.type === "date") return renderDayCell(date);
    if (info.type === "month") return renderMonthCell(date);
    return info.originNode;
  };

  return (
    <Flex vertical gap={16}>
      <Flex gap={16} wrap align="center" className="cal-legend" aria-label="Category colours">
        {CATEGORIES.map((c) => (
          <Flex key={c.value} gap={6} align="center">
            <span className="cal-dot" style={{ background: c.hex }} />
            <Text>{c.label}</Text>
          </Flex>
        ))}
        <Text type="secondary" className="cal-legend-hint">
          Click a day to see its tasks
        </Text>
      </Flex>

      <AntCalendar
        fullscreen={isWide}
        value={selectedDate}
        onSelect={(date) => setSelectedDate(date)}
        cellRender={cellRender}
        className="task-calendar"
      />

      <div>
        <Title level={5} style={{ marginBottom: 8 }}>
          Due on {selectedDate.format("dddd, D MMMM YYYY")}
          {tasksOnSelectedDay.length > 0 && (
            <Text type="secondary" style={{ fontWeight: "normal" }}>
              {" "}
              · {tasksOnSelectedDay.length} task{tasksOnSelectedDay.length === 1 ? "" : "s"}
            </Text>
          )}
        </Title>

        {tasksOnSelectedDay.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No tasks due on this day" />
        ) : (
          <ul className="todo-list">
            {tasksOnSelectedDay.map((todo) => (
              <li key={todo.id}>
                <TodoItem todo={todo} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Flex>
  );
}
