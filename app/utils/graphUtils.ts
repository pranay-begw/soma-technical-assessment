import { TodoWithCalculations } from '../types';

export const hasCircularDependency = (todos: TodoWithCalculations[]): boolean => {
  const visited = new Set<number>();
  const recStack = new Set<number>();
  
  function isCyclic(todoId: number): boolean {
    if (recStack.has(todoId)) return true;
    if (visited.has(todoId)) return false;
    
    visited.add(todoId);
    recStack.add(todoId);
    
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.dependenciesArray) {
      for (const depId of todo.dependenciesArray) {
        if (isCyclic(depId)) return true;
      }
    }
    
    recStack.delete(todoId);
    return false;
  }
  
  return todos.some(todo => isCyclic(todo.id));
};

export const calculateEarliestStartDates = (todos: TodoWithCalculations[]): TodoWithCalculations[] => {
  const todoMap = new Map(todos.map(todo => [todo.id, { ...todo }]));
  
  function getEarliestStartDate(todo: TodoWithCalculations, visited: Set<number> = new Set()): Date {
    if (visited.has(todo.id) && todo.earliestStartDate) return todo.earliestStartDate;
    
    visited.add(todo.id);
    
    if (new Date(todo.dueDate) < new Date()) { // if overdue then return due date
      return new Date(todo.dueDate);
    }

    if (!todo.dependenciesArray || todo.dependenciesArray.length === 0) {
      return new Date(); // No dependencies, can start now
    }
    
    let latestEndDate = new Date(0); // Earliest possible date
    for (const depId of todo.dependenciesArray) {
      const depTodo = todoMap.get(depId);
      if (!depTodo) continue;
      
      const depEndDate = getEarliestStartDate(depTodo, new Set(visited));
      if (depEndDate > latestEndDate) {
        latestEndDate = depEndDate;
      }
    }
    
    return latestEndDate;
  }
  
  return Array.from(todoMap.values()).map(todo => ({
    ...todo,
    earliestStartDate: getEarliestStartDate(todo)
  }));
};

export const findCriticalPath = (todos: TodoWithCalculations[]): number[] => {
  // Create a map of todos for easy lookup
  const todoMap = new Map(todos.map(todo => [todo.id, todo]));
  
  // Calculate the longest path for each todo
  const memo = new Map<number, { length: number; path: number[] }>();
  
  function findLongestPath(todoId: number): { length: number; path: number[] } {
    // Check memoization
    if (memo.has(todoId)) {
      return memo.get(todoId)!;
    }
    
    const todo = todoMap.get(todoId);
    if (!todo) {
      return { length: 0, path: [] };
    }
    
    // Base case: no dependencies
    if (!todo.dependenciesArray || todo.dependenciesArray.length === 0) {
      const result = { length: 1, path: [todoId] };
      memo.set(todoId, result);
      return result;
    }
    
    // Recursive case: find the longest path among dependencies
    let maxLength = 0;
    let longestPath: number[] = [];
    
    for (const depId of todo.dependenciesArray) {
      const depResult = findLongestPath(depId);
      if (depResult.length + 1 > maxLength) {
        maxLength = depResult.length + 1;
        longestPath = [...depResult.path, todoId];
      }
    }
    
    const result = { length: maxLength, path: longestPath };
    memo.set(todoId, result);
    return result;
  }
  
  // Find the todo with the longest path
  let criticalPath: number[] = [];
  let maxLength = 0;
  
  for (const todo of todos) {
    const { length, path } = findLongestPath(todo.id);
    if (length > maxLength) {
      maxLength = length;
      criticalPath = path;
    }
  }
  
  return criticalPath;
};
