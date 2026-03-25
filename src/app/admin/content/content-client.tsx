"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Pencil,
  X,
  Loader2,
  Search,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { SiteContent } from "@/types";
import {
  updateSiteContent,
  createSiteContent,
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

function truncateJson(obj: Record<string, unknown>, maxLen = 60): string {
  const str = JSON.stringify(obj);
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

export function ContentClient({ content }: { content: SiteContent[] }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [newPage, setNewPage] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newContentJson, setNewContentJson] = useState("{}");
  const [newSortOrder, setNewSortOrder] = useState("0");

  // Edit form state
  const [editContentJson, setEditContentJson] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return content;
    const q = search.toLowerCase();
    return content.filter(
      (c) =>
        c.page.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        JSON.stringify(c.content).toLowerCase().includes(q),
    );
  }, [content, search]);

  function handleCreate() {
    if (!newPage.trim() || !newSection.trim()) return;
    setActionError(null);

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(newContentJson);
    } catch {
      setActionError("Invalid JSON in content field.");
      return;
    }

    startTransition(async () => {
      const result = await createSiteContent({
        page: newPage,
        section: newSection,
        content: parsedContent,
        sort_order: parseInt(newSortOrder, 10) || 0,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewPage("");
        setNewSection("");
        setNewContentJson("{}");
        setNewSortOrder("0");
      }
    });
  }

  function startEdit(item: SiteContent) {
    setEditingId(item.id);
    setEditContentJson(JSON.stringify(item.content, null, 2));
    setEditSortOrder(String(item.sort_order));
  }

  function handleUpdate() {
    if (!editingId) return;
    setActionError(null);

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(editContentJson);
    } catch {
      setActionError("Invalid JSON in content field.");
      return;
    }

    startTransition(async () => {
      const result = await updateSiteContent(editingId!, {
        content: parsedContent,
        sort_order: parseInt(editSortOrder, 10) || 0,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleToggleActive(item: SiteContent) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateSiteContent(item.id, {
        is_active: !item.is_active,
      });
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">
          Site Content
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? <X size={20} /> : <Plus size={20} />}
          {showCreate ? "Cancel" : "New Block"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {content.length} content block{content.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{content.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Blocks</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{content.filter(c => c.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Active</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">{content.filter(c => !c.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Inactive</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(content.map(c => c.page)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Pages</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(content.map(c => c.section)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Sections</div>
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
          placeholder="Search by page, section, content..."
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
            Add Content Block
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Page
              </label>
              <input
                type="text"
                value={newPage}
                onChange={(e) => setNewPage(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
                placeholder="home"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Section
              </label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
                placeholder="hero"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
              Content (JSON)
            </label>
            <textarea
              value={newContentJson}
              onChange={(e) => setNewContentJson(e.target.value)}
              rows={6}
              className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink resize-y"
              placeholder='{"title": "Welcome", "body": "..."}'
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
              disabled={
                isPending || !newPage.trim() || !newSection.trim()
              }
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
            <tr className="border-b border-rule bg-surface-raised">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Page
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Section
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Content
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Sort
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
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search
                    ? "No content blocks match your search."
                    : "No site content yet."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-secondary whitespace-nowrap">
                    {item.page}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink whitespace-nowrap">
                    {item.section}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted max-w-[280px] truncate">
                    {truncateJson(item.content)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap text-center">
                    {item.sort_order}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(item)}
                      disabled={isPending}
                      className="flex items-center gap-1 disabled:opacity-40"
                      title={item.is_active ? "Deactivate" : "Activate"}
                    >
                      {item.is_active ? (
                        <ToggleRight
                          size={18}
                          className="text-editorial-green"
                        />
                      ) : (
                        <ToggleLeft size={18} className="text-ink-muted" />
                      )}
                      <span
                        className={`text-[11px] font-bold uppercase tracking-widest ${item.is_active ? "text-editorial-green" : "text-ink-muted"}`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {timeAgo(item.updated_at)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-ink-muted hover:text-ink transition-colors"
                      title="Edit"
                    >
                      <Pencil size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg border border-rule bg-surface-card p-6 space-y-3 shadow-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="font-serif text-lg font-bold text-ink">
                Edit Content Block
              </p>
              <button
                onClick={() => setEditingId(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Content (JSON)
              </label>
              <textarea
                value={editContentJson}
                onChange={(e) => setEditContentJson(e.target.value)}
                rows={12}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink resize-y"
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
                disabled={isPending}
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
          Showing {filtered.length} of {content.length} blocks
        </p>
      </div>
    </div>
  );
}
