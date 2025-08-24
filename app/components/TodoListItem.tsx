import Image from 'next/image';
import { TodoWithCalculations } from '../types';
import { useState } from 'react';

interface TodoListItemProps {
  todo: TodoWithCalculations;
  imageUrl: string | null;
  isOverdue: boolean;
  onDelete: (id: number) => void;
  allTodos?: Array<{ id: number; title: string }>;
}

export default function TodoListItem({
  todo,
  imageUrl,
  isOverdue,
  onDelete,
  allTodos = [],
}: TodoListItemProps) {
  const [imageError, setImageError] = useState(false);
  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden transition-all hover:shadow-2xl">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-800">
              {todo.title}
            </h3>
            <p className="text-gray-600 mt-1">{todo.description}</p>
            <div
              className={`mt-2 text-sm ${
                isOverdue ? "text-red-500" : "text-gray-500"
              }`}
            >
              Due: {new Date(todo.dueDate).toLocaleDateString()}
            </div>
            
            {todo.dependenciesArray && todo.dependenciesArray.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Depends on: {todo.dependenciesArray.map(depId => {
                  const depTodo = allTodos?.find(t => t.id === depId);
                  return depTodo 
                    ? <span key={depId} className="mr-2 px-2 py-1 bg-gray-100 rounded">{depTodo.title}</span>
                    : null;
                })}
              </div>
            )}

            <div className={`mt-2 text-sm ${
                isOverdue ? "text-red-500" : "text-gray-500"
              }`}>
              Earliest Start Date: {(todo.earliestStartDate).toLocaleDateString()}
            </div>
          </div>
          
          <button
            onClick={() => onDelete(todo.id)}
            className="text-red-500 hover:text-red-700 transition-colors p-2 ml-4"
            aria-label="Delete todo"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>

        {imageUrl && !imageError ? (
          <div className="mt-4 relative h-48 w-full rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt={`Visual representation of ${todo.title}`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : imageUrl && imageError ? (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center text-gray-600">
            Failed to display image for "{todo.title}"
          </div>
        ) : null}
        
      </div>
    </div>
  );
}
