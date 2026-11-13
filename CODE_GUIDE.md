# Code Guide — understanding the To-Do List Application

This guide explains **how the code works and why it is written the way it is**. It is meant to be read with the code open beside it in VS Code.

- Read [Part 1](#part-1--the-big-picture) first: it explains the ideas every file relies on.
- Then follow [Part 2](#part-2--file-by-file) in order — it goes through the files in the same order data flows through the app.
- [Part 3](#part-3--following-one-action-from-click-to-screen) follows single actions (adding a task, searching, dragging) through all the files.
- [Part 4](#part-4--questions-you-may-be-asked) has questions you may be asked about the code, with answers.
- [Part 5](#part-5--exercises-to-check-your-understanding) has small changes to try, to check you really understand it.

The [README](README.md) explains *what* the app does; this guide explains *how* and *why*.

---

## Part 1 — The big picture

### 1.1 What happens when you open the app

```
Browser opens http://localhost:3000
        │
        ▼
src/app/layout.js        the page shell (<html>, <body>) + Ant Design styles
        │
        ▼
src/app/page.js          the home page — just renders <TodoApp />
        │
        ▼
src/components/TodoApp.js        the main screen ("the boss")
   │  gets the task list from ──► src/hooks/useTodos.js ──► browser localStorage
   │  searches/filters/sorts with ► src/utils/filterTodos.js
   │  cuts out the current page
   │
   ├── AddTodo.js        add-task form
   ├── Filters.js        search box, status filter, sort
   ├── TodoList.js       the list (with drag-and-drop) ──► TodoItem.js (one row)
   ├── TodoPagination.js Previous / Next / page numbers / tasks per page
   ├── Calendar.js       calendar view ──► TodoItem.js
   ├── EditTodo.js       edit pop-up
   ├── ImportTodos.js    import pop-up ──► src/utils/importExport.js
   └── ExportTodos.js    export button ──► src/utils/importExport.js
```

**One rule explains the whole design:** there is **one** list of tasks, owned by `useTodos`. Every component either *reads* it (to display) or *asks for a change* (add, edit, delete…). No component keeps its own copy. This is why everything always stays in sync — the list, the calendar, the counts and the saved data.

### 1.2 React ideas used everywhere

| Idea | What it means | Example in this project |
|---|---|---|
| **Component** | A function that returns what to show on screen. Names start with a capital letter. | `function TodoItem(...) { return <Flex>…</Flex>; }` |
| **Props** | Inputs passed from a parent component to a child, like function arguments. | `<TodoItem todo={todo} onDelete={handleDelete} />` |
| **State** (`useState`) | Data a component remembers between screen updates. Changing it makes React redraw the screen. | `const [page, setPage] = useState(1);` |
| **Derived values** | Values *calculated* from state on every render instead of stored separately. | `pageTodos` is calculated from `visibleTodos`, `page` and `pageSize`. |
| **Hook** | A function starting with `use` that gives a component extra abilities. You can write your own. | `useTodos()` is our own hook. |
| **Callback props** | A child doesn't change data itself; it calls a function the parent gave it. | `TodoItem` calls `onDelete(todo.id)`; the parent decides what deleting means. |
| **Controlled component** | A form control whose value comes from props, and which reports changes through a callback. | `Filters` gets `filters` and calls `onChange(...)`. |
| **Immutability** | Never change an array/object in place — make a new one. React notices a *new* object; it may not notice a changed one. | `[todo, ...current]` creates a new array instead of `current.unshift(todo)`. |

### 1.3 Next.js: Server Components and Client Components

Next.js can run components in two places:

- **Server Components** (the default): run on the server and send finished HTML. They **cannot** use `useState`, click handlers, or browser features such as `localStorage`.
- **Client Components**: run in the browser. You mark a file with `"use client"` on its first line.

Our app keeps its data in the browser (`localStorage`) and is fully interactive, so almost every component is a Client Component. Only `layout.js` and `page.js` stay as Server Components — they just render the client part.

**Important consequence:** even Client Components are first rendered once on the server (to send fast initial HTML), and then "come alive" in the browser. This step is called **hydration**. On the server there is no `localStorage`, so the server cannot know your tasks. That is why `useTodos` has a special "server snapshot" (an empty list) and an `isLoaded` flag — explained in [2.5](#25-srchooksusetodosjs--the-heart-of-the-app).

### 1.4 The shape of one task

Every task is a plain JavaScript object:

```js
{
  id: "3e95c1d2-…",                    // unique, never changes — used to find the task
  description: "Write test plan",
  dueDate: "2026-11-25",              // text in YYYY-MM-DD format (see below why)
  category: "Work",                   // "Work", "Personal" or "Urgent"
  completed: false,
  createdAt: "2026-11-12T06:57:43.768Z"
}
```

**Why is `dueDate` text and not a `Date` object?**
1. `localStorage` can only store text, so dates would become text anyway.
2. `"2026-11-25"` sorts correctly as plain text (year → month → day), so sorting by due date is a simple text comparison.
3. A date with no time has no time-zone problems. A `Date` object is a moment in time, and "midnight 25 Nov" in one time zone can be 24 Nov in another.

**Why an `id`?** Descriptions can repeat ("Pay bill" twice), and positions change when you sort or filter. The `id` is the only thing that always identifies exactly one task.

---

## Part 2 — File by file

### 2.1 `src/app/layout.js` — the page shell

```js
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

export const metadata = {
  title: "To-Do List Application",
  description: "Manage your tasks: add, edit, complete, search, import and export.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
```

| Line | Why |
|---|---|
| `import "./globals.css"` | Loads our own styles for every page. |
| `export const metadata` | Next.js reads this to set the browser tab title and the page description. |
| `RootLayout({ children })` | Every page is placed inside this layout; `children` is the page (`page.js`). |
| `<AntdRegistry>` | Ant Design creates its CSS with JavaScript. Without this wrapper, the server-rendered HTML has no Ant Design styles, so the page flashes unstyled for a moment when it loads. The registry collects the styles during server rendering and puts them into the HTML. |
| `lang="en"` | Tells browsers and screen readers the page is in English. |

### 2.2 `src/app/page.js` — the home page

```js
import TodoApp from "@/components/TodoApp";

export default function Home() {
  return <TodoApp />;
}
```

`page.js` inside `src/app/` is the page at `/` (the home address). It stays a Server Component and just shows `TodoApp`, which is a Client Component.

`@/` is a **path alias** set in `jsconfig.json`: `@/components/TodoApp` means `src/components/TodoApp`. It avoids long relative paths like `../../components/TodoApp`.

### 2.3 `next.config.mjs` — Next.js settings

```js
const nextConfig = {
  // Cache Components (server-side caching) is turned off: …
};
```

`create-next-app` turned on a Next.js 16 feature called **Cache Components**. It pre-renders pages at build time and fails the build if it finds random values during rendering. Ant Design's style registry uses a random value, so the build failed. The feature is about caching *server* data, and this app has none, so it was simply turned off (by leaving the settings empty).

### 2.4 `src/utils/constants.js` — shared settings

```js
export const CATEGORIES = [
  { value: "Work", label: "Work", color: "blue", hex: "#1677ff" },
  { value: "Personal", label: "Personal", color: "green", hex: "#52c41a" },
  { value: "Urgent", label: "Urgent", color: "red", hex: "#f5222d" },
];
```

**Why one shared list?** The categories appear in the add form, the edit pop-up, the list tags, the calendar, the legend, the import checks and the Excel template. If each place had its own copy, adding a category would mean changing many files and they could disagree. Here, adding `{ value: "Shopping", … }` once updates everything.

- `value` / `label` — the shape Ant Design's `Select` and `Radio.Group` expect for options, so the array can be passed directly: `<Select options={CATEGORIES} />`.
- `color` — a name Ant Design's `Tag` understands (`<Tag color="blue">`).
- `hex` — the same colour as a code, for the calendar bars and dots, which are plain HTML and need a real colour value.

```js
export function getCategoryColor(category) {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "default";
}
```

- `.find(...)` returns the matching category or `undefined`.
- `?.color` — **optional chaining**: if `find` returned `undefined`, don't crash, just give `undefined`.
- `?? "default"` — **nullish coalescing**: if the result is `undefined`/`null`, use `"default"` (grey). This protects against an unknown category.

```js
export function isBeforeToday(date) {
  return Boolean(date) && date.isBefore(dayjs().startOf("day"), "day");
}
```

Used to block past due dates. `dayjs().startOf("day")` is today at 00:00. Comparing with `"day"` precision ignores the time, so *today* counts as allowed. `Boolean(date) &&` makes an empty date return `false` instead of crashing.

```js
export const notInPastRule = {
  validator: (_, value) =>
    isBeforeToday(value) ? Promise.reject(new Error("…")) : Promise.resolve(),
};
```

Ant Design form rules can have a `validator` function that returns a **Promise**: `Promise.resolve()` means "valid", `Promise.reject(error)` means "invalid — show this message". The date picker already greys out past days; this rule also catches a past date typed straight into the box. The `_` is a parameter we don't use (the rule object), named `_` by convention.

### 2.5 `src/hooks/useTodos.js` — the heart of the app

This file is the **only** place that reads or writes `localStorage`. Every other part of the app gets tasks from here.

#### The storage helpers (outside the hook)

```js
const STORAGE_KEY = "todos";
const EMPTY = [];

let cachedTodos = null;
const listeners = new Set();
```

| Line | Why |
|---|---|
| `STORAGE_KEY` | The name the list is saved under in localStorage. Written once so it can't be mistyped in different places. |
| `EMPTY = []` | One fixed empty array for the server. It must be the *same* array every time — if a new `[]` were returned each time, React would think the data changed on every render and loop forever. |
| `cachedTodos` | The list after `JSON.parse`. Parsing on every render would be slow, and — more importantly — would give a *new* array each time, causing the same endless-update problem. `null` means "not read yet". |
| `listeners` | The components currently showing the list. When the list changes we "call" them so React redraws. A `Set` avoids adding the same listener twice. |

```js
function readFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

- `getItem` returns text, or `null` if nothing was saved yet → then use `[]`.
- `JSON.parse` turns the text back into an array.
- `Array.isArray(parsed)` — if someone stored something that isn't a list, ignore it.
- `try … catch` — `JSON.parse` throws an error on damaged text, and some browsers block storage in private mode. Instead of crashing the whole app, start with an empty list.

```js
function getSnapshot() {
  if (cachedTodos === null) cachedTodos = readFromStorage();
  return cachedTodos;
}

function getServerSnapshot() {
  return EMPTY;
}
```

- `getSnapshot` — "what is the list right now?" in the browser. Reads storage only the first time, then returns the cached list.
- `getServerSnapshot` — the same question on the server, where there is no localStorage, so the answer is the empty list.

```js
function subscribe(listener) {
  listeners.add(listener);

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
```

- React calls `subscribe` with a `listener` function, meaning: "call this when the data changes".
- The browser fires a **`storage` event** when *another tab* changes localStorage. We re-read the list and notify React, so two open tabs stay in sync.
- The function returned at the end is the **clean-up**: React calls it when the component disappears, so we stop listening (prevents memory leaks).

```js
function saveTodos(updater) {
  const next = typeof updater === "function" ? updater(getSnapshot()) : updater;
  cachedTodos = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
}
```

This is the single "write" function. Every change goes through it, in three steps:

1. **Work out the new list.** `updater` is usually a function like `(current) => [newTodo, ...current]`, which receives the current list and returns a new one. (Accepting a function is the same pattern as React's `setState(prev => …)`; it always works on the latest list.)
2. **Save** it: update the cache and write it to localStorage as JSON text. If storage is full or blocked, the change still shows on screen.
3. **Notify**: call every listener so React redraws all components using the list.

```js
function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
```

`crypto.randomUUID()` is built into modern browsers and makes a practically-unique id like `3e95c1d2-…`. Very old browsers don't have it, so there is a fallback made from the current time plus random characters.

#### The hook itself

```js
export function useTodos() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

**`useSyncExternalStore`** is React's built-in hook for reading data that lives *outside* React (here: localStorage). You give it the three functions above:
- `subscribe` — how to be told about changes,
- `getSnapshot` — how to read the current value in the browser,
- `getServerSnapshot` — what to use on the server.

**Why not the simpler `useState` + `useEffect`?** The common beginner version is:

```js
const [todos, setTodos] = useState([]);
useEffect(() => { setTodos(JSON.parse(localStorage.getItem("todos"))) }, []);
useEffect(() => { localStorage.setItem("todos", JSON.stringify(todos)) }, [todos]);
```

It has a classic bug: on the first render `todos` is `[]`, and the second effect can **save the empty list over your saved tasks** before they are loaded. Fixing it needs an extra "loaded" flag, and the project's lint rules also warn against calling `setState` inside `useEffect`. `useSyncExternalStore` avoids all of this, and handles the server/browser difference properly.

```js
  const isLoaded = useSyncExternalStore(noopSubscribe, () => true, () => false);
```

A small trick using the same hook: it returns `false` on the server and `true` in the browser. While it is `false`, the app shows "Loading your tasks…" and a skeleton instead of "No tasks yet" — otherwise users would briefly see an empty list before their tasks appear. `noopSubscribe` ("no-operation") never notifies, because this value never changes once in the browser.

```js
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
```

- `({ description, dueDate, category })` — **destructuring**: take these three fields from the object passed in.
- `.trim()` removes spaces at the start/end, so `"  Buy milk "` is stored as `"Buy milk"`.
- New tasks are always incomplete.
- `[todo, ...current]` — a **new** array with the new task **first**, then all existing ones (`...` is the spread operator). New tasks go on top so you see them immediately.
- **`useCallback(fn, [])`** keeps the *same* function between renders. Not essential here, but it means components receiving these functions as props don't see a "new" prop on every render.

```js
  const editTodo = useCallback((id, changes) => {
    saveTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? { ...todo, ...changes, description: (changes.description ?? todo.description).trim() }
          : todo
      )
    );
  }, []);
```

- `.map` builds a new array: the task with the matching `id` is replaced, all others are kept as they are.
- `{ ...todo, ...changes }` — copy all old fields, then overwrite with the changed ones. Fields not in `changes` (like `id` and `createdAt`) are kept.
- `?? todo.description` — if `changes` has no description, keep the old one; then trim it.

```js
  const deleteTodo = useCallback((id) => {
    saveTodos((current) => current.filter((todo) => todo.id !== id));
  }, []);

  const toggleTodo = useCallback((id) => {
    saveTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  }, []);
```

- Delete: `.filter` keeps every task *except* the one with that id.
- Toggle: same as edit, but flips `completed` with `!` (true → false, false → true).

```js
  const importTodos = useCallback((tasks, mode = "add") => {
    const now = Date.now();
    const created = tasks.map((task, i) => ({
      id: createId(),
      …
      completed: Boolean(task.completed),
      createdAt: new Date(now - i).toISOString(),
    }));
    saveTodos((current) => (mode === "replace" ? created : [...created, ...current]));
    return created.length;
  }, []);
```

- Each imported row gets a fresh `id` (ids from a file can't be trusted to be unique).
- `Boolean(...)` makes sure `completed` is exactly `true` or `false`.
- `now - i` gives each task a slightly different time (1 millisecond apart), so they have a stable order.
- `"replace"` → the list becomes only the imported tasks; `"add"` → imported tasks go on top of the existing ones.
- It returns how many were added, so the screen can say "Imported 3 tasks".

```js
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
```

Used by drag-and-drop: "move task A to where task B is".
- `findIndex` gives each task's position in the **full** saved list (`-1` if not found).
- `[...current]` copies the array (never change the original — see immutability).
- `splice(from, 1)` removes the moved task and returns it in an array; `[moved]` takes it out.
- `splice(to, 0, moved)` inserts it at the target position (`0` = remove nothing).

**Why ids, not positions?** The screen shows one *page* at a time. "Position 2 on page 3" is not position 2 in the saved list. Using ids makes the move correct on any page.

```js
  return { todos, isLoaded, addTodo, editTodo, deleteTodo, toggleTodo, importTodos, reorderTodos };
}
```

The hook gives back the list plus all the functions to change it. Components never touch localStorage themselves.

### 2.6 `src/utils/filterTodos.js` — search, filter and sort

These are **pure functions**: they only take inputs and return a result, never change anything or touch the screen. That makes them easy to understand and easy to test on their own.

```js
export const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Incomplete" },
  { value: "completed", label: "Completed" },
];

export const SORT_OPTIONS = [
  { value: "default", label: "My order (drag to rearrange)" },
  { value: "dueAsc", label: "Due date: earliest first" },
  { value: "dueDesc", label: "Due date: latest first" },
];

export const DEFAULT_FILTERS = { search: "", status: "all", sort: "default" };
```

The options for the filter buttons and sort dropdown live here, next to the logic that uses their values, so the two can't drift apart. `DEFAULT_FILTERS` is the "nothing filtered" state, used at start-up and by **Clear filters**.

```js
function matchesSearch(todo, search) {
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = todo.description.toLowerCase();
  return words.every((word) => text.includes(word));
}
```

- `toLowerCase()` on both sides → the search ignores capital letters.
- `.split(/\s+/)` splits on any run of spaces: `"pay  bill"` → `["pay", "bill"]`.
- `.filter(Boolean)` removes empty strings.
- Empty search → every task matches.
- `.every(...)` → **all** words must appear, in any order. So "pay bill" finds "Pay electricity bill", which a plain "contains the exact phrase" search would miss.
- It searches **only the description**, exactly as the requirement says.

```js
function matchesStatus(todo, status) {
  if (status === "active") return !todo.completed;
  if (status === "completed") return todo.completed;
  return true;
}
```

`"all"` (or anything else) lets every task through.

```js
function compareDueDates(a, b, direction) {
  if (!a.dueDate && !b.dueDate) return 0;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  const result = a.dueDate.localeCompare(b.dueDate);
  return direction === "desc" ? -result : result;
}
```

A **compare function** for `.sort()`: returns a negative number if `a` should come first, positive if `b` should, `0` if equal.
- Tasks without a due date always go last (defensive — current tasks always have one, but imported or old data might not).
- `localeCompare` compares text; because dates are `YYYY-MM-DD`, text order is date order.
- For "latest first", the result is simply flipped with `-`.

```js
export function applyFilters(todos, { search, status, sort }) {
  const result = todos.filter((todo) => matchesSearch(todo, search) && matchesStatus(todo, status));
  if (sort === "dueAsc") result.sort((a, b) => compareDueDates(a, b, "asc"));
  if (sort === "dueDesc") result.sort((a, b) => compareDueDates(a, b, "desc"));
  return result;
}
```

- `.filter` already creates a **new** array, so sorting `result` afterwards doesn't change the saved list.
- `"default"` (My order) does no sorting — the saved order *is* "My order".
- JavaScript's `.sort` is **stable**: tasks with the same due date keep their "My order" position.

```js
export function hasActiveFilters({ search, status }) {
  return search.trim() !== "" || status !== "all";
}
```

True when the user is narrowing the list. Sorting is not counted, because sorting doesn't hide any tasks. Used to show "Showing X of Y", the **Clear filters** button, and to switch drag-and-drop off.

### 2.7 `src/components/TodoApp.js` — the main screen

This component connects everything. It holds the **screen state** (what you are looking at), while `useTodos` holds the **data**.

```js
function TodoScreen() {
  const { message } = App.useApp();
  const { todos, isLoaded, addTodo, … } = useTodos();
  const [editingTodo, setEditingTodo] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState("list");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
```

| State | Meaning |
|---|---|
| `editingTodo` | The task being edited, or `null` when the edit pop-up is closed. Storing the *task* (not just true/false) tells the pop-up what to edit. |
| `importOpen` | Whether the import pop-up is open. |
| `view` | `"list"` or `"calendar"`. |
| `filters` | `{ search, status, sort }`. |
| `page`, `pageSize` | Pagination. |

`App.useApp()` gives access to Ant Design's `message` (the small "Task added" pop-ups). It only works inside Ant Design's `<App>` wrapper — that's why the file ends with:

```js
export default function TodoApp() {
  return (
    <App>
      <TodoScreen />
    </App>
  );
}
```

The outer `TodoApp` provides the wrapper; the inner `TodoScreen` can then use `App.useApp()`.

#### Derived values: calculated, not stored

```js
  const completedCount = todos.filter((t) => t.completed).length;
  const visibleTodos = useMemo(() => applyFilters(todos, filters), [todos, filters]);
  const isFiltering = hasActiveFilters(filters);
  const canReorder = filters.sort === "default" && !isFiltering;
```

None of these are kept in `useState`. They are recalculated from `todos` and `filters` every time — so they **can never be out of date**. (A common bug is storing e.g. a "filtered list" in state and forgetting to update it when a task is added.)

**`useMemo(fn, [todos, filters])`** remembers the result and only recalculates when `todos` or `filters` change, not on unrelated updates such as opening a pop-up. Filtering is cheap here, but the memo also keeps `visibleTodos` the *same* array between renders, which the calendar relies on for its own `useMemo`.

`canReorder`: drag-and-drop is only on in "My order" with no search/filter (see [2.11](#211-srccomponentstodolistjs--the-list-and-drag-and-drop)).

#### Pagination maths

```js
  const totalPages = Math.max(1, Math.ceil(visibleTodos.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTodos = visibleTodos.slice((currentPage - 1) * pageSize, currentPage * pageSize);
```

Example: 12 tasks, 5 per page.
- `totalPages = ceil(12 / 5) = 3`. `Math.max(1, …)` makes it at least 1, so an empty list is "page 1 of 1", not "page 1 of 0".
- Page 3 → `slice(10, 15)` → tasks 11 and 12 (`slice` stops at the end of the array, so asking for up to 15 is fine).

**`currentPage = Math.min(page, totalPages)`** handles a tricky case: you are on page 3 and delete its last two tasks. Now there are only 2 pages, but `page` is still 3. Instead of showing an empty page 3, the screen uses page 2. This is calculated, not done with an extra state update, so it can't flicker.

```js
  const updateFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
  };
```

Any new search, filter or sort goes back to **page 1**. Otherwise, if you were on page 4 and searched for something with only 2 results, you'd see an empty page.

```js
  const handlePageChange = (nextPage, nextPageSize) => {
    if (nextPageSize !== pageSize) {
      const firstIndex = (currentPage - 1) * pageSize;
      setPageSize(nextPageSize);
      setPage(Math.floor(firstIndex / nextPageSize) + 1);
    } else {
      setPage(nextPage);
    }
  };
```

When tasks-per-page changes, keep showing the task you were looking at. Example: on page 3 with 5 per page, the first visible task is number 11 (index 10). Switching to 10 per page → `floor(10 / 10) + 1 = page 2`, which contains task 11.

#### Event handlers

```js
  const handleAdd = (values) => {
    addTodo(values);
    setPage(1);
    message.success("Task added");
  };
```

Saves the task, jumps to page 1 (where new tasks appear) and shows a confirmation. `handleSave`, `handleDelete` and `handleImport` follow the same pattern: **change the data → adjust the screen → tell the user**.

`handleImport` also resets the filters so the imported tasks are visible, and builds a message like "Imported 3 tasks (4 invalid rows skipped, 1 duplicate skipped)". The trick:

```js
    const notes = [
      skipped > 0 && `${skipped} invalid row…`,
      duplicates > 0 && `${duplicates} duplicate…`,
    ].filter(Boolean);
```

`condition && "text"` gives `false` when the condition is false; `.filter(Boolean)` then removes the `false` entries, leaving only the notes that apply.

`` `task${count === 1 ? "" : "s"}` `` — a small **ternary** to write "1 task" but "3 tasks".

#### What is rendered

- Header with counts, **Import** and **Export** buttons. `disabled={!isLoaded}` stops importing before the saved list is loaded.
- "Add a new task" card → `<AddTodo onAdd={handleAdd} />`.
- "Your tasks" card with a **List / Calendar** switch (`Segmented`) and the `Filters`.
- `view === "calendar" ? <TaskCalendar …/> : <> <TodoList …/> <TodoPagination …/> </>` — show one or the other. `<>…</>` is a **Fragment**: groups elements without adding an extra HTML tag.
- `<TodoList todos={pageTodos} … />` gets **only the current page**; the calendar gets **all** `visibleTodos` (a calendar has no pages).
- `onEdit={setEditingTodo}` — clicking edit simply stores the task; `<EditTodo todo={editingTodo} />` then opens because `todo` is no longer `null`.
- `{isLoaded && isFiltering && (<Text>Showing … </Text>)}` — `&&` renders the element only when all conditions are true.

### 2.8 `src/components/AddTodo.js` — the add form

```js
export default function AddTodo({ onAdd }) {
  const [form] = Form.useForm();
```

`Form.useForm()` gives a handle to control the form from code — here, to clear it after adding.

```js
  const handleFinish = (values) => {
    onAdd({
      description: values.description,
      dueDate: values.dueDate.format(DATE_FORMAT),
      category: values.category,
    });
    form.resetFields();
  };
```

- `onFinish` is only called by Ant Design **after all rules pass**, so `handleFinish` can trust the values.
- The `DatePicker` gives a **dayjs** object; `.format("YYYY-MM-DD")` turns it into the text format we store.
- `form.resetFields()` empties the form, ready for the next task.
- The form doesn't save anything itself — it calls `onAdd`. Keeping saving out of the form means the form only cares about input, and the parent decides what happens.

```js
    <Form … initialValues={{ category: DEFAULT_CATEGORY }} requiredMark={false} className="add-todo-form">
```

- `initialValues` — category starts as "Personal", so users don't have to choose every time.
- `requiredMark={false}` hides the red `*` (every field is required anyway; the rules still apply).

```js
      <Form.Item name="description" label="Task" rules={[
          { required: true, whitespace: true, message: "Please enter a task description" },
          { max: 200, message: "Keep it under 200 characters" },
      ]}>
```

- `name` connects the field to `values.description`.
- `whitespace: true` makes "only spaces" count as empty.
- `max: 200` keeps descriptions reasonable for the list and calendar.

```js
      <Form.Item name="dueDate" label="Due date"
        rules={[{ required: true, message: "Please pick a due date" }, notInPastRule]}>
        <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} disabledDate={isBeforeToday} />
```

- `disabledDate={isBeforeToday}` — the date picker calls this for every day it shows; days where it returns `true` are greyed out.
- `notInPastRule` — second line of defence for a typed date.
- Due dates are required so sorting, overdue labels and the calendar always work.

```js
      <Form.Item label=" ">
        <Button type="primary" htmlType="submit" …>Add task</Button>
```

- `htmlType="submit"` makes the button submit the form (pressing Enter in a field also submits).
- `label=" "` — an invisible label so the button lines up with the other fields, which all have labels above them.

### 2.9 `src/components/EditTodo.js` — the edit pop-up

```js
export default function EditTodo({ todo, onSave, onCancel }) {
```

`todo` is the task to edit, or `null`. The pop-up is open when there is a task:

```js
    <Modal open={Boolean(todo)} okText="Save" onOk={() => form.submit()} onCancel={onCancel} destroyOnHidden>
      {todo && ( <Form … initialValues={{ …from todo… }}> … )}
```

- `onOk={() => form.submit()}` — the pop-up's **Save** button is outside the form, so it asks the form to submit; the form then checks its rules and calls `onFinish`.
- `destroyOnHidden` — the form is removed when the pop-up closes, so it starts fresh next time. Without it, `initialValues` (which are only read once) would show the *previous* task's values.
- `initialValues` converts the stored text date back to a dayjs object with `dayjs(todo.dueDate, DATE_FORMAT)` — the opposite of what the add form does.
- The category uses **radio buttons** here (the add form uses a dropdown) — both styles the requirement mentions.

```js
  const isCurrentDueDate = (date) => Boolean(todo?.dueDate) && date.format(DATE_FORMAT) === todo.dueDate;
  const isDisabledDate = (date) => isBeforeToday(date) && !isCurrentDueDate(date);
```

Past dates are blocked when editing too, **except the task's own current date**. Reason: if a task is already overdue, you should still be able to rename it or mark it complete without being forced to invent a new due date.

### 2.10 `src/components/TodoItem.js` — one task row

```js
export default function TodoItem({ todo, dragHandleProps, onToggle, onEdit, onDelete }) {
  const due = dayjs(todo.dueDate, DATE_FORMAT);
  const isOverdue = !todo.completed && due.isBefore(dayjs(), "day");
  const isDueToday = !todo.completed && due.isSame(dayjs(), "day");
```

- Comparing with `"day"` ignores the time of day.
- Completed tasks are never "overdue" — they're done.

```js
      {dragHandleProps && ( <span {...dragHandleProps} className="drag-handle" aria-label="…">
          <HolderOutlined />
        </span> )}
```

The ⠿ handle only appears when drag-and-drop is on. `{...dragHandleProps}` passes the drag library's event handlers onto this element, so **only the handle** starts a drag — the checkbox and buttons keep working normally. `aria-label` explains the keyboard controls to screen-reader users.

```js
      <Checkbox checked={todo.completed} onChange={() => onToggle(todo.id)}
        aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"} />
```

A checkbox with no visible text needs an `aria-label` so screen readers can announce what it does.

```js
        <Text delete={todo.completed} type={todo.completed ? "secondary" : undefined}>
```

`delete` = strike-through, `secondary` = grey: the usual look for a finished task.

```js
          <Tag color={getCategoryColor(todo.category)}>{todo.category}</Tag>
          <Text type={isOverdue ? "danger" : "secondary"}>
            Due {due.format("D MMM YYYY")}
            {isOverdue && " · Overdue"}
            {isDueToday && " · Today"}
          </Text>
```

The stored `"2026-11-25"` is displayed as the friendlier "25 Nov 2026". Overdue dates are red (`danger`).

```js
        <Popconfirm title="Delete this task?" description="This can't be undone." okText="Delete"
          okButtonProps={{ danger: true }} onConfirm={() => onDelete(todo.id)}>
```

Deleting can't be undone, so it asks first. `onDelete` is only called if the user confirms.

`onClick={() => onEdit(todo)}` — the arrow function `() => …` is needed so the function runs **when clicked**. Writing `onClick={onEdit(todo)}` would call it immediately while drawing the screen.

### 2.11 `src/components/TodoList.js` — the list and drag-and-drop

```js
  if (!isLoaded) return <Skeleton active paragraph={{ rows: 3 }} />;
  if (todos.length === 0) return <Empty description={emptyText}>{emptyAction}</Empty>;
```

**Early returns** handle the special cases first: a grey placeholder while loading, then a friendly message when empty. The parent decides *which* message (`"No tasks yet…"` vs `"No tasks match your search…"`), because only the parent knows why the list is empty.

```js
  if (!canReorder) {
    return (
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}> <TodoItem … /> </li>
        ))}
      </ul>
    );
  }
```

The plain list. **`key={todo.id}`** is required by React when rendering a list: it tells React which row is which, so when the list changes it updates the right rows. Using the array index as the key would break when tasks are reordered or deleted.

When dragging is allowed, the same list is wrapped in the library's three building blocks:

```js
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="todo-list">
        {(dropProvided) => (
          <ul ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
            {todos.map((todo, index) => (
              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                {(dragProvided, snapshot) => (
                  <li ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                      className={snapshot.isDragging ? "is-dragging" : undefined}>
                    <TodoItem dragHandleProps={dragProvided.dragHandleProps} … />
                  </li>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
```

| Part | Role |
|---|---|
| `DragDropContext` | Watches all dragging; calls `onDragEnd` when an item is dropped. |
| `Droppable` | An area items can be dropped into (our `<ul>`). |
| `Draggable` | One item that can be dragged (each `<li>`). |
| `innerRef`, `droppableProps`, `draggableProps` | The library needs to attach to the real HTML elements to measure and move them. |
| `dragHandleProps` | Passed to `TodoItem` for the ⠿ handle. |
| `placeholder` | Keeps an empty gap the size of the dragged item while it moves. |
| `snapshot.isDragging` | Adds a shadow to the item being dragged. |

These use the **render-prop** pattern: instead of normal children, you give a *function* that receives what the library provides and returns the elements.

```js
  const handleDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    onReorder(todos[source.index].id, todos[destination.index].id);
  };
```

- `destination` is `null` if dropped outside the list → do nothing. Same position → do nothing.
- Positions are on the **current page**, so they are turned into task **ids** before calling `onReorder` (`reorderTodos` in the hook), which works on the full list.

**Why dragging is only on in "My order" with no search/filter:** if the list is sorted by due date, the sort would immediately put the task back. If the list is filtered, some tasks are hidden, so it's unclear where the dragged task should land among them. Rather than confusing behaviour, the handles disappear and a hint explains how to turn dragging on.

**Library choice:** the task suggests `react-beautiful-dnd`, but it is discontinued and doesn't support React 19. `@hello-pangea/dnd` is its maintained continuation with the same API. It also supports touch and keyboard dragging (Space, arrows, Space).

### 2.12 `src/components/Filters.js` — search, status, sort

```js
export default function Filters({ filters, onChange, showSort = true }) {
  const update = (changes) => onChange({ ...filters, ...changes });
```

A **controlled component**: it shows the `filters` it is given and reports changes; it stores nothing. `update({ search: "pay" })` builds a complete new filters object — the old values with only `search` replaced — and passes it up.

**Why doesn't it keep its own state?** `TodoApp` also needs the filters (to filter the list, reset the page, show the count, switch drag-and-drop). If both kept a copy, they could disagree. One owner = one truth.

- `value={filters.search}` + `onChange={(e) => update({ search: e.target.value })}` — the input always shows the current search; typing updates it. The list updates on every key press (live search).
- `showSort = true` is a **default parameter**. The calendar view passes `showSort={false}`, because sorting doesn't apply to a calendar.
- **Clear filters** resets search and status but keeps the chosen sort (`sort: filters.sort`), because sorting doesn't hide tasks.

### 2.13 `src/components/TodoPagination.js` — page controls

```js
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_PAGE_SIZE = 5;
```

Exactly the four sizes the requirement lists. Default 5 so pagination is visible early.

```js
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
```

- Returning `null` renders nothing — no page bar for an empty list.
- `from`/`to` give the "Showing 6–10 of 12" numbers. `Math.min` stops `to` going past the last task on the final page (page 3 of 12 tasks shows "11–12", not "11–15").

```js
  const itemRender = (_page, type, element) => {
    if (type === "prev") return <a className="pager-word">Previous</a>;
    if (type === "next") return <a className="pager-word">Next</a>;
    return element;
  };
```

Ant Design's `Pagination` shows ‹ › arrows by default. The requirement names "Previous" and "Next", so `itemRender` replaces the arrows with words; everything else (`element`) is drawn normally.

```js
        <Pagination current={page} pageSize={pageSize} total={total}
          onChange={(nextPage) => onChange(nextPage, pageSize)}
          showSizeChanger={false} itemRender={itemRender} showLessItems />
        <label className="pager-size">
          <Text type="secondary">Tasks per page</Text>
          <Select value={pageSize} options={pageSizeSelectOptions}
            onChange={(nextSize) => onChange(page, nextSize)} />
        </label>
```

- The page numbers come from Ant Design's `Pagination`.
- **Why a separate "Tasks per page" dropdown?** Ant Design's built-in one is hidden on small (phone) screens by its own styles. The requirement needs it everywhere, so we hide the built-in one (`showSizeChanger={false}`) and use our own `Select`.
- Both call the same `onChange(page, pageSize)` → `handlePageChange` in `TodoApp`.
- `<label>` around the text and dropdown links them, so clicking the words focuses the dropdown.

### 2.14 `src/components/Calendar.js` — calendar view

```js
  const screens = Grid.useBreakpoint();
  const isWide = screens.md !== false;
```

`useBreakpoint` reports the screen size. On phones (`md` is `false`) the calendar is compact with coloured dots; on wider screens it shows task names. `!== false` treats "not known yet" (first render) as wide.

```js
  const [selectedDate, setSelectedDate] = useState(() => dayjs());
```

The day whose tasks are listed under the calendar; starts as today. `useState(() => dayjs())` — passing a function means it is only run once, on first render.

```js
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
```

**Why group first?** The calendar draws ~42 day cells. Searching the whole task list for every cell would repeat the same work 42 times. Instead, one pass builds a lookup table:
- `byDay`: `"2026-11-25"` → `[task, task]`
- `byMonth`: `"2026-11"` → `7` (for the Year view). `dueDate.slice(0, 7)` takes the `YYYY-MM` part.

Each cell then just does `byDay.get(date)`. A `Map` is a key → value table, fast to look up. `useMemo` rebuilds it only when the tasks change.

```js
  const cellRender = (date, info) => {
    if (info.type === "date") return renderDayCell(date);
    if (info.type === "month") return renderMonthCell(date);
    return info.originNode;
  };
```

Ant Design's `Calendar` calls `cellRender` for every cell and shows whatever it returns inside. `info.type` says whether it is a day cell (Month view) or a month cell (Year view).

In `renderDayCell`:
- Phones: one dot per **category** present that day — `[...new Set(tasks.map((t) => t.category))]` removes duplicate categories (a `Set` only keeps unique values).
- Wide screens: up to `MAX_TASKS_IN_CELL` (3) task bars, then "+N more", so busy days don't stretch the calendar.
- Each bar uses the category hex colour for its left border and the same colour + `14` as the background. `14` is a hex **transparency** value (~8% opacity), giving a light tint of the category colour.
- Completed tasks get the `is-done` class: crossed out and faded.

Under the calendar, the tasks of the selected day are shown with the **same `TodoItem`** component as the list, so completing, editing and deleting work identically — no duplicated code.

The calendar receives `visibleTodos`, so search and the status filter apply to it too.

### 2.15 `src/components/ImportTodos.js` — the import pop-up

```js
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);     // { fileName, tasks, errors, totalRows }
  const [fileError, setFileError] = useState(null);
  const [mode, setMode] = useState("add");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
```

The pop-up works in steps: **choose a file → see the summary and preview → choose Add or Replace → Import**. Each piece of state supports a step. `reset()` clears them all when the pop-up closes, so it opens fresh next time.

```js
  const handleFile = async (file) => {
    setParsing(true);
    …
    try {
      const parsed = await parseImportFile(file);
      setResult({ fileName: file.name, ...parsed });
    } catch (error) {
      setFileError(error.message);
    } finally {
      setParsing(false);
    }
    return false;
  };
```

- `async`/`await`: reading a file takes time; `await` waits for it without freezing the page.
- `parseImportFile` (in `importExport.js`) **throws** an error with a friendly message when the whole file is unusable (wrong type, missing column…); that message is shown in a red box.
- `finally` runs whether it worked or not, so the spinner always stops.
- **`return false`** — `Upload.Dragger`'s `beforeUpload` normally uploads the file to a server. Returning `false` stops that: we only read the file in the browser.

```js
  const { toImport, duplicateCount } = useMemo(() => {
    if (!result) return { toImport: [], duplicateCount: 0 };
    if (mode === "replace" || !skipDuplicates) return { toImport: result.tasks, duplicateCount: 0 };
    const seen = new Set(existingTodos.map(duplicateKey));
    const unique = [];
    for (const task of result.tasks) {
      const key = duplicateKey(task);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(task);
      }
    }
    return { toImport: unique, duplicateCount: result.tasks.length - unique.length };
  }, [result, mode, skipDuplicates, existingTodos]);
```

Works out which tasks will **actually** be imported:
- In Replace mode, duplicates don't matter (the old tasks are removed).
- In Add mode, a **`Set`** of "description|due date" keys of existing tasks lets each imported task be checked instantly. Adding each new key to `seen` also skips a task that appears twice *in the same file*.
- It is calculated (`useMemo`) rather than stored, so it updates immediately when the user ticks/unticks "Skip duplicates" or switches mode — and the button label "Import 3 tasks" is always right.

Other details:
- The Import button is `disabled` when there is nothing to import, and turns red (`danger`) with "Replace with N tasks" in Replace mode, plus a warning — because Replace deletes data.
- Only the first 8 errors and 5 preview rows are shown so a big file doesn't flood the pop-up.

### 2.16 `src/components/ExportTodos.js` — the export button

```js
  const runExport = async (todos, label) => {
    setExporting(true);
    try {
      await exportTodosToExcel(todos, { label });
      message.success(`Exported ${todos.length} task…`);
    } catch {
      message.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };
```

`exporting` shows a spinner on the button while the file is built. `try/catch/finally` reports failure and always stops the spinner.

The `Dropdown` menu offers **All tasks** or **Only the current search/filter**. The second is disabled when nothing is filtered (it would be the same as All). The whole button is disabled when there are no tasks.

### 2.17 `src/utils/importExport.js` — reading and writing files

The biggest file, but each part is simple. It has three jobs: **read** a CSV/Excel file into tasks, **write** tasks into an Excel report, and **write** an import template.

#### Libraries loaded only when needed

```js
  const ExcelJS = (await import("exceljs")).default;
  const Papa = (await import("papaparse")).default;
```

`await import(...)` is a **dynamic import**: the library is downloaded only when someone actually imports or exports. ExcelJS is large; loading it with the page would make every visit slower for a feature used occasionally.

**Why ExcelJS + Papa Parse, not the well-known `xlsx` (SheetJS)?** The `xlsx` version on npm has known high-severity security problems when *reading* files, and import reads files supplied by users. The fixed versions are only published outside npm. ExcelJS (Excel) and Papa Parse (CSV) are maintained and on npm.

#### Flexible column names

```js
const COLUMN_ALIASES = {
  description: ["description", "task", "taskdescription", "title", "name", "todo", "item"],
  dueDate: ["duedate", "due", "date", "deadline"],
  …
};
const normaliseHeading = (text) => String(text ?? "").toLowerCase().replace(/[^a-z]/g, "");
```

People name columns differently. `normaliseHeading` lower-cases the heading and removes everything that isn't a letter, so "Due Date", "due_date" and "DUE-DATE" all become `"duedate"` and match.

#### Parsing values

`parseDueDate(value)` accepts the three ways a date can arrive:
1. **A real Excel date cell** → a JavaScript `Date`. ExcelJS creates it at midnight **UTC**, so it's read with `getUTCFullYear()` etc. Using the local-time versions could give the previous day in some time zones.
2. **A number** — Excel internally stores dates as "days since 30 Dec 1899". Converted with `Date.UTC(1899, 11, 30) + days × 86 400 000 ms` (months count from 0, so `11` is December).
3. **Text** — tried against a list of formats with `dayjs(text, format, true)`. The `true` means **strict**: `"31/02/2026"` is rejected instead of silently becoming 3 March. Day-first formats (`DD/MM/YYYY`) are used, as is common outside the US.

It always returns our standard `"YYYY-MM-DD"` text, or `null` if the date isn't recognised.

`parseStatus` and `parseCategory` work the same way: accept common spellings ("done", "yes", "1" → completed; "work"/"WORK" → "Work"), return `null` for anything unknown so the row can be reported. An empty category becomes the default ("Personal"); an empty status means incomplete.

`plainCellValue` — an Excel cell can hold rich (formatted) text, a formula or a hyperlink, which ExcelJS gives as objects. This reduces them to the plain value.

#### `parseImportFile(file)` — the main import function

1. **Check the file**: only `.csv`/`.xlsx`, at most 5 MB. Otherwise `throw new Error("friendly message")`.
2. **Read it** into `{ headings, rows }` with Papa Parse or ExcelJS. A damaged file → friendly error.
3. **Find the columns**: for each heading, which field is it? `columnFor.description = 0` means "description is in column 0". Missing Description or Due Date column → error explaining what's expected.
4. **Check every row**: collect *all* problems for the row (`problems.push(...)`), so the user sees everything wrong at once, not one error at a time. Valid rows go into `tasks`; invalid rows go into `errors` with their **spreadsheet row number** (`i + 2`: +1 for the heading row, +1 because spreadsheets count from 1, not 0). Completely blank rows are silently skipped.
5. **Return** `{ tasks, errors, totalRows }`.

The function **never saves anything** — it only reads and checks. Saving happens later, after the user has seen the preview and confirmed. Keeping "check" and "save" separate means nothing is changed until the user agrees.

#### `exportTodosToExcel(todos, { label })`

- Builds a workbook with a **Tasks** sheet (one row per task) and a **Summary** sheet (totals by status and category).
- Due dates are written as **real Excel dates** (`toExcelDate`), so they sort and filter as dates in Excel — and created with `Date.UTC` to avoid time-zone shifts.
- `styleHeaderRow` makes the heading bold on blue, and **freezes** it (`views: [{ state: "frozen", ySplit: 1 }]`) so it stays visible when scrolling. `autoFilter` adds Excel's filter arrows.
- The Tasks sheet uses the **same column names the importer accepts**, so an exported file can be imported again unchanged (a "round trip").

#### `downloadBlob(buffer, filename)` — making the browser download a file

```js
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
```

There is no server to download from, so the file is created in memory: a **Blob** (a chunk of file data) gets a temporary URL, an invisible link with a `download` attribute is "clicked", then removed. `revokeObjectURL` frees the memory afterwards. The long `type` is the official file type for `.xlsx`.

#### `downloadImportTemplate()`

Creates an example file with the right headings, 3 sample rows (dates relative to today, so they're never in the past), **dropdown lists** in Excel for Category and Status (`dataValidation`), and a "How to use" sheet. It helps users get the format right first time.

### 2.18 `src/app/globals.css` — styles

Ant Design styles its own components; `globals.css` handles **layout** and our own elements. Things worth knowing:

| Rule | Why |
|---|---|
| `* { box-sizing: border-box; }` | Width includes padding and border, so `width: 100%` never overflows. |
| `.page { max-width: 880px; margin: 0 auto; padding: 32px 16px 48px; }` | Centres the app, keeps lines readable on big screens, and keeps a 16 px gap at the sides on phones. |
| `.add-todo-form { display: grid; grid-template-columns: 1fr 170px 150px 130px; }` | Puts the 4 add-form fields in one row; `1fr` lets the description take the remaining space. |
| `@media (max-width: 720px) { … }` | Phone layout: fields stack, toolbars wrap, the pager stacks. |
| `.todo-item-main { flex: 1; min-width: 0; overflow-wrap: anywhere; }` | Lets the description take the free space, and breaks very long words instead of pushing the buttons off screen. (`min-width: 0` is needed for text to shrink inside flexbox.) |
| `.drag-handle { cursor: grab; touch-action: none; }` | Shows a "grab" hand; `touch-action: none` stops the phone from scrolling when you start dragging the handle. |
| `.drag-handle:focus-visible { outline: … }` | A visible outline when the handle is reached with the keyboard (Tab). |
| `.cal-task { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }` | Long task names in the calendar end with "…" instead of wrapping. |

---

## Part 3 — Following one action from click to screen

### Adding a task

1. You type "Buy milk", pick 20 Nov, keep "Personal", click **Add task**.
2. **AddTodo**: Ant Design checks the rules (description not empty, date not in the past). All pass → `handleFinish(values)`.
3. `handleFinish` converts the date to `"2026-11-20"` and calls `onAdd({...})`, then clears the form.
4. **TodoApp** `handleAdd` → calls `addTodo(values)` from the hook, sets page 1, shows "Task added".
5. **useTodos** `addTodo` builds the task (new id, trimmed text, `completed: false`) and calls `saveTodos(current => [todo, ...current])`.
6. `saveTodos` updates the cache, writes JSON to localStorage, and notifies listeners.
7. React re-renders **TodoApp** with the new `todos` → `visibleTodos` → `pageTodos` are recalculated → **TodoList** shows the new task at the top; the header count goes up.

### Searching

1. You type "pay" in the search box.
2. **Filters** `onChange` → `update({ search: "pay" })` → `onChange({...filters, search: "pay"})`.
3. **TodoApp** `updateFilters` → `setFilters(...)` and `setPage(1)`.
4. Re-render: `useMemo` sees `filters` changed → `applyFilters` runs → `visibleTodos` holds only matches → pages recalculated → list, "Showing X of Y", and pager all update together. Nothing is saved — searching only changes what you *see*.

### Dragging a task

1. In "My order" with no filter, `canReorder` is `true`, so **TodoList** renders the drag-and-drop version and each **TodoItem** shows a ⠿ handle.
2. You drag Task E from position 4 to position 0 on the page and drop it.
3. The library calls `handleDragEnd({ source: {index: 4}, destination: {index: 0} })`.
4. **TodoList** turns positions into ids: `onReorder(idOfE, idOfTaskAtPosition0)`.
5. **useTodos** `reorderTodos` finds both in the full list, moves E, and saves.
6. Re-render → the list appears in the new order; after a reload it's still the same, because the saved array is in that order.

---

## Part 4 — Questions you may be asked

**Why did you use localStorage and not a database?**
The requirement asks for local storage that survives reloads. localStorage is simple, built into every browser, needs no server, holds ~5 MB (thousands of tasks) and keeps data after the browser closes. I compared it with IndexedDB, sessionStorage, cookies, the Cache API and a server database (README section 6). The trade-off is that data stays in one browser on one device; Excel export serves as a backup.

**Why `useSyncExternalStore` instead of `useState` + `useEffect`?**
localStorage is data *outside* React, and this hook is React's official way to read such data. It handles the server render (no localStorage there) correctly and avoids the common bug where an empty list is saved over the real one on first load.

**Why `"use client"`?**
Next.js components run on the server by default, where there's no localStorage, `useState` or click handling. Files marked `"use client"` run in the browser. `page.js` and `layout.js` remain server components.

**How does pagination work together with search?**
First search/filter/sort the full list, *then* cut out the current page. So the page count and "Page X of Y" always match the tasks you're actually looking at. A new search goes back to page 1, and if the current page disappears (e.g. after deleting), the last existing page is shown.

**What happens if you delete the last task on the last page?**
`currentPage = Math.min(page, totalPages)` — the page number is capped at the number of pages that exist, so the previous page is shown instead of an empty one.

**Why store due dates as text?**
localStorage only stores text; `YYYY-MM-DD` text sorts in date order; and a date without a time avoids time-zone problems.

**How do you stop past due dates?**
`disabledDate={isBeforeToday}` greys out past days in the date picker, and a validator rule rejects a typed past date. In the edit pop-up the task's current date is still allowed, so overdue tasks can be renamed or completed.

**Why can't I drag when the list is sorted or filtered?**
Sorting would immediately undo the drag, and with a filter some tasks are hidden, so the drop position is ambiguous. The handles disappear and a hint explains how to enable dragging.

**Why is the import done in two steps (preview, then import)?**
`parseImportFile` only reads and checks; nothing is saved until the user sees the summary and clicks Import. This prevents a bad file from silently changing data, and shows exactly which rows were skipped and why.

**Why didn't you use the libraries named in the task (react-big-calendar, react-beautiful-dnd, SheetJS)?**
They were given as examples ("a library like…"). Ant Design's Calendar was already installed and matches the app's look. `react-beautiful-dnd` is discontinued and doesn't support React 19, so I used its official continuation `@hello-pangea/dnd` (same API). SheetJS's npm version has known security issues when reading files, so I used ExcelJS and Papa Parse.

**What is `key` in lists, and why `todo.id`?**
React needs a stable key to know which row is which when a list changes. The id never changes; an array index would change when tasks are reordered or deleted, causing wrong rows to update.

**Why `[todo, ...current]` instead of `current.push(todo)`?**
React detects changes by checking if it got a *new* array. `push` changes the existing array, which React may not notice. Creating a new array (immutability) always triggers the update.

---

## Part 5 — Exercises to check your understanding

Try these yourself; each one touches a different part of the app. If you can do them without help, you understand the code well.

1. **Add a fourth category "Shopping" in purple.** *(Hint: only one file needs changing — which one, and why only one?)*
2. **Make 10 tasks per page the default.** *(Hint: `TodoPagination.js`.)*
3. **Make the search also match the category name.** *(Hint: `matchesSearch` in `filterTodos.js`. Note the requirement only asks for the description.)*
4. **Add a sort option "Newest added first"** that sorts by `createdAt`. *(Hint: `SORT_OPTIONS` and `applyFilters`; `createdAt` is ISO text, which also sorts correctly as text.)*
5. **Show "Due tomorrow" next to tasks due tomorrow.** *(Hint: `TodoItem.js`; `dayjs().add(1, "day")`.)*
6. **Allow due dates up to 1 year ahead only.** *(Hint: `isBeforeToday` in `constants.js`, and a similar check.)*
7. **Explain out loud** what happens, file by file, when you tick a task's checkbox.

---

## Glossary

| Term | Meaning |
|---|---|
| **Component** | A function that returns what to show on screen. |
| **Props** | Inputs given to a component by its parent. |
| **State** | Data a component remembers; changing it redraws the screen. |
| **Hook** | A `use…` function that adds abilities to a component (`useState`, `useMemo`, our `useTodos`). |
| **Render** | React calling a component to work out what to show. |
| **Hydration** | The browser taking over the HTML the server sent and making it interactive. |
| **Server / Client Component** | Next.js components that run on the server / in the browser (`"use client"`). |
| **localStorage** | Browser storage for text, kept after the browser is closed. |
| **JSON** | A text format for data; `JSON.stringify` (data → text) and `JSON.parse` (text → data). |
| **Immutability** | Creating new arrays/objects instead of changing existing ones. |
| **Spread `...`** | Copies items/fields: `[a, ...list]`, `{ ...todo, completed: true }`. |
| **Destructuring** | Taking fields out: `const { todos, addTodo } = useTodos();`. |
| **Optional chaining `?.`** | Don't crash if the value is missing: `found?.color`. |
| **Nullish coalescing `??`** | Use a fallback if the value is `null`/`undefined`: `x ?? "default"`. |
| **Ternary `a ? b : c`** | "If a then b, else c" as an expression. |
| **Pure function** | Uses only its inputs, returns a result, changes nothing else. |
| **Controlled component** | Shows the value it's given and reports changes; stores nothing itself. |
| **Derived value** | Calculated from state each render instead of stored separately. |
| **Memoise (`useMemo`)** | Remember a calculated result until its inputs change. |
| **Promise / async / await** | Ways to handle work that finishes later (reading files). |
| **Blob** | File data held in memory, e.g. the Excel file before download. |
| **dayjs** | A small library for working with dates. |
| **Breakpoint** | A screen width where the layout changes (phone vs desktop). |
| **Render prop** | Passing a function as a child that returns what to render (used by the drag library). |
