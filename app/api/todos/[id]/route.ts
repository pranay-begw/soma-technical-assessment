import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDeps(raw: any): number[] {
  try {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    }
  } catch {}
  return [];
}

type FlatTodo = { id: number; dependenciesArray: number[] };

function hasCircularDependencyServer(todos: FlatTodo[]): boolean {
  const visited = new Set<number>();
  const stack = new Set<number>();
  const map = new Map<number, number[]>(
    todos.map((t) => [t.id, t.dependenciesArray || []])
  );
  function dfs(id: number): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    for (const dep of map.get(id) || []) {
      if (dfs(dep)) return true;
    }
    stack.delete(id);
    return false;
  }
  return todos.some((t) => dfs(t.id));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const nextDeps: number[] = Array.isArray(body.dependencies) ? body.dependencies : [];

  if (nextDeps.includes(id)) {
    return NextResponse.json(
      { error: "A task cannot depend on itself." },
      { status: 400 }
    );
  }

  const rows = await prisma.todo.findMany({
    select: { id: true, dependencies: true },
  });

  const flat: FlatTodo[] = rows.map((r) => ({
    id: r.id,
    dependenciesArray: parseDeps(r.dependencies),
  }));

  const idx = flat.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const proposed = [...flat];
  proposed[idx] = { ...flat[idx], dependenciesArray: nextDeps };

  if (hasCircularDependencyServer(proposed)) {
    return NextResponse.json(
      {
        error:
          "This update would create a circular dependency between tasks. Please adjust dependencies.",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.todo.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title) } : {}),
      ...(body.description !== undefined ? { description: String(body.description) } : {}),
      ...(body.dueDate !== undefined ? { dueDate: new Date(body.dueDate) } : {}),
      dependencies: JSON.stringify(nextDeps),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const all = await prisma.todo.findMany({ select: { id: true, title: true, dependencies: true } });
  const dependents = all.filter((t) => parseDeps(t.dependencies).includes(id));

  if (dependents.length) {
    return NextResponse.json(
      {
        error: "This task cannot be deleted because other tasks depend on it.",
        dependentTodos: dependents.map((t) => ({ id: t.id, title: t.title })),
      },
      { status: 400 }
    );
  }

  await prisma.todo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
