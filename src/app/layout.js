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
        {/* AntdRegistry makes Ant Design's styles load correctly with Next.js server rendering */}
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
