"use client";
import { Todo } from "@prisma/client";
import { useState, useEffect, useRef } from "react";
import Select from "react-select";
import TodoListItem from "./components/TodoListItem";
import { TodoWithCalculations } from "./types";
import dynamic from "next/dynamic";
import {
  hasCircularDependency,
  calculateEarliestStartDates,
  findCriticalPath,
} from "./utils/graphUtils";
import { Plus, Calendar, FileText, LinkIcon } from "lucide-react";

// Dynamically import TaskGraph with SSR disabled
const TaskGraph = dynamic(() => import("@/app/components/TaskGraph"), {
  ssr: false,
});

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [todos, setTodos] = useState<TodoWithCalculations[]>([]);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const fetchInitialData = async () => {
      await fetchTodos();
    };
    fetchInitialData();
  }, []);

  // After todos load/change, fetch images for todos with descriptions but no image
  useEffect(() => {
    todos.forEach((todo) => {
      const key = String(todo.id);
      if (todo.description && !todo.imageUrl && !imageCache[key]) {
        fetchImageForTodo(key, todo.description);
      }
    });
  }, [todos, imageCache]);

  const fetchImageForTodo = async (todoId: string, query: string) => {
    if (!query) return;

    try {
      // Check if we already have a cached result for this query
      const queryCacheKey = `img_${encodeURIComponent(query)}`;
      const cachedUrl = typeof window !== "undefined"
        ? localStorage.getItem(queryCacheKey)
        : null;

      if (cachedUrl) {
        setImageCache((prev) => ({ ...prev, [todoId]: cachedUrl }));
        return;
      }

      const res = await fetch(`/api/pexels?query=${encodeURIComponent(query)}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
      }

      const data = await res.json();
      const url: string | undefined = data?.photos?.[0]?.src?.medium;

      if (url) {
        // Cache the URL by both todoId and query
        if (typeof window !== "undefined") {
          localStorage.setItem(queryCacheKey, url);
        }
        setImageCache((prev) => ({ ...prev, [todoId]: url }));
      } else {
        console.warn(`No image found for query: ${query}`);
      }
    } catch (error) {
      console.error("Error fetching image:", error);
    }
  };

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();

      // Parse todos and add calculated fields
      const todosWithCalculations: TodoWithCalculations[] = data.map(
        (todo: Todo) => ({
          ...todo,
          // support DBs where dependencies may be JSON string or array
          dependenciesArray: Array.isArray(todo.dependencies)
            ? (todo.dependencies as number[])
            : (() => {
                try {
                  const parsed = JSON.parse(
                    (todo.dependencies as unknown as string) ?? "[]"
                  );
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              })(),
          isOnCriticalPath: false,
        })
      );

      // Calculate graph dates
      const todosWithDates = calculateEarliestStartDates(todosWithCalculations);

      // Mark critical path
      const criticalPath = findCriticalPath(todosWithDates);
      const updatedTodos = todosWithDates.map((todo) => ({
        ...todo,
        isOnCriticalPath: criticalPath.includes(todo.id),
      }));

      setTodos(updatedTodos);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      setIsLoading(true);

      // Check for circular dependencies locally
      const tempTodo: TodoWithCalculations = {
        id: -1, // Temporary ID for the new todo
        title: newTodo.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        imageUrl: null,
        dependencies: JSON.stringify(selectedDependencies),
        dependenciesArray: selectedDependencies,
        createdAt: new Date(),
        isOnCriticalPath: false,
        earliestStartDate: new Date(),
      };

      const allTodos = [...todos, tempTodo];

      if (hasCircularDependency(allTodos)) {
        alert("Error: Adding this dependency would create a circular dependency");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodo.trim(),
          dueDate,
          description,
          imageUrl: null,
          dependencies: selectedDependencies,
        }),
      });

      setIsLoading(false);

      if (response.ok) {
        setNewTodo("");
        setDueDate("");
        setDescription("");
        setSelectedDependencies([]);
        setShowAddForm(false);
        await fetchTodos();
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Failed to add todo:", error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      await fetchTodos();
      const key = String(id);
      setImageCache((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const listTodos = todos.map((todo) => ({
    value: todo.id,
    label: todo.title,
  }));

  const criticalPathTasks = todos.filter((todo) => todo.isOnCriticalPath);
  const completedTasks = todos.length;
  const overdueTasks = todos.filter(
    (todo) => new Date(todo.dueDate as any) < new Date()
  ).length;

  return (
    <div className="h-screen bg-gradient-to-br from-cyan-200 via-cyan-100 to-cyan-400 overflow-y-auto">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Dashboard</h1>
            <p className="text-gray-600 text-sm">
              Manage your projects with visual dependencies
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-blue-600">
                  {completedTasks}
                </div>
                <div className="text-gray-500">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-600">
                  {criticalPathTasks.length}
                </div>
                <div className="text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{overdueTasks}</div>
                <div className="text-gray-500">Overdue</div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddForm && (
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
          <form onSubmit={handleAddTodo} className="space-y-4">
            <div className="text-gray-600 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800 w-4 h-4" />
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Task title"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800 w-4 h-4" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-800 w-4 h-4" />
                <Select
                  options={listTodos}
                  value={selectedDependencies.map((id) => ({
                    value: id,
                    label: todos.find((t) => t.id === id)?.title || "",
                  }))}
                  onChange={(selected) =>
                    setSelectedDependencies(
                      selected ? selected.map((option: any) => option.value) : []
                    )
                  }
                  placeholder="Dependencies"
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isMulti
                />
              </div>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Adding..." : "Add Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-8rem)] min-h-0">
        {/* Left Panel - Task List */}
        <div className="w-1/2 p-6 overflow-y-auto">
          <div className="space-y-3">
            {todos.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">No tasks yet</div>
                <div className="text-gray-500 text-sm">
                  Add your first task to get started
                </div>
              </div>
            ) : (
              todos.map((todo) => {
                const key = String(todo.id);
                const effectiveImage = imageCache[key] || todo.imageUrl || null;
                const isOverdue = new Date(todo.dueDate as any) < new Date();

                return (
                  <TodoListItem
                    key={todo.id}
                    todo={todo}
                    imageUrl={effectiveImage}
                    isOverdue={isOverdue}
                    onDelete={handleDeleteTodo}
                    allTodos={todos.map((t) => ({ id: t.id, title: t.title }))}
                    onEdited = {fetchTodos}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Task Graph */}
        <div className="w-1/2 p-6 border-l border-gray-200/50 min-h-0">
          <div className="flex flex-col h-full min-h-0 bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <div className="p-6 border-b border-gray-200/50 shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">
                Project Dependencies
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Visual representation of task relationships
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <TaskGraph tasks={todos} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
