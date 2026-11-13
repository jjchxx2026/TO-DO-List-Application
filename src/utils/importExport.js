// Import tasks from CSV / Excel, and export tasks to an Excel report.
//
// Libraries (both loaded only when needed, so the page itself stays small):
//   - ExcelJS   reads and writes .xlsx files
//   - Papa Parse reads .csv files
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CATEGORIES, DATE_FORMAT, DEFAULT_CATEGORY } from "./constants";

dayjs.extend(customParseFormat);

export const MAX_FILE_SIZE_MB = 5;
export const MAX_IMPORT_ROWS = 5000;
export const ACCEPTED_FILE_TYPES = ".csv,.xlsx";

// ---------------------------------------------------------------------------
// Column headings: people name columns differently, so accept common variations.
// Headings are compared ignoring case, spaces and punctuation ("Due Date" = "due_date").
// ---------------------------------------------------------------------------
const COLUMN_ALIASES = {
  description: ["description", "task", "taskdescription", "title", "name", "todo", "item"],
  dueDate: ["duedate", "due", "date", "deadline"],
  category: ["category", "type", "tag", "label"],
  status: ["status", "completed", "complete", "done", "state"],
};

const normaliseHeading = (text) => String(text ?? "").toLowerCase().replace(/[^a-z]/g, "");

function findColumn(heading) {
  const key = normaliseHeading(heading);
  return Object.keys(COLUMN_ALIASES).find((field) => COLUMN_ALIASES[field].includes(key)) ?? null;
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------

// Dates written as text. Day-first formats are used for "dd/mm/yyyy" style dates.
const DATE_TEXT_FORMATS = [
  "YYYY-MM-DD",
  "YYYY/MM/DD",
  "YYYY-M-D",
  "YYYY/M/D",
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD-MM-YYYY",
  "D-M-YYYY",
  "DD.MM.YYYY",
  "D MMM YYYY",
  "D MMMM YYYY",
  "MMM D, YYYY",
  "MMMM D, YYYY",
];

// Returns "YYYY-MM-DD", or null if the value isn't a recognisable date.
export function parseDueDate(value) {
  if (value === null || value === undefined || value === "") return null;

  // Real Excel date cell. ExcelJS gives dates at midnight UTC, so read the UTC parts.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Excel date stored as a plain number (days since 30 Dec 1899).
  if (typeof value === "number") {
    if (value < 1 || value > 2958465) return null;
    return parseDueDate(new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000));
  }

  const text = String(value).trim();
  for (const format of DATE_TEXT_FORMATS) {
    const parsed = dayjs(text, format, true); // strict: "31/02/2026" is rejected
    if (parsed.isValid()) return parsed.format(DATE_FORMAT);
  }
  return null;
}

const COMPLETED_WORDS = ["completed", "complete", "done", "yes", "y", "true", "1", "x", "finished"];
const INCOMPLETE_WORDS = ["", "incomplete", "not completed", "notcompleted", "pending", "open", "active", "todo", "to do", "no", "n", "false", "0", "in progress"];

// Returns true / false, or null if the value isn't understood.
function parseStatus(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (COMPLETED_WORDS.includes(text)) return true;
  if (INCOMPLETE_WORDS.includes(text)) return false;
  return null;
}

// Returns the matching category name (with correct capitals), or null.
function parseCategory(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "") return DEFAULT_CATEGORY;
  return CATEGORIES.find((c) => c.value.toLowerCase() === text)?.value ?? null;
}

// ExcelJS cells can hold rich text, formulas or hyperlinks; reduce them to a plain value.
function plainCellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date || typeof value !== "object") return value;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
  if ("result" in value) return plainCellValue(value.result); // formula
  if ("text" in value) return plainCellValue(value.text); // hyperlink
  return "";
}

// ---------------------------------------------------------------------------
// Reading files into { headings, rows }
// ---------------------------------------------------------------------------

async function readCsv(file) {
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const result = Papa.parse(text, { skipEmptyLines: "greedy" });
  const [headings = [], ...rows] = result.data;
  return { headings, rows };
}

async function readXlsx(file) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headings: [], rows: [] };

  const allRows = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values is 1-based (index 0 is empty), so drop the first item.
    allRows.push(row.values.slice(1).map(plainCellValue));
  });
  const [headings = [], ...rows] = allRows;
  return { headings, rows };
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

// Reads a CSV or Excel file and checks every row.
// Returns { tasks, errors, totalRows }:
//   tasks  - valid rows as { description, dueDate, category, completed }
//   errors - [{ row, message }] for rows that were skipped (row = spreadsheet row number)
// Throws an Error with a friendly message if the whole file can't be used.
export async function parseImportFile(file) {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isXlsx = name.endsWith(".xlsx");

  if (!isCsv && !isXlsx) {
    throw new Error("Please choose a .csv or .xlsx file. Older .xls files: open in Excel and “Save As” .xlsx first.");
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`That file is larger than ${MAX_FILE_SIZE_MB} MB.`);
  }

  let sheet;
  try {
    sheet = isCsv ? await readCsv(file) : await readXlsx(file);
  } catch {
    throw new Error("Couldn't read that file. Check it isn't damaged or password-protected.");
  }

  // Work out which column holds which field.
  const columnFor = {};
  sheet.headings.forEach((heading, index) => {
    const field = findColumn(heading);
    if (field && columnFor[field] === undefined) columnFor[field] = index;
  });

  if (columnFor.description === undefined) {
    throw new Error("Couldn't find a “Description” column in the first row. Download the template to see the expected layout.");
  }
  if (columnFor.dueDate === undefined) {
    throw new Error("Couldn't find a “Due Date” column in the first row. Download the template to see the expected layout.");
  }
  if (sheet.rows.length === 0) {
    throw new Error("The file has headings but no tasks.");
  }
  if (sheet.rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`The file has ${sheet.rows.length} rows; the limit is ${MAX_IMPORT_ROWS}.`);
  }

  const tasks = [];
  const errors = [];

  sheet.rows.forEach((cells, i) => {
    const rowNumber = i + 2; // +1 for the heading row, +1 because spreadsheets count from 1
    const get = (field) => (columnFor[field] === undefined ? "" : cells[columnFor[field]]);

    const description = String(get("description") ?? "").trim();
    const rawDate = get("dueDate");
    const rawCategory = get("category");
    const rawStatus = get("status");

    // Skip rows that are completely blank.
    if (!description && (rawDate === "" || rawDate == null) && !String(rawCategory ?? "").trim()) return;

    const problems = [];
    if (!description) problems.push("description is empty");
    if (description.length > 200) problems.push("description is over 200 characters");

    const dueDate = parseDueDate(rawDate);
    if (!dueDate) {
      problems.push(rawDate === "" || rawDate == null ? "due date is empty" : `“${rawDate}” is not a valid date (use YYYY-MM-DD)`);
    }

    const category = parseCategory(rawCategory);
    if (!category) {
      problems.push(`category “${rawCategory}” must be ${CATEGORIES.map((c) => c.value).join(", ")}`);
    }

    const completed = parseStatus(rawStatus);
    if (completed === null) {
      problems.push(`status “${rawStatus}” must be Completed or Incomplete`);
    }

    if (problems.length > 0) {
      errors.push({ row: rowNumber, message: problems.join("; ") });
    } else {
      tasks.push({ description, dueDate, category, completed });
    }
  });

  return { tasks, errors, totalRows: tasks.length + errors.length };
}

// Key used to spot a task that already exists (same description and due date).
export const duplicateKey = (task) => `${task.description.trim().toLowerCase()}|${task.dueDate}`;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1677FF" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" } };

// "YYYY-MM-DD" -> real Excel date (so it sorts and filters as a date in Excel).
function toExcelDate(text) {
  if (!text) return null;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function styleHeaderRow(sheet) {
  const header = sheet.getRow(1);
  header.font = HEADER_FONT;
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle" };
  header.height = 20;
  sheet.views = [{ state: "frozen", ySplit: 1 }]; // keep headings visible when scrolling
}

function downloadBlob(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Builds and downloads "todo-list-YYYY-MM-DD.xlsx" with two sheets:
//   Tasks   - one row per task (the same columns the importer reads, so files round-trip)
//   Summary - totals by status and category
export async function exportTodosToExcel(todos, { label = "All tasks" } = {}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "To-Do List Application";
  workbook.created = new Date();

  const today = dayjs().format(DATE_FORMAT);

  // --- Tasks sheet ---
  const sheet = workbook.addWorksheet("Tasks");
  sheet.columns = [
    { header: "No.", key: "no", width: 6 },
    { header: "Description", key: "description", width: 48 },
    { header: "Category", key: "category", width: 12 },
    { header: "Due Date", key: "dueDate", width: 13, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Status", key: "status", width: 13 },
    { header: "Overdue", key: "overdue", width: 10 },
    { header: "Created", key: "createdAt", width: 18, style: { numFmt: "yyyy-mm-dd hh:mm" } },
  ];

  todos.forEach((todo, index) => {
    const overdue = !todo.completed && todo.dueDate && todo.dueDate < today;
    const row = sheet.addRow({
      no: index + 1,
      description: todo.description,
      category: todo.category,
      dueDate: toExcelDate(todo.dueDate),
      status: todo.completed ? "Completed" : "Incomplete",
      overdue: overdue ? "Yes" : "",
      createdAt: todo.createdAt ? new Date(todo.createdAt) : null,
    });
    if (overdue) row.getCell("overdue").font = { color: { argb: "FFCF1322" }, bold: true };
    if (todo.completed) row.getCell("status").font = { color: { argb: "FF389E0D" } };
  });

  styleHeaderRow(sheet);
  if (todos.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: todos.length + 1, column: sheet.columns.length } };
  }

  // --- Summary sheet ---
  const completed = todos.filter((t) => t.completed).length;
  const overdue = todos.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "To-Do List Report", key: "label", width: 26 },
    { header: "", key: "value", width: 22 },
  ];
  summary.addRows([
    { label: "Generated", value: dayjs().format("YYYY-MM-DD HH:mm") },
    { label: "Tasks included", value: label },
    {},
    { label: "Total tasks", value: todos.length },
    { label: "Completed", value: completed },
    { label: "Incomplete", value: todos.length - completed },
    { label: "Overdue", value: overdue },
    {},
    { label: "By category", value: "" },
    ...CATEGORIES.map((c) => ({
      label: `  ${c.value}`,
      value: todos.filter((t) => t.category === c.value).length,
    })),
  ]);
  styleHeaderRow(summary);
  summary.getCell("A10").font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, `todo-list-${today}.xlsx`);
}

// Downloads an example file showing the columns the importer expects.
export async function downloadImportTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tasks");
  sheet.columns = [
    { header: "Description", key: "description", width: 40 },
    { header: "Due Date", key: "dueDate", width: 13, style: { numFmt: "yyyy-mm-dd" } },
    { header: "Category", key: "category", width: 12 },
    { header: "Status", key: "status", width: 13 },
  ];
  const day = (n) => toExcelDate(dayjs().add(n, "day").format(DATE_FORMAT));
  sheet.addRows([
    { description: "Prepare weekly report", dueDate: day(3), category: "Work", status: "Incomplete" },
    { description: "Book dentist appointment", dueDate: day(7), category: "Personal", status: "Incomplete" },
    { description: "Renew car insurance", dueDate: day(1), category: "Urgent", status: "Completed" },
  ]);

  // Dropdowns in Excel so people can only pick valid values.
  for (let r = 2; r <= 500; r++) {
    sheet.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${CATEGORIES.map((c) => c.value).join(",")}"`],
    };
    sheet.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Incomplete,Completed"'],
    };
  }
  styleHeaderRow(sheet);

  const help = workbook.addWorksheet("How to use");
  help.columns = [{ header: "How to fill in this template", key: "text", width: 90 }];
  help.addRows([
    { text: "Fill in one task per row on the “Tasks” sheet, then import the file in the app." },
    { text: "Description – required, up to 200 characters." },
    { text: "Due Date – required. Use YYYY-MM-DD (e.g. 2026-12-31) or a normal Excel date." },
    { text: `Category – ${CATEGORIES.map((c) => c.value).join(", ")}. Leave empty for ${DEFAULT_CATEGORY}.` },
    { text: "Status – Completed or Incomplete. Leave empty for Incomplete." },
    { text: "A CSV file with the same column headings also works." },
  ]);
  styleHeaderRow(help);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, "todo-import-template.xlsx");
}
