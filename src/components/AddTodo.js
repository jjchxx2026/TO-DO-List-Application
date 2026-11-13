"use client";

import { Button, DatePicker, Form, Input, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { CATEGORIES, DATE_FORMAT, DEFAULT_CATEGORY, isBeforeToday, notInPastRule } from "@/utils/constants";

// Form for adding a new task: description, due date and category.
export default function AddTodo({ onAdd }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    onAdd({
      description: values.description,
      dueDate: values.dueDate.format(DATE_FORMAT), // dayjs object -> "YYYY-MM-DD"
      category: values.category,
    });
    form.resetFields();
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{ category: DEFAULT_CATEGORY }}
      requiredMark={false}
      className="add-todo-form"
    >
      <Form.Item
        name="description"
        label="Task"
        className="add-todo-description"
        rules={[
          { required: true, whitespace: true, message: "Please enter a task description" },
          { max: 200, message: "Keep it under 200 characters" },
        ]}
      >
        <Input placeholder="What do you need to do?" allowClear />
      </Form.Item>

      <Form.Item
        name="dueDate"
        label="Due date"
        rules={[{ required: true, message: "Please pick a due date" }, notInPastRule]}
      >
        {/* Days before today are greyed out and can't be picked. */}
        <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} disabledDate={isBeforeToday} />
      </Form.Item>

      <Form.Item name="category" label="Category">
        <Select options={CATEGORIES} />
      </Form.Item>

      <Form.Item label=" ">
        <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
          Add task
        </Button>
      </Form.Item>
    </Form>
  );
}
