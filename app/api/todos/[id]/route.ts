import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// Handle DELETE /api/todos/[id]
export async function DELETE(request: Request, { params }: Params) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    // First, check if any other todos depend on this one
    const allTodos = await prisma.todo.findMany();
    const dependentTodos = allTodos.filter(todo => {
      try {
        const deps = JSON.parse(todo.dependencies);
        return Array.isArray(deps) && deps.includes(id);
      } catch (e) {
        return false;
      }
    });
    
    if (dependentTodos.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete todo: other todos depend on this one',
          dependentTodos: dependentTodos.map(t => t.id)
        }, 
        { status: 400 }
      );
    }

    // If no dependencies, delete the todo
    await prisma.todo.delete({
      where: { id },
    });
    
    return NextResponse.json({ message: 'Todo deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
