// Pure functions for searching, filtering and sorting the task list.
// They never change the original list; they return a new one.

export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Incomplete" },
  { value: "completed", label: "Completed" },
];

export const SORT_OPTIONS = [
  // "My order": new tasks go on top, and you can drag tasks to rearrange them.
  { value: "default", label: "My order (drag to rearrange)" },
  { value: "dueAsc", label: "Due date: earliest first" },
  { value: "dueDesc", label: "Due date: latest first" },
];

export const DEFAULT_FILTERS = { search: "", status: "all", sort: "default" };

// Search: case-insensitive, matches the task description only (as the requirement says).
// Several words are all required, in any order: "pay bill" finds "Pay electricity bill".
function matchesSearch(todo, search) {
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = todo.description.toLowerCase();
  return words.every((word) => text.includes(word));
}

function matchesStatus(todo, status) {
  if (status === "active") return !todo.completed;
  if (status === "completed") return todo.completed;
  return true;
}

// Due dates are "YYYY-MM-DD" text, which sorts correctly as plain text.
// Tasks without a due date always go to the bottom.
function compareDueDates(a, b, direction) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  const result = a.dueDate.localeCompare(b.dueDate);
  return direction === "desc" ? -result : result;
}

export function applyFilters(todos, { search, status, sort }) {
  const result = todos.filter((todo) => matchesSearch(todo, search) && matchesStatus(todo, status));

  // .sort() is stable, so tasks with the same due date keep "My order".
  if (sort === "dueAsc") result.sort((a, b) => compareDueDates(a, b, "asc"));
  if (sort === "dueDesc") result.sort((a, b) => compareDueDates(a, b, "desc"));

  return result;
}

export function hasActiveFilters({ search, status }) {
  return search.trim() !== "" || status !== "all";
}
