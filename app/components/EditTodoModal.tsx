"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";
import { X, Calendar, FileText, LinkIcon } from "lucide-react";

type Option = { value: number; label: string };

export interface EditTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  todo: {
    id: number;
    title: string;
    description?: string | null;
    dueDate: string | Date;
    dependenciesArray?: number[];
  };
  allTodos: Array<{ id: number; title: string }>;
  onSaved?: () => Promise<void> | void;
}

export default function EditTodoModal({
  isOpen,
  onClose,
  todo,
  allTodos,
  onSaved,
}: EditTodoModalProps) {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? "");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(todo.dueDate);
    return d.toISOString().slice(0, 10);
  });
  const [deps, setDeps] = useState<number[]>(todo.dependenciesArray ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options: Option[] = useMemo(
    () =>
      allTodos
        .filter((t) => t.id !== todo.id)
        .map((t) => ({ value: t.id, label: t.title })),
    [allTodos, todo.id]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTitle(todo.title);
    setDescription(todo.description ?? "");
    const d = new Date(todo.dueDate);
    setDueDate(d.toISOString().slice(0, 10));
    setDeps(todo.dependenciesArray ?? []);
    setError(null);
  }, [isOpen, todo]);

  const selected = deps
    .map((id) => options.find((o) => o.value === id) ?? { value: id, label: String(id) })
    .filter(Boolean) as Option[];

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (deps.includes(todo.id)) {
      setError("A task cannot depend on itself.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          dueDate,
          dependencies: deps,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Update failed (${res.status})`);
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      aria-modal
      role="dialog"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div
        className="text-gray-600 relative bg-white w-full max-w-xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Close edit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}

          <div className="relative">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="date"
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="relative">
            <LinkIcon className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
            <div className="pl-8">
              <Select
                options={options}
                value={selected}
                isMulti
                onChange={(vals) => setDeps(vals.map((v) => (v as Option).value))}
                placeholder="Dependencies"
                classNamePrefix="react-select"
              />
            </div>
          </div>

          <div>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <button
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
