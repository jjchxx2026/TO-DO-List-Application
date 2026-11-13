"use client";

import { Button, Input, Segmented, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { STATUS_OPTIONS, SORT_OPTIONS, DEFAULT_FILTERS, hasActiveFilters } from "@/utils/filterTodos";

// Toolbar above the task list: search box, status filter and due-date sort.
// It doesn't store anything itself: the parent passes `filters` in and gets changes back
// through `onChange`. This is called a "controlled component".
export default function Filters({ filters, onChange, showSort = true }) {
  const update = (changes) => onChange({ ...filters, ...changes });

  return (
    <div className="filters">
      <Input
        className="filters-search"
        placeholder="Search task descriptions…"
        prefix={<SearchOutlined />}
        allowClear
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        aria-label="Search tasks"
      />

      <Segmented
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(status) => update({ status })}
        aria-label="Filter by status"
      />

      {showSort && (
        <Select
          className="filters-sort"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(sort) => update({ sort })}
          aria-label="Sort tasks"
          popupMatchSelectWidth={false}
        />
      )}

      {hasActiveFilters(filters) && (
        <Button type="link" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
