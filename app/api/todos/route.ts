import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        dueDate: true,
        description: true,
        imageUrl: true,
        dependencies: true,
      },
    });

    const parsedTodos = todos.map(todo => ({
      ...todo,
      dependencies: todo.dependencies ? JSON.parse(todo.dependencies) : []
    }));

    return NextResponse.json(parsedTodos);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, dueDate, description, imageUrl, dependencies } = await request.json();
    
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: new Date(dueDate),
        description,
        imageUrl: imageUrl || null,
        dependencies: Array.isArray(dependencies) 
          ? JSON.stringify(dependencies) 
          : '[]'
      },
    });

    return NextResponse.json({
      ...todo,
      dependencies: todo.dependencies ? JSON.parse(todo.dependencies) : []
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Error creating todo' },
      { status: 500 }
    );
  }
}