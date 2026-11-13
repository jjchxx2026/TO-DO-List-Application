# To-Do List Application

A to-do list web app built with **Next.js** and **Ant Design**. You can add, edit, complete and delete tasks with due dates and categories; search, filter, sort and page through them; import tasks in bulk from CSV or Excel; export them as an Excel report; see them on a calendar coloured by category; and rearrange them by drag and drop. Tasks are saved in the browser, so they are still there after you close and reopen the app.

---

## Contents

1. [Features and requirements](#1-features-and-requirements)
2. [Technology](#2-technology)
3. [Getting started](#3-getting-started)
4. [How to use the app](#4-how-to-use-the-app)
5. [Project structure](#5-project-structure)
6. [Storage research: choosing how to save tasks](#6-storage-research-choosing-how-to-save-tasks)
7. [Import file format](#7-import-file-format)
8. [Design decisions](#8-design-decisions)
9. [Testing](#9-testing)
10. [Limitations and future improvements](#10-limitations-and-future-improvements)

---

## 1. Features and requirements

| # | Requirement | How it is met | Status |
|---|---|---|---|
| 1 | List, add, edit and delete tasks | Task list; add form; edit pop-up; delete with “Are you sure?” | ✅ |
| 1 | Mark complete / incomplete | Checkbox on each task (also a switch in the edit pop-up) | ✅ |
| 1 | Due date for each task | Date picker (days before today are disabled); overdue tasks shown in red, today’s tasks marked “Today” | ✅ |
| 1 | Categories (Work, Personal, Urgent) via dropdown or radio buttons | Dropdown when adding, radio buttons when editing; coloured tags (blue / green / red) | ✅ |
| 2 | Pagination | Tasks split into pages | ✅ |
| 2 | Choose tasks per page (5, 10, 15, 20) | “Tasks per page” dropdown | ✅ |
| 2 | Previous / Next and page numbers | Pagination bar under the list | ✅ |
| 2 | Show current page and total pages | “Page 2 of 3 · Showing 6–10 of 12 tasks” | ✅ |
| 3 | Search by keywords in the description | Live search box; all words must match, any order, not case-sensitive | ✅ |
| 3 | Filter by completion status | All / Incomplete / Completed | ✅ |
| 3 | Sort by due date, ascending or descending | Sort dropdown | ✅ |
| 4 | Persist tasks across reloads (local storage) | Browser `localStorage` — see [section 6](#6-storage-research-choosing-how-to-save-tasks) | ✅ |
| 5 | Bulk import from CSV or Excel | Import pop-up with row checking, preview, add/replace, duplicate skipping and a template | ✅ |
| 6 | Export to Excel | `.xlsx` report with a Tasks sheet and a Summary sheet | ✅ |
| 7 | Calendar view *(optional)* | **List / Calendar** switch. Each day shows its tasks as bars coloured by category (blue Work, green Personal, red Urgent) with a colour legend; click a day to list, complete, edit or delete its tasks; Year view shows tasks per month; compact calendar with coloured dots on phones | ✅ |
| 8 | Drag-and-drop reordering *(optional)* | Drag a task by its ⠿ handle (mouse, touch, or keyboard: Space, arrow keys, Space) using `@hello-pangea/dnd`. The new order is saved. Available in “My order” with no search or filter | ✅ |

---

## 2. Technology

| Purpose | Library | Version |
|---|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router) | 16 |
| UI library | [React](https://react.dev) | 19 |
| UI components | [Ant Design](https://ant.design) + `@ant-design/icons` + `@ant-design/nextjs-registry` | 6 |
| Dates | [Day.js](https://day.js.org) | 1.11 |
| Excel read/write | [ExcelJS](https://github.com/exceljs/exceljs) | 4.4 |
| CSV read | [Papa Parse](https://www.papaparse.com) | 5.7 |
| Drag and drop | [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) | 18 |
| Code checking | ESLint (`eslint-config-next`) | 9 |

Language: JavaScript. No database or back-end server is needed.

---

## 3. Getting started

### Requirements

- [Node.js](https://nodejs.org) 20.9 or newer (developed with Node.js 24 and npm 11). Check with `node --version` and `npm --version`.
- A code editor, e.g. [Visual Studio Code](https://code.visualstudio.com).

### Install and run

```bash
cd "C:\Dev\TO-DO List Application"
npm install
npm run dev
```

Then open <http://localhost:3000> in your browser. Stop the server with **Ctrl + C**.

### Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build (also checks the app compiles) |
| `npm start` | Runs the production build (after `npm run build`) |
| `npm run lint` | Checks the code with ESLint |

---

## 4. How to use the app

- **Add a task** — type a description, pick a due date (today or later) and a category, then click **Add task**.
- **Complete a task** — tick its checkbox. The task is crossed out; untick to make it incomplete again.
- **Edit a task** — click the pencil icon, change any field, then **Save**.
- **Delete a task** — click the bin icon and confirm.
- **Search** — type in the search box; the list updates as you type.
- **Filter** — choose **All**, **Incomplete** or **Completed**. **Clear filters** resets the search and filter.
- **Sort** — choose *My order*, *Due date: earliest first* or *Due date: latest first*.
- **Rearrange** — in *My order* (with no search or filter), drag a task by its **⠿** handle to a new place. With the keyboard: Tab to the handle, press **Space** to pick it up, the **arrow keys** to move it, and **Space** to drop it (Esc cancels). On a touch screen, press and hold the handle, then drag. To move a task to another page, choose a larger *Tasks per page* first. New tasks are added at the top.
- **Pages** — use **Previous**, **Next** or a page number; change **Tasks per page** to 5, 10, 15 or 20.
- **Import** — click **Import**, choose a `.csv` or `.xlsx` file, check the summary and preview, choose **Add** or **Replace**, then confirm. **Download template** gives you a ready-made file.
- **Export** — click **Export to Excel** and choose **All tasks** or **Only the current search/filter**.
- **Calendar** — switch **List / Calendar** at the top of “Your tasks”. Tasks appear on their due date in their category colour (completed tasks are crossed out). Click a day to see its tasks underneath, where you can complete, edit or delete them. Use the **Month / Year** switch and the month/year dropdowns to move around. Search and the status filter also apply to the calendar.

---

## 5. Project structure

```
TO-DO List Application/
├── src/
│   ├── app/
│   │   ├── layout.js          Page shell; loads Ant Design styles (AntdRegistry)
│   │   ├── page.js            Home page; renders <TodoApp />
│   │   └── globals.css        Layout styles (desktop and phone)
│   ├── components/
│   │   ├── TodoApp.js         Main screen: connects everything, holds filter/page state
│   │   ├── AddTodo.js         Add-task form
│   │   ├── EditTodo.js        Edit-task pop-up
│   │   ├── TodoList.js        The list, drag-and-drop, empty / loading states
│   │   ├── TodoItem.js        One task row (with drag handle)
│   │   ├── Filters.js         Search box, status filter, sort
│   │   ├── TodoPagination.js  Previous/Next, page numbers, tasks per page, “Page X of Y”
│   │   ├── ImportTodos.js     Import pop-up
│   │   ├── ExportTodos.js     Export button
│   │   └── Calendar.js        Calendar view (tasks by due date, coloured by category)
│   ├── hooks/
│   │   └── useTodos.js        Saves/loads tasks in localStorage; add, edit, delete, toggle, import, reorder
│   └── utils/
│       ├── constants.js       Categories, colours, date format
│       ├── filterTodos.js     Search, filter and sort logic
│       └── importExport.js    Reading CSV/Excel files, writing the Excel report and template
├── public/                    Static files
├── next.config.mjs            Next.js settings
└── package.json               Dependencies and scripts
```

**How data flows:** `useTodos` holds the full list → `TodoApp` applies search/filter/sort (`filterTodos.js`) → cuts out the current page → passes it to `TodoList`. Every change goes back through `useTodos`, which saves it to `localStorage`.

### Compared with the suggested structure in the task description

The suggested structure (`App.js`, `index.js`, `public/index.html`) is the layout of an older Create React App project. Current Next.js uses the **App Router**, where the same jobs are done by:

| Suggested file | In this project |
|---|---|
| `index.js` / `public/index.html` | `src/app/layout.js` (Next.js generates the HTML) |
| `App.js` | `src/app/page.js` + `src/components/TodoApp.js` |
| `TodoList.js`, `TodoItem.js`, `AddTodo.js`, `EditTodo.js`, `Filters.js` | Same names in `src/components/` |
| `hooks/useTodos.js` | Same: `src/hooks/useTodos.js` |
| `Calendar.js` | Same: `src/components/Calendar.js` |

---

## 6. Storage research: choosing how to save tasks

The requirement asks for a **local** storage method that keeps tasks across page reloads and when the app is reopened. These are the options a browser offers:

| Method | Size limit (typical) | Kept after closing the browser? | How you use it | Suits this app? |
|---|---|---|---|---|
| **localStorage** | ~5 MB per site | ✅ Yes, until cleared | Simple: save/load text, synchronous | ✅ **Chosen** |
| **IndexedDB** | Hundreds of MB or more | ✅ Yes | A real database in the browser; asynchronous, more code (often used through a helper such as Dexie.js) | ✅ Works, but more than this app needs |
| **sessionStorage** | ~5 MB | ❌ No — cleared when the tab closes | Same as localStorage | ❌ Fails “tasks still there when reopened” |
| **Cookies** | ~4 KB | ✅ Yes (with an expiry date) | Sent to the server with every request | ❌ Too small; wasteful |
| **Cache API** | Large | ✅ Yes | Designed for caching network responses (offline sites) | ❌ Wrong tool for app data |
| **Server database** (e.g. PostgreSQL, MongoDB, Firebase) | Large | ✅ Yes, on any device | Needs a back-end, hosting and usually accounts | ❌ Not “local”; out of scope |

### Why localStorage

- **Meets the requirement**: data stays after reloads and after the browser is closed.
- **Enough space**: one task is about 200 bytes, so ~5 MB holds well over 10,000 tasks.
- **Simple**: the whole list is saved as JSON text under one key (`todos`), which keeps the code short and easy to explain.
- **No server or cost**, and it works offline.

IndexedDB would be the next step if the app needed to store very large amounts of data or files.

### How it is implemented

All storage code is in [`src/hooks/useTodos.js`](src/hooks/useTodos.js).

- The order of the saved list is the order of “My order”, so drag-and-drop simply saves the list in its new order.
- Every change (add, edit, delete, complete, import, reorder) saves the whole list with `localStorage.setItem("todos", JSON.stringify(list))`.
- On start-up the list is read back with `JSON.parse(localStorage.getItem("todos"))`.
- It uses React’s **`useSyncExternalStore`**, which is React’s built-in way to read data kept outside React. Next.js first renders the page on the server, where `localStorage` does not exist; this hook shows an empty/loading state there and the saved tasks in the browser, without the common bug where an empty list overwrites the saved tasks on reload.
- If the stored data is damaged or storage is blocked, the app starts with an empty list instead of crashing.
- If the app is open in two tabs, a change in one tab appears in the other (`storage` event).

Example of what is stored:

```json
[
  {
    "id": "3e95c1d2-…",
    "description": "Write test plan",
    "dueDate": "2026-11-25",
    "category": "Work",
    "completed": false,
    "createdAt": "2026-11-12T06:57:43.768Z"
  }
]
```

Due dates are stored as `YYYY-MM-DD` text, which sorts correctly as text and avoids time-zone problems.

To see the stored data: open the app, press **F12** → **Application** → **Local Storage** → `http://localhost:3000` → key `todos`.

### Trade-offs to be aware of

- Data belongs to **one browser on one device**; it does not sync between devices or browsers.
- **Clearing browser data deletes the tasks.** Use **Export to Excel** as a backup; the exported file can be imported again.

---

## 7. Import file format

The first row must contain column headings. Headings are not case-sensitive, and common alternatives are accepted.

| Column | Required | Accepted headings | Accepted values |
|---|---|---|---|
| Description | ✅ | Description, Task, Title, Name, Todo, Item | Text, up to 200 characters |
| Due Date | ✅ | Due Date, Due, Date, Deadline | `2026-12-31`, `31/12/2026` (day first), `31-12-2026`, `31.12.2026`, `31 Dec 2026`, `Dec 31, 2026`, or an Excel date |
| Category | – | Category, Type, Tag, Label | Work, Personal, Urgent (any capitals). Empty → Personal |
| Status | – | Status, Completed, Done, State | Completed / Done / Yes / True / 1, or Incomplete / Pending / No / False / 0. Empty → Incomplete |

Example CSV:

```csv
Description,Due Date,Category,Status
Prepare weekly report,2026-11-20,Work,Incomplete
Book dentist appointment,2026-11-25,Personal,Incomplete
Renew car insurance,2026-11-15,Urgent,Completed
```

Rules:

- Accepts `.csv` and `.xlsx` files up to 5 MB and 5,000 rows. Only the first sheet of an Excel file is read.
- Rows with problems are skipped and listed with their row number and reason (e.g. *Row 6: “31/02/2026” is not a valid date*). Completely empty rows are ignored.
- **Add** mode can skip tasks that already exist (same description and due date). **Replace** mode deletes the current tasks first, after a warning.
- A file exported from the app can be imported again unchanged.

---

## 8. Design decisions

| Decision | Reason |
|---|---|
| **Ant Design** as the UI library | Ready-made date picker, dropdowns, pop-ups, upload area and pagination cover most requirements with little custom code. |
| **One page, client-side app** | All data is in the browser, so the interactive parts are Client Components (`"use client"`); `page.js` and `layout.js` stay Server Components. |
| **Cache Components turned off** in `next.config.mjs` | This optional Next.js 16 server-caching mode is not useful for an app with no server data, and Ant Design’s style registry is not compatible with its pre-rendering (the build failed with it on). |
| **Search, filter and sort logic in `utils/filterTodos.js`** | Kept separate from the screen as plain functions, so it is easy to read, reuse and test. |
| **Filter first, then paginate** | Page numbers and “Page X of Y” always match the tasks you are actually looking at. A new search, filter or sort returns to page 1; deleting the last task on the last page moves back one page. |
| **Own “Tasks per page” dropdown** | Ant Design’s built-in one is hidden on phone-sized screens, but the requirement needs it everywhere. |
| **ExcelJS + Papa Parse instead of SheetJS (`xlsx`)** | The `xlsx` package on npm (0.18.5) has known high-severity security issues when reading files, and its fixed versions are only published outside npm. ExcelJS (Excel) and Papa Parse (CSV) are maintained and on npm. Both are loaded only when importing or exporting, so the page loads faster. |
| **Due dates required** | Every task has a due date, so sorting, the overdue indicator and the calendar always work. |
| **No due dates in the past** | When adding a task, days before today are greyed out in the date picker, and a past date typed into the box is rejected. When editing, the same applies — except the task’s *current* date stays allowed, so an already-overdue task can still be renamed or completed without being forced to change its date. Imported files may contain past dates, so that exported lists (which can include overdue tasks) can be imported again unchanged. |
| **Ant Design’s `Calendar` for the calendar view** | The task description allows a library or a custom component. Ant Design’s calendar is already installed, matches the rest of the app’s look, and its `cellRender` option lets each day show its tasks — so no extra library (such as `react-big-calendar`) is needed. Category colours come from one list in `constants.js`, so the list tags, calendar bars and legend always match. |
| **`@hello-pangea/dnd` for drag-and-drop** | The task description suggests `react-beautiful-dnd`, which is deprecated and does not support React 19. `@hello-pangea/dnd` is its maintained continuation with the same API, and officially supports React 19. It also supports keyboard and touch dragging and screen-reader announcements. |
| **Drag only in “My order”, without search/filter** | Dragging a list sorted by due date would be undone straight away by the sort, and dragging a filtered list hides where the task lands among the hidden tasks. When dragging is unavailable the handles disappear and a short hint explains how to turn it on. |
| **Drag handle instead of dragging the whole row** | The checkbox, edit and delete buttons keep working normally, and the handle shows clearly that a task can be moved. |
| **Reorder by task id, not position** | The list shows one page at a time, so positions on screen differ from positions in the saved list. Moving “this task to where that task is” works correctly on every page. |

---

## 9. Testing

Checks run during development (Chrome-based browser, desktop and 375 px phone width):

| Area | Test | Result |
|---|---|---|
| Basic | Add, edit, complete, delete; overdue/today labels | ✅ |
| Due date | Days before today disabled in the picker; today allowed; typed past date rejected | ✅ |
| Due date | Overdue task: its own date still allowed in Edit, other past days disabled; saves fine | ✅ |
| Storage | Tasks still present after reloading the page | ✅ |
| Search | “pay bill” finds “Pay electricity bill” and “Pay water bill” | ✅ |
| Filter + search | Completed + “pay bill” shows only the completed match | ✅ |
| Sort | Earliest-first and latest-first order by due date | ✅ |
| Empty states | “No tasks yet” vs “No tasks match…” with **Clear filters** | ✅ |
| Pagination | Next/Previous, page numbers, “Page X of Y”, 5/10/15/20 per page | ✅ |
| Pagination edge cases | New search → page 1; deleting the last task on the last page → previous page | ✅ |
| Import (CSV) | 8 mixed rows: 4 valid, 4 rejected with reasons, blank row ignored, duplicate skipped | ✅ |
| Import errors | Wrong file type, missing column, damaged `.xlsx` → clear message | ✅ |
| Export | Valid `.xlsx` with Tasks and Summary sheets | ✅ |
| Round trip | Export → import the same file → identical tasks and dates | ✅ |
| Calendar | Tasks on the right days in category colours; “+1 more” when a day has over 3 | ✅ |
| Calendar | Clicking a day lists its tasks; completing one there updates the calendar and storage | ✅ |
| Calendar | Status filter applies to the calendar; Year view shows tasks per month | ✅ |
| Calendar | Compact calendar with coloured dots at phone width | ✅ |
| Drag and drop | Keyboard: Task A moved down two places; new order saved | ✅ |
| Drag and drop | Mouse drag moves a task and saves the order | ✅ |
| Drag and drop | Reordering on page 2 moves the right tasks in the full list | ✅ |
| Drag and drop | Order kept after reloading the page | ✅ |
| Drag and drop | Handles hidden (with a hint) when sorted by due date or filtered | ✅ |
| Layout | No sideways scrolling at phone width; no console errors | ✅ |
| Code | `npm run lint` and `npm run build` pass | ✅ |

---

## 10. Limitations and future improvements

**Current limitations**

- Tasks are stored per browser and device (see [section 6](#6-storage-research-choosing-how-to-save-tasks)).
- Import supports `.xlsx` and `.csv`, not the older `.xls` format (re-save as `.xlsx` in Excel).
- The chosen tasks-per-page and filters reset when the page is reloaded.

**Possible improvements**

- Add a task directly by clicking an empty day in the calendar.
- Drag tasks between pages, or drag them onto a calendar day to change the due date.
- Store data in IndexedDB for very large task lists.
- User accounts and a server database to sync tasks across devices.
- Automated tests (e.g. Jest for `filterTodos.js` and `importExport.js`, Playwright for the screens).
- Dark mode, priorities and reminders.
