"use client" 
import { Todo } from '@prisma/client'; 
import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import TodoListItem from './components/TodoListItem';
import { TodoWithCalculations } from './types';
import dynamic from 'next/dynamic';
import { hasCircularDependency, calculateEarliestStartDates, findCriticalPath } from './utils/graphUtils';

// Dynamically import TaskGraph with SSR disabled
const TaskGraph = dynamic(
  () => import('@/app/components/TaskGraph'),
  { ssr: false }
);

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [todos, setTodos] = useState<TodoWithCalculations[]>([]);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const cachedUrl = localStorage.getItem(queryCacheKey);
      
      if (cachedUrl) {
        setImageCache(prev => ({ ...prev, [todoId]: cachedUrl }));
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
        localStorage.setItem(queryCacheKey, url);
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
      const todosWithCalculations = data.map((todo: Todo) => ({
        ...todo,
        dependenciesArray: Array.isArray(todo.dependencies) ? todo.dependencies : [],
        isOnCriticalPath: false
      }));
      console.log("todosWithCalculations", todosWithCalculations);
      
      // Calculate critical path and update todos
      const todosWithDates = calculateEarliestStartDates(todosWithCalculations);
      console.log("todosWithDates", todosWithDates);

      const criticalPath = findCriticalPath(todosWithDates);
      
      const updatedTodos = todosWithDates.map(todo => ({
        ...todo,
        isOnCriticalPath: criticalPath.includes(todo.id)
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

// Check for circular dependencies
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
        alert('Error: Adding this dependency would create a circular dependency');
        setIsLoading(false);
        return;
      }

      // Image will be fetched asynchronously after the todo is created
      // using the fetchImageForTodo function in the useEffect hook
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodo.trim(),
          dueDate,
          description,
          imageUrl: null,
          dependencies: selectedDependencies
        }),
      });

      setIsLoading(false);

      if (response.ok) {
        setNewTodo("");
        setDueDate("");
        setDescription("");
        setSelectedDependencies([]);
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
      setImageCache(prev => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const listTodos = todos.map(todo => ({
    value: todo.id,
    label: todo.title
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-400 to-red-500 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Task Manager</h1>

        <form onSubmit={handleAddTodo} className="mb-12 bg-white p-6 rounded-lg shadow-lg text-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new todo"
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <Select
              options={listTodos}
              value={selectedDependencies.map(id => ({
                value: id,
                label: todos.find(t => t.id === id)?.title || ''
              }))}
              onChange={(selected) => 
                setSelectedDependencies(selected ? selected.map(option => option.value) : [])
              }
              placeholder="Add dependencies"
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              isMulti
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
              className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Adding..." : "Add Todo"}
          </button>
        </form>

        <div className="space-y-6">
          {todos.map((todo) => {
            const key = String(todo.id);
            const effectiveImage = imageCache[key] || todo.imageUrl || null;
            const isOverdue = new Date(todo.dueDate) < new Date();

            return (
              <TodoListItem
                key={todo.id}
                todo={todo}
                imageUrl={effectiveImage}
                isOverdue={isOverdue}
                onDelete={handleDeleteTodo}
                allTodos={todos.map(t => ({ id: t.id, title: t.title }))}
              />
            );
          })}
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-6 mt-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Task Dependencies</h2>
          <div className="rounded-lg overflow-hidden border-2 border-white/20">
            <TaskGraph tasks={todos} />
          </div>
        </div>
      </div>
    </div>
  );
}
