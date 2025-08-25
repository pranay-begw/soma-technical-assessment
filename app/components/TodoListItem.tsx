import Image from 'next/image';
import { TodoWithCalculations } from '../types';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Clock, Trash2, AlertTriangle } from 'lucide-react';
import { Pencil } from 'lucide-react';
import EditTodoModal from './EditTodoModal';


interface TodoListItemProps {
  todo: TodoWithCalculations;
  imageUrl: string | null;
  isOverdue: boolean;
  onDelete: (id: number) => void;
  allTodos?: Array<{ id: number; title: string }>;
  onEdited?: () => void | Promise<void>;
}

export default function TodoListItem({
  todo,
  imageUrl,
  isOverdue,
  onDelete,
  allTodos = [],
  onEdited,
}: TodoListItemProps) {

  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);


  const dependencies = todo.dependenciesArray?.map(depId => {
    return allTodos.find(t => t.id === depId);
  }).filter(Boolean) || [];

  return (
    <div className={`bg-white/70 backdrop-blur-sm rounded-xl shadow-sm border transition-all duration-200 hover:shadow-lg ${
      todo.isOnCriticalPath 
        ? 'border-red-200 bg-red-50/50' 
        : 'border-gray-200/50'
    } ${isExpanded ? 'shadow-lg' : ''}`}>
      
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {todo.title}
                </h3>
                {todo.isOnCriticalPath && (
                  <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    Critical
                  </span>
                )}
                {isOverdue && (
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                    Overdue
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(todo.dueDate).toLocaleDateString()}
                </div>
                {dependencies.length > 0 && (
                  <div className="text-gray-500">
                    {dependencies.length} dependencies
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50"
            aria-label="Delete todo"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditOpen(true);
            }}
            className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
            aria-label="Edit todo"
          >
            <Pencil className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-200/30">
          
          {/* Description */}
          {todo.description && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-gray-600 text-sm leading-relaxed bg-gray-50/50 rounded-lg p-3">
                {todo.description}
              </p>
            </div>
          )}

          {/* Dates Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-medium text-sm">Due Date</span>
              </div>
              <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                {new Date(todo.dueDate).toLocaleDateString()}
              </p>
            </div>
            
            <div className="bg-green-50/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Clock className="w-4 h-4" />
                <span className="font-medium text-sm">Earliest Start</span>
              </div>
              <p className="text-green-600 text-sm">
                {todo.earliestStartDate.toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Dependencies</h4>
              <div className="flex flex-wrap gap-2">
                {dependencies.map((dep) => (
                  <span 
                    key={dep?.id} 
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {dep?.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Image */}
          {imageUrl && !imageError && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Visual</h4>
              <div className="relative h-48 w-full rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={imageUrl}
                  alt={`Visual representation of ${todo.title}`}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          )}

          {imageUrl && imageError && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Visual</h4>
              <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-600">
                <div className="text-sm">Failed to load image for "{todo.title}"</div>
              </div>
            </div>
          )}
        </div>
      )}

      <EditTodoModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        todo={{
          id: todo.id,
          title: todo.title,
          description: todo.description ?? '',
          dueDate: new Date(todo.dueDate),
          dependenciesArray: todo.dependenciesArray ?? [],
        }}
        allTodos={allTodos}
        onSaved={onEdited}
      />

    </div>
  );
}