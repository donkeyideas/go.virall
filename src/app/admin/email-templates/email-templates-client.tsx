"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { EmailTemplate } from "@/types";
import {
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "@/lib/actions/admin";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function EmailTemplatesClient({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBodyHtml, setNewBodyHtml] = useState("");
  const [newVariables, setNewVariables] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBodyHtml, setEditBodyHtml] = useState("");
  const [editVariables, setEditVariables] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.variables.some((v) => v.toLowerCase().includes(q)),
    );
  }, [templates, search]);

  function handleCreate() {
    if (!newName.trim() || !newSubject.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const vars = newVariables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const result = await createEmailTemplate({
        name: newName,
        subject: newSubject,
        body_html: newBodyHtml,
        variables: vars,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewName("");
        setNewSubject("");
        setNewBodyHtml("");
        setNewVariables("");
      }
    });
  }

  function startEdit(tpl: EmailTemplate) {
    setEditingId(tpl.id);
    setEditName(tpl.name);
    setEditSubject(tpl.subject);
    setEditBodyHtml(tpl.body_html);
    setEditVariables(tpl.variables.join(", "));
  }

  function handleUpdate() {
    if (!editingId || !editName.trim() || !editSubject.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const vars = editVariables
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const result = await updateEmailTemplate(editingId!, {
        name: editName,
        subject: editSubject,
        body_html: editBodyHtml,
        variables: vars,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleToggleActive(tpl: EmailTemplate) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateEmailTemplate(tpl.id, {
        is_active: !tpl.is_active,
      });
      if (result.error) setActionError(result.error);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this email template?")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteEmailTemplate(id);
      if (result.error) setActionError(result.error);
    });
  }

  const previewTemplate = previewId
    ? templates.find((t) => t.id === previewId)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">
          Email Templates
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? <X size={20} /> : <Plus size={20} />}
          {showCreate ? "Cancel" : "New Template"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {templates.length} total template{templates.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{templates.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{templates.filter(t => t.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Active</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">{templates.filter(t => !t.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Inactive</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{templates.filter(t => t.variables && t.variables.length > 0).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">With Variables</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{templates.filter(t => Date.now() - new Date(t.updated_at).getTime() < 7 * 86400000).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Updated 7d</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, subject, variables..."
          className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
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
            Create Email Template
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Name (unique key)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
                placeholder="welcome_email"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
                placeholder="Welcome to Go Virall, {{name}}!"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
              Body HTML
            </label>
            <textarea
              value={newBodyHtml}
              onChange={(e) => setNewBodyHtml(e.target.value)}
              rows={6}
              className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink resize-y"
              placeholder="<h1>Welcome!</h1><p>Hello {{name}},</p>"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
              Variables (comma-separated)
            </label>
            <input
              type="text"
              value={newVariables}
              onChange={(e) => setNewVariables(e.target.value)}
              className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
              placeholder="name, email, org_name"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !newName.trim() || !newSubject.trim()}
              className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Create
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
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Subject
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Variables
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Active
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Updated
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search
                    ? "No templates match your search."
                    : "No email templates yet."}
                </td>
              </tr>
            ) : (
              filtered.map((tpl) => (
                <tr
                  key={tpl.id}
                  className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-sm font-medium text-ink whitespace-nowrap">
                    {tpl.name}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-ink-secondary max-w-[240px] truncate">
                    {tpl.subject}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted max-w-[200px] truncate">
                    {tpl.variables.length > 0
                      ? tpl.variables.join(", ")
                      : "--"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(tpl)}
                      disabled={isPending}
                      className="flex items-center gap-1 disabled:opacity-40"
                      title={tpl.is_active ? "Deactivate" : "Activate"}
                    >
                      {tpl.is_active ? (
                        <ToggleRight
                          size={18}
                          className="text-editorial-green"
                        />
                      ) : (
                        <ToggleLeft size={18} className="text-ink-muted" />
                      )}
                      <span
                        className={`text-[11px] font-bold uppercase tracking-widest ${tpl.is_active ? "text-editorial-green" : "text-ink-muted"}`}
                      >
                        {tpl.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {timeAgo(tpl.updated_at)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewId(tpl.id)}
                        className="text-ink-muted hover:text-ink transition-colors"
                        title="Preview"
                      >
                        <Eye size={20} />
                      </button>
                      <button
                        onClick={() => startEdit(tpl)}
                        className="text-ink-muted hover:text-ink transition-colors"
                        title="Edit"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        disabled={isPending}
                        className="text-ink-muted hover:text-editorial-red transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl border border-rule bg-surface-card p-6 shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-serif text-lg font-bold text-ink">
                  Preview: {previewTemplate.name}
                </p>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Subject: {previewTemplate.subject}
                </p>
              </div>
              <button
                onClick={() => setPreviewId(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div
              className="border border-rule p-4 text-sm text-ink"
              dangerouslySetInnerHTML={{
                __html: previewTemplate.body_html,
              }}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg border border-rule bg-surface-card p-6 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="font-serif text-lg font-bold text-ink">
                Edit Template
              </p>
              <button
                onClick={() => setEditingId(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Body HTML
              </label>
              <textarea
                value={editBodyHtml}
                onChange={(e) => setEditBodyHtml(e.target.value)}
                rows={8}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink resize-y"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Variables (comma-separated)
              </label>
              <input
                type="text"
                value={editVariables}
                onChange={(e) => setEditVariables(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={
                  isPending || !editName.trim() || !editSubject.trim()
                }
                className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={10} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer count */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {templates.length} templates
        </p>
      </div>
    </div>
  );
}
