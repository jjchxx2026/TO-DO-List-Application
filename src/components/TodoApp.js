"use client";

import { useMemo, useState } from "react";
import { App, Button, Card, Flex, Segmented, Typography } from "antd";
import { CalendarOutlined, UnorderedListOutlined, UploadOutlined } from "@ant-design/icons";
import { useTodos } from "@/hooks/useTodos";
import { applyFilters, DEFAULT_FILTERS, hasActiveFilters } from "@/utils/filterTodos";
import AddTodo from "./AddTodo";
import Filters from "./Filters";
import TodoList from "./TodoList";
import TodoPagination, { DEFAULT_PAGE_SIZE } from "./TodoPagination";
import EditTodo from "./EditTodo";
import ImportTodos from "./ImportTodos";
import ExportTodos from "./ExportTodos";
import TaskCalendar from "./Calendar";

const { Title, Text } = Typography;

const VIEW_OPTIONS = [
  { value: "list", label: "List", icon: <UnorderedListOutlined /> },
  { value: "calendar", label: "Calendar", icon: <CalendarOutlined /> },
];

// The main screen. It owns the "which task is being edited" state and connects
// the components to the useTodos hook.
function TodoScreen() {
  const { message } = App.useApp();
  const { todos, isLoaded, addTodo, editTodo, deleteTodo, toggleTodo, importTodos, reorderTodos } =
    useTodos();
  const [editingTodo, setEditingTodo] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState("list"); // "list" or "calendar"
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const completedCount = todos.filter((t) => t.completed).length;

  // 1. Search / filter / sort the full list (recalculated only when tasks or filters change).
  const visibleTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);
  const isFiltering = hasActiveFilters(filters);

  // Drag-and-drop only makes sense when you see the tasks in your own order, unfiltered.
  const canReorder = filters.sort === "default" && !isFiltering;

  // 2. Cut out the current page. If the page no longer exists (e.g. you deleted the
  //    last task on the last page), fall back to the last page that does.
  const totalPages = Math.max(1, Math.ceil(visibleTodos.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTodos = visibleTodos.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // A new search, filter or sort always starts again from page 1.
  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };
  const clearFilters = () => updateFilters({ ...DEFAULT_FILTERS, sort: filters.sort });

  const handlePageChange = (nextPage, nextPageSize) => {
    if (nextPageSize !== pageSize) {
      // Changing tasks-per-page: stay on the page that contains the first task you were looking at.
      const firstIndex = (currentPage - 1) * pageSize;
      setPageSize(nextPageSize);
      setPage(Math.floor(firstIndex / nextPageSize) + 1);
    } else {
      setPage(nextPage);
    }
  };

  const handleAdd = (values) => {
    addTodo(values);
    setPage(1); // new tasks are added at the top, so show page 1
    message.success("Task added");
  };

  const handleSave = (id, changes) => {
    editTodo(id, changes);
    setEditingTodo(null);
    message.success("Task updated");
  };

  const handleDelete = (id) => {
    deleteTodo(id);
    message.success("Task deleted");
  };

  const handleImport = (tasks, mode, { skipped, duplicates }) => {
    const count = importTodos(tasks, mode);
    setFilters(DEFAULT_FILTERS); // show everything so the imported tasks are visible
    setPage(1);
    const notes = [
      skipped > 0 && `${skipped} invalid row${skipped === 1 ? "" : "s"} skipped`,
      duplicates > 0 && `${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped`,
    ].filter(Boolean);
    message.success(
      `Imported ${count} task${count === 1 ? "" : "s"}${notes.length ? ` (${notes.join(", ")})` : ""}`
    );
  };

  return (
    <main className="page">
      <Flex vertical gap={20}>
        <Flex justify="space-between" align="flex-end" gap={12} wrap>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>
              To-Do List
            </Title>
            <Text type="secondary">
              {isLoaded
                ? `${todos.length} task${todos.length === 1 ? "" : "s"} · ${completedCount} completed`
                : "Loading your tasks…"}
            </Text>
          </div>

          <Flex gap={8} wrap>
            <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)} disabled={!isLoaded}>
              Import
            </Button>
            <ExportTodos allTodos={todos} visibleTodos={visibleTodos} isFiltering={isFiltering} />
          </Flex>
        </Flex>

        <Card title="Add a new task">
          <AddTodo onAdd={handleAdd} />
        </Card>

        <Card
          title="Your tasks"
          extra={<Segmented options={VIEW_OPTIONS} value={view} onChange={setView} aria-label="View" />}
        >
          {/* Search and status filter apply to both views; sorting only matters in the list. */}
          <Filters filters={filters} onChange={updateFilters} showSort={view === "list"} />
          {isLoaded && isFiltering && (
            <Text type="secondary" className="filter-count">
              Showing {visibleTodos.length} of {todos.length} tasks
            </Text>
          )}

          {view === "calendar" ? (
            <TaskCalendar
              todos={visibleTodos}
              onToggle={toggleTodo}
              onEdit={setEditingTodo}
              onDelete={handleDelete}
            />
          ) : (
            <>
              <TodoList
                todos={pageTodos}
                isLoaded={isLoaded}
                emptyText={
                  todos.length === 0
                    ? "No tasks yet. Add your first one above."
                    : "No tasks match your search or filter."
                }
                emptyAction={
                  todos.length > 0 && isFiltering ? (
                    <Button onClick={clearFilters}>Clear filters</Button>
                  ) : null
                }
                canReorder={canReorder}
                onReorder={reorderTodos}
                onToggle={toggleTodo}
                onEdit={setEditingTodo}
                onDelete={handleDelete}
              />
              {isLoaded && !canReorder && visibleTodos.length > 1 && (
                <Text type="secondary" className="reorder-hint">
                  To rearrange tasks by dragging, choose “My order” and clear the search and filter.
                </Text>
              )}
              {isLoaded && (
                <TodoPagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={visibleTodos.length}
                  onChange={handlePageChange}
                />
              )}
            </>
          )}
        </Card>
      </Flex>

      <EditTodo todo={editingTodo} onSave={handleSave} onCancel={() => setEditingTodo(null)} />
      <ImportTodos
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingTodos={todos}
        onImport={handleImport}
      />
    </main>
  );
}

// Ant Design's <App> wrapper lets components show pop-up messages (message.success).
export default function TodoApp() {
  return (
    <App>
      <TodoScreen />
    </App>
  );
}
