"use client";

import { useState } from "react";
import { App, Button, Dropdown } from "antd";
import { DownOutlined, FileExcelOutlined } from "@ant-design/icons";
import { exportTodosToExcel } from "@/utils/importExport";

// "Export to Excel" button. Choose between every task, or only the tasks that match the
// current search/filter (in the current sort order, across all pages).
export default function ExportTodos({ allTodos, visibleTodos, isFiltering }) {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);

  const runExport = async (todos, label) => {
    setExporting(true);
    try {
      await exportTodosToExcel(todos, { label });
      message.success(`Exported ${todos.length} task${todos.length === 1 ? "" : "s"} to Excel`);
    } catch {
      message.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const items = [
    { key: "all", label: `All tasks (${allTodos.length})` },
    {
      key: "view",
      label: `Only the current search/filter (${visibleTodos.length})`,
      disabled: !isFiltering || visibleTodos.length === 0,
    },
  ];

  const onMenuClick = ({ key }) => {
    if (key === "all") runExport(allTodos, "All tasks");
    else runExport(visibleTodos, "Current search/filter");
  };

  return (
    <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]} disabled={allTodos.length === 0}>
      <Button icon={<FileExcelOutlined />} loading={exporting}>
        Export to Excel <DownOutlined />
      </Button>
    </Dropdown>
  );
}
