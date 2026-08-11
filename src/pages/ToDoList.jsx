import { useEffect, useMemo, useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "aralflow-todos";

function ToDoList() {
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const filteredTasks = useMemo(() => {
    if (filter === "active") return tasks.filter((task) => !task.completed);
    if (filter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }, [filter, tasks]);

  const handleAddTask = (event) => {
    event.preventDefault();
    const title = newTask.trim();
    if (!title) return;

    setTasks((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewTask("");
  };

  const toggleTask = (id) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const deleteTask = (id) => {
    setTasks((previous) => previous.filter((task) => task.id !== id));
  };

  return (
    <section
      id="todo-list"
      className="scroll-mt-28 bg-zinc-50 px-4 py-20 text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-white sm:px-6"
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <ListTodo className="h-4 w-4 text-emerald-500" />
            <span className="ibm-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Study planner
            </span>
          </div>

          <h1 className="pixel-font text-3xl text-zinc-950 dark:text-white">
            To-do list
          </h1>
          <p className="inter-font mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Keep your study tasks organized and mark them off as you finish.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="Add a study task..."
              aria-label="New task"
              className="inter-font min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={!newTask.trim()}
              className="inter-font flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
              {["all", "active", "completed"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`ibm-mono rounded-lg px-3 py-2 text-[9px] font-semibold uppercase tracking-wider transition ${
                    filter === option
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="ibm-mono text-[10px] text-zinc-400">
              {completedCount}/{tasks.length} completed
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="group flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-3 transition hover:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.completed ? "Mark task active" : "Complete task"}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                    task.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-zinc-300 bg-white text-transparent hover:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>

                <span
                  className={`inter-font min-w-0 flex-1 break-words text-sm ${
                    task.completed
                      ? "text-zinc-400 line-through"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {task.title}
                </span>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Delete ${task.title}`}
                  className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="py-12 text-center">
                <ListTodo className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                <p className="inter-font mt-3 text-sm text-zinc-400">
                  {tasks.length === 0
                    ? "No tasks yet. Add your first study task."
                    : `No ${filter} tasks.`}
                </p>
              </div>
            )}
          </div>

          {completedCount > 0 && (
            <button
              type="button"
              onClick={() =>
                setTasks((previous) =>
                  previous.filter((task) => !task.completed),
                )
              }
              className="inter-font mt-5 text-xs font-semibold text-zinc-400 transition hover:text-red-500"
            >
              Clear completed tasks
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default ToDoList;
