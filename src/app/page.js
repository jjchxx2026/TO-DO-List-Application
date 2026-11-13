import TodoApp from "@/components/TodoApp";

// The home page. It stays a Server Component and simply renders the
// interactive To-Do app, which runs in the browser ("use client").
export default function Home() {
  return <TodoApp />;
}
