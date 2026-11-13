"use client";

import { Pagination, Select, Typography } from "antd";

const { Text } = Typography;

export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_PAGE_SIZE = 5;

const pageSizeSelectOptions = PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: String(n) }));

// Pagination controls under the task list:
//   - "Previous" / "Next" buttons and page numbers
//   - a "Tasks per page" dropdown: 5, 10, 15 or 20
//   - "Page X of Y · Showing 1–5 of 12 tasks"
// The tasks-per-page dropdown is our own <Select> rather than Ant Design's built-in one,
// because Ant Design hides its built-in one on phone-sized screens.
export default function TodoPagination({ page, pageSize, total, onChange }) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  // Show the words "Previous" and "Next" instead of only arrow icons.
  const itemRender = (_page, type, element) => {
    if (type === "prev") return <a className="pager-word">Previous</a>;
    if (type === "next") return <a className="pager-word">Next</a>;
    return element;
  };

  return (
    <div className="pager">
      <Text type="secondary" className="pager-info">
        Page <strong>{page}</strong> of <strong>{totalPages}</strong> · Showing {from}–{to} of {total} task
        {total === 1 ? "" : "s"}
      </Text>

      <div className="pager-controls">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={(nextPage) => onChange(nextPage, pageSize)}
          showSizeChanger={false}
          itemRender={itemRender}
          showLessItems
        />

        <label className="pager-size">
          <Text type="secondary">Tasks per page</Text>
          <Select
            value={pageSize}
            options={pageSizeSelectOptions}
            onChange={(nextSize) => onChange(page, nextSize)}
            style={{ width: 72 }}
            aria-label="Tasks per page"
          />
        </label>
      </div>
    </div>
  );
}
