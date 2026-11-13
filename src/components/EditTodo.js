"use client";

import { DatePicker, Form, Input, Modal, Radio, Switch } from "antd";
import dayjs from "dayjs";
import { CATEGORIES, DATE_FORMAT, isBeforeToday } from "@/utils/constants";

// Pop-up window for editing an existing task.
// `todo` is the task being edited, or null when the pop-up is closed.
export default function EditTodo({ todo, onSave, onCancel }) {
  const [form] = Form.useForm();

  // Past dates are blocked, except the task's current due date: an overdue task can still
  // be edited (e.g. renamed or completed) without being forced to change its date.
  const isCurrentDueDate = (date) => Boolean(todo?.dueDate) && date.format(DATE_FORMAT) === todo.dueDate;
  const isDisabledDate = (date) => isBeforeToday(date) && !isCurrentDueDate(date);
  const dueDateRule = {
    validator: (_, value) =>
      value && isDisabledDate(value)
        ? Promise.reject(new Error("Due date can’t be before today"))
        : Promise.resolve(),
  };

  const handleFinish = (values) => {
    onSave(todo.id, {
      description: values.description,
      dueDate: values.dueDate.format(DATE_FORMAT),
      category: values.category,
      completed: values.completed,
    });
  };

  return (
    <Modal
      title="Edit task"
      open={Boolean(todo)}
      okText="Save"
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnHidden // reset the form each time the pop-up opens
    >
      {todo && (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          requiredMark={false}
          initialValues={{
            description: todo.description,
            dueDate: todo.dueDate ? dayjs(todo.dueDate, DATE_FORMAT) : null,
            category: todo.category,
            completed: todo.completed,
          }}
        >
          <Form.Item
            name="description"
            label="Task"
            rules={[
              { required: true, whitespace: true, message: "Please enter a task description" },
              { max: 200, message: "Keep it under 200 characters" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Due date"
            rules={[{ required: true, message: "Please pick a due date" }, dueDateRule]}
          >
            <DatePicker format={DATE_FORMAT} style={{ width: "100%" }} disabledDate={isDisabledDate} />
          </Form.Item>

          <Form.Item name="category" label="Category">
            <Radio.Group options={CATEGORIES} optionType="button" buttonStyle="solid" />
          </Form.Item>

          <Form.Item name="completed" label="Completed">
            <Switch />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
