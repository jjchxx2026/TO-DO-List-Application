"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "todos";
const EMPTY = [];

let cachedTodos = null; // the parsed list, so we don't re-read localStorage on every render
const listeners = new Set();

function readFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted data or storage blocked: start with an empty list rather than crash.
    return [];
  }
}

function getSnapshot() {
  if (cachedTodos === null) cachedTodos = readFromStorage();
  return cachedTodos;
}

function getServerSnapshot() {
  return EMPTY;
}

function subscribe(listener) {
  listeners.add(listener);

  // If the app is open in two tabs, keep them in sync.
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      cachedTodos = readFromStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Replace the whole list: update the cache, save to localStorage, tell React to re-render.
function saveTodos(updater) {
  const next = typeof updater === "function" ? updater(getSnapshot()) : updater;
  cachedTodos = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the change still shows until the page is reloaded.
  }
  listeners.forEach((listener) => listener());
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// The hook every component uses.
// ---------------------------------------------------------------------------

export function useTodos() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // True once we're in the browser and the saved list has been read.
  const isLoaded = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  // { description, dueDate, category } -> adds a new, incomplete task at the top.
  const addTodo = useCallback(({ description, dueDate, category }) => {
    const todo = {
      id: createId(),
      description: description.trim(),
      dueDate,
      category,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    saveTodos((current) => [todo, ...current]);
    return todo;
  }, []);

  // Change some fields of one task, e.g. editTodo(id, { description: "New text" }).
  // `id` and `createdAt` always keep their original values, even if `changes` contains them:
  // the date created is set once, when the task is added, and is never editable.
  const editTodo = useCallback((id, changes) => {
    saveTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              ...changes,
              description: (changes.description ?? todo.description).trim(),
              id: todo.id,
              createdAt: todo.createdAt,
            }
          : todo
      )
    );
  }, []);

  const deleteTodo = useCallback((id) => {
    saveTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  // Flip a task between complete and incomplete.
  const toggleTodo = useCallback((id) => {
    saveTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []);

  // Bulk import. `tasks` are { description, dueDate, category, completed } objects.
  // mode "add" puts them above the existing tasks (in file order); "replace" removes all
  // existing tasks first.
  const importTodos = useCallback((tasks, mode = "add") => {
    const now = Date.now();
    const created = tasks.map((task, i) => ({
      id: createId(),
      description: task.description.trim(),
      dueDate: task.dueDate,
      category: task.category,
      completed: Boolean(task.completed),
      // Slightly different times keep the file's order in "newest first" views.
      createdAt: new Date(now - i).toISOString(),
    }));
    saveTodos((current) => (mode === "replace" ? created : [...created, ...current]));
    return created.length;
  }, []);

  // Drag-and-drop: move the task with id `movedId` so it sits where `targetId` was.
  // Uses ids rather than positions so it works on any page of the list.
  const reorderTodos = useCallback((movedId, targetId) => {
    if (movedId === targetId) return;
    saveTodos((current) => {
      const from = current.findIndex((t) => t.id === movedId);
      const to = current.findIndex((t) => t.id === targetId);
      if (from === -1 || to === -1) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  return { todos, isLoaded, addTodo, editTodo, deleteTodo, toggleTodo, importTodos, reorderTodos };
}

function noopSubscribe() {
  return () => {};
}
