"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
} from "@/lib/actions/admin";
import type { RoadmapItem } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: RoadmapItem["status"] }) {
  const color =
    status === "completed"
      ? "text-editorial-green"
      : status === "in_progress"
        ? "text-editorial-gold"
        : status === "cancelled"
          ? "text-editorial-red"
          : "text-ink-secondary";
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${color}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function RoadmapClient({ items }: { items: RoadmapItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<string>("planned");
  const [newCategory, setNewCategory] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");

  function handleCreate() {
    if (!newTitle.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createRoadmapItem({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: newStatus,
        category: newCategory.trim() || undefined,
        target_date: newTargetDate || undefined,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewTitle("");
        setNewDescription("");
        setNewStatus("planned");
        setNewCategory("");
        setNewTargetDate("");
      }
    });
  }

  function startEdit(item: RoadmapItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditStatus(item.status);
    setEditCategory(item.category ?? "");
    setEditTargetDate(item.target_date ?? "");
  }

  function handleUpdate(id: string) {
    if (!editTitle.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateRoadmapItem(id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        status: editStatus,
        category: editCategory.trim() || undefined,
        target_date: editTargetDate || undefined,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this roadmap item?"))
      return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteRoadmapItem(id);
      if (result.error) setActionError(result.error);
    });
  }

  function handleStatusChange(id: string, status: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateRoadmapItem(id, { status });
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">Roadmap</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? "Cancel" : "New Item"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {items.length} total item{items.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{items.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Items</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{items.filter(i => i.status === 'planned').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Planned</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">{items.filter(i => i.status === 'in_progress').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">In Progress</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{items.filter(i => i.status === 'completed').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Completed</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{items.filter(i => i.status === 'cancelled').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Cancelled</div>
        </div>
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 border border-rule bg-surface-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
            New Roadmap Item
          </p>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            rows={4}
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
            />
            <input
              type="date"
              value={newTargetDate}
              onChange={(e) => setNewTargetDate(e.target.value)}
              className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-ink font-mono"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !newTitle.trim()}
            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              "Create"
            )}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Title
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Category
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Votes
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Target Date
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  No roadmap items found.
                </td>
              </tr>
            ) : (
              items.map((item) =>
                editingId === item.id ? (
                  <tr
                    key={item.id}
                    className="border-b border-rule bg-surface-card"
                  >
                    <td colSpan={6} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                          Edit Item
                        </p>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          rows={4}
                          className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                          >
                            <option value="planned">Planned</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            placeholder="Category"
                            className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                          />
                          <input
                            type="date"
                            value={editTargetDate}
                            onChange={(e) => setEditTargetDate(e.target.value)}
                            className="border border-rule bg-transparent px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-ink font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdate(item.id)}
                            disabled={isPending}
                            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
                          >
                            {isPending ? (
                              <Loader2 size={20} className="animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={item.id}
                    className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap max-w-[200px] truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleStatusChange(item.id, e.target.value)
                        }
                        disabled={isPending}
                        className="border border-rule bg-transparent px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-ink focus:outline-none focus:border-ink disabled:opacity-40"
                      >
                        <option value="planned">Planned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                      {item.category ?? "--"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink whitespace-nowrap">
                      {item.votes}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {item.target_date ? formatDate(item.target_date) : "--"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isPending}
                          className="text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:underline disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
