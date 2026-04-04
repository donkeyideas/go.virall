"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
} from "@/lib/actions/admin";
import type { ChangelogEntry } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function TypeBadge({ type }: { type: ChangelogEntry["type"] }) {
  const color =
    type === "feature"
      ? "text-editorial-green"
      : type === "improvement"
        ? "text-ink-secondary"
        : type === "fix"
          ? "text-editorial-gold"
          : "text-editorial-red";
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${color}`}
    >
      {type}
    </span>
  );
}

export function ChangelogClient({ entries }: { entries: ChangelogEntry[] }) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<string>("improvement");
  const [newPublished, setNewPublished] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [editPublished, setEditPublished] = useState(false);

  function handleCreate() {
    if (!newTitle.trim() || !newDescription.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createChangelogEntry({
        title: newTitle.trim(),
        description: newDescription.trim(),
        type: newType,
        is_published: newPublished,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewTitle("");
        setNewDescription("");
        setNewType("improvement");
        setNewPublished(false);
      }
    });
  }

  function startEdit(entry: ChangelogEntry) {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditDescription(entry.description);
    setEditType(entry.type);
    setEditPublished(entry.is_published);
  }

  function handleUpdate(id: string) {
    if (!editTitle.trim() || !editDescription.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateChangelogEntry(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        type: editType,
        is_published: editPublished,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this changelog entry?"))
      return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteChangelogEntry(id);
      if (result.error) setActionError(result.error);
    });
  }

  function handleTogglePublished(entry: ChangelogEntry) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateChangelogEntry(entry.id, {
        is_published: !entry.is_published,
      });
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">Changelog</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? "Cancel" : "New Entry"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {entries.length} total entr{entries.length !== 1 ? "ies" : "y"}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{entries.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Entries</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{entries.filter(e => e.type === 'feature').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Features</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{entries.filter(e => e.type === 'improvement').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Improvements</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">{entries.filter(e => e.type === 'fix').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Bug Fixes</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{entries.filter(e => e.is_published).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Published</div>
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
            New Changelog Entry
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
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
            >
              <option value="feature">Feature</option>
              <option value="improvement">Improvement</option>
              <option value="fix">Fix</option>
              <option value="breaking">Breaking</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={newPublished}
                onChange={(e) => setNewPublished(e.target.checked)}
                className="accent-editorial-green"
              />
              Published
            </label>
            <button
              onClick={handleCreate}
              disabled={
                isPending || !newTitle.trim() || !newDescription.trim()
              }
              className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Create"
              )}
            </button>
          </div>
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
                Type
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Published
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Date
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  No changelog entries found.
                </td>
              </tr>
            ) : (
              entries.map((entry) =>
                editingId === entry.id ? (
                  <tr
                    key={entry.id}
                    className="border-b border-rule bg-surface-card"
                  >
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                          Edit Entry
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
                        <div className="flex items-center gap-3 flex-wrap">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                          >
                            <option value="feature">Feature</option>
                            <option value="improvement">Improvement</option>
                            <option value="fix">Fix</option>
                            <option value="breaking">Breaking</option>
                          </select>
                          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPublished}
                              onChange={(e) =>
                                setEditPublished(e.target.checked)
                              }
                              className="accent-editorial-green"
                            />
                            Published
                          </label>
                          <button
                            onClick={() => handleUpdate(entry.id)}
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
                    key={entry.id}
                    className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap max-w-[250px] truncate">
                      {entry.title}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <TypeBadge type={entry.type} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublished(entry)}
                        disabled={isPending}
                        className={`text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 ${
                          entry.is_published
                            ? "text-editorial-green"
                            : "text-ink-muted"
                        }`}
                      >
                        {entry.is_published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(entry)}
                          className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
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
          Showing {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
        </p>
      </div>
    </div>
  );
}
