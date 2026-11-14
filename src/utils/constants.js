// Shared settings used across the app.
import dayjs from "dayjs";

// Task categories. One colour scheme used everywhere (list tags, calendar, legend):
//   `color` - Ant Design Tag preset colour
//   `hex`   - the same colour as a hex code, for calendar dots and bars
export const CATEGORIES = [
  { value: "Work", label: "Work", color: "blue", hex: "#1677ff" },
  { value: "Personal", label: "Personal", color: "green", hex: "#52c41a" },
  { value: "Urgent", label: "Urgent", color: "red", hex: "#f5222d" },
];

export const DEFAULT_CATEGORY = "Personal";

export function getCategoryColor(category) {
  return CATEGORIES.find((c) => c.value === category)?.color ?? "default";
}

export function getCategoryHex(category) {
  return CATEGORIES.find((c) => c.value === category)?.hex ?? "#8c8c8c";
}

// Due dates are stored as plain "YYYY-MM-DD" text so they save cleanly in localStorage
// and Excel, and sort correctly as text.
export const DATE_FORMAT = "YYYY-MM-DD";

// When a task was created. `createdAt` is stored as an ISO timestamp
// (e.g. "2026-11-14T02:30:00.000Z", always UTC); dayjs shows it in the user's own time zone.
export const CREATED_FORMAT = "D MMM YYYY, h:mm A"; // e.g. "14 Nov 2026, 10:30 AM"

export function formatCreatedAt(createdAt) {
  if (!createdAt) return "—";
  const date = dayjs(createdAt);
  return date.isValid() ? date.format(CREATED_FORMAT) : "—";
}

// Due dates can't be in the past. `date` is a dayjs object (what Ant Design's DatePicker uses).
// Today itself is allowed.
export function isBeforeToday(date) {
  return Boolean(date) && date.isBefore(dayjs().startOf("day"), "day");
}

// Form rule for the DatePicker. The calendar already greys out past days; this also
// catches a past date typed straight into the box.
export const notInPastRule = {
  validator: (_, value) =>
    isBeforeToday(value) ? Promise.reject(new Error("Due date can’t be before today")) : Promise.resolve(),
};
