"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Checkbox, Flex, Modal, Radio, Spin, Table, Tag, Typography, Upload } from "antd";
import { DownloadOutlined, InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DATE_FORMAT, getCategoryColor } from "@/utils/constants";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE_MB,
  downloadImportTemplate,
  duplicateKey,
  parseImportFile,
} from "@/utils/importExport";

const { Text, Paragraph } = Typography;
const MAX_ERRORS_SHOWN = 8;
const PREVIEW_ROWS = 5;

const previewColumns = [
  { title: "Description", dataIndex: "description", ellipsis: true },
  {
    title: "Due date",
    dataIndex: "dueDate",
    width: 120,
    render: (value) => dayjs(value, DATE_FORMAT).format("D MMM YYYY"),
  },
  {
    title: "Category",
    dataIndex: "category",
    width: 100,
    render: (value) => <Tag color={getCategoryColor(value)}>{value}</Tag>,
  },
  {
    title: "Status",
    dataIndex: "completed",
    width: 110,
    render: (value) => (value ? "Completed" : "Incomplete"),
  },
];

// Pop-up for importing tasks in bulk from a CSV or Excel file.
// Steps: choose file -> check the summary/preview -> choose add or replace -> import.
export default function ImportTodos({ open, onClose, existingTodos, onImport }) {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null); // { fileName, tasks, errors, totalRows }
  const [fileError, setFileError] = useState(null);
  const [mode, setMode] = useState("add");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const reset = () => {
    setParsing(false);
    setResult(null);
    setFileError(null);
    setMode("add");
    setSkipDuplicates(true);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
    setParsing(true);
    setFileError(null);
    setResult(null);
    try {
      const parsed = await parseImportFile(file);
      setResult({ fileName: file.name, ...parsed });
    } catch (error) {
      setFileError(error.message);
    } finally {
      setParsing(false);
    }
    return false; // stop Ant Design from trying to upload the file to a server
  };

  // Work out which tasks will actually be imported.
  const { toImport, duplicateCount } = useMemo(() => {
    if (!result) return { toImport: [], duplicateCount: 0 };
    if (mode === "replace" || !skipDuplicates) return { toImport: result.tasks, duplicateCount: 0 };

    const seen = new Set(existingTodos.map(duplicateKey));
    const unique = [];
    for (const task of result.tasks) {
      const key = duplicateKey(task);
      if (!seen.has(key)) {
        seen.add(key); // also skips repeats inside the same file
        unique.push(task);
      }
    }
    return { toImport: unique, duplicateCount: result.tasks.length - unique.length };
  }, [result, mode, skipDuplicates, existingTodos]);

  const handleImport = () => {
    onImport(toImport, mode, { skipped: result.errors.length, duplicates: duplicateCount });
    close();
  };

  const importLabel =
    toImport.length === 0 ? "Nothing to import" : `Import ${toImport.length} task${toImport.length === 1 ? "" : "s"}`;

  return (
    <Modal
      title="Import tasks from CSV or Excel"
      open={open}
      onCancel={close}
      width={720}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={close}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!result || toImport.length === 0}
          onClick={handleImport}
          danger={mode === "replace" && toImport.length > 0}
        >
          {mode === "replace" && toImport.length > 0 ? `Replace with ${toImport.length} tasks` : importLabel}
        </Button>,
      ]}
    >
      <Flex vertical gap={16}>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          The first row must contain column headings: <Text code>Description</Text>, <Text code>Due Date</Text>, and
          optionally <Text code>Category</Text> and <Text code>Status</Text>.{" "}
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={downloadImportTemplate}
            style={{ paddingInline: 0 }}
          >
            Download template
          </Button>
        </Paragraph>

        <Upload.Dragger
          accept={ACCEPTED_FILE_TYPES}
          multiple={false}
          showUploadList={false}
          beforeUpload={handleFile}
          disabled={parsing}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag a file here</p>
          <p className="ant-upload-hint">.csv or .xlsx, up to {MAX_FILE_SIZE_MB} MB</p>
        </Upload.Dragger>

        {parsing && (
          <Flex justify="center">
            <Spin description="Reading file…" />
          </Flex>
        )}

        {fileError && <Alert type="error" showIcon title="This file can't be imported" description={fileError} />}

        {result && (
          <>
            <Alert
              type={result.tasks.length > 0 ? "success" : "error"}
              showIcon
              title={
                <>
                  <strong>{result.fileName}</strong>: {result.tasks.length} of {result.totalRows} row
                  {result.totalRows === 1 ? "" : "s"} are valid
                </>
              }
            />

            {result.errors.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} will be skipped`}
                description={
                  <ul className="import-errors">
                    {result.errors.slice(0, MAX_ERRORS_SHOWN).map((e) => (
                      <li key={e.row}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                    {result.errors.length > MAX_ERRORS_SHOWN && (
                      <li>…and {result.errors.length - MAX_ERRORS_SHOWN} more</li>
                    )}
                  </ul>
                }
              />
            )}

            {result.tasks.length > 0 && (
              <>
                <div>
                  <Text strong>
                    Preview{result.tasks.length > PREVIEW_ROWS ? ` (first ${PREVIEW_ROWS})` : ""}
                  </Text>
                  <Table
                    size="small"
                    columns={previewColumns}
                    dataSource={result.tasks.slice(0, PREVIEW_ROWS).map((t, i) => ({ ...t, key: i }))}
                    pagination={false}
                    scroll={{ x: 560 }}
                    style={{ marginTop: 8 }}
                  />
                </div>

                <Flex vertical gap={8}>
                  <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
                    <Flex vertical gap={4}>
                      <Radio value="add">Add to my current tasks ({existingTodos.length})</Radio>
                      <Radio value="replace" disabled={existingTodos.length === 0}>
                        Replace all my current tasks
                      </Radio>
                    </Flex>
                  </Radio.Group>

                  {mode === "add" && (
                    <Checkbox checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)}>
                      Skip tasks I already have (same description and due date)
                      {duplicateCount > 0 && <Text type="secondary"> · {duplicateCount} found</Text>}
                    </Checkbox>
                  )}

                  {mode === "replace" && (
                    <Alert
                      type="warning"
                      showIcon
                      title={`Your ${existingTodos.length} current tasks will be deleted. Export them first if you may need them.`}
                    />
                  )}
                </Flex>
              </>
            )}
          </>
        )}
      </Flex>
    </Modal>
  );
}
