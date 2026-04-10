"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import {
  Plus,
  X,
  Loader2,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Trash2,
  Database,
} from "lucide-react";
import type { SiteContent } from "@/types";
import {
  SECTION_LABELS,
  type HomeSectionName,
} from "@/types/site-content";
import {
  updateSiteContent,
  createSiteContent,
  deleteSiteContent,
  seedHomepageContent,
} from "@/lib/actions/admin";

// ─── Helpers ───

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

const inputCls =
  "w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono";
const labelCls =
  "text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1";
const textareaCls = `${inputCls} resize-y`;

// ─── Section-specific editors ───

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder={placeholder}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={textareaCls}
        placeholder={placeholder}
      />
    </div>
  );
}

function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-editorial-gold"
      />
      <span className="text-xs text-ink">{label}</span>
    </label>
  );
}

// ─── Section editor dispatcher ───

function SectionEditor({
  section,
  content,
  onChange,
}: {
  section: string;
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const c = content;
  const set = (key: string, val: unknown) => onChange({ ...c, [key]: val });

  switch (section) {
    case "hero":
      return (
        <div className="space-y-3">
          <TextInput label="Badge Text" value={(c.badge as string) || ""} onChange={(v) => set("badge", v)} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Heading Line 1" value={(c.heading_line1 as string) || ""} onChange={(v) => set("heading_line1", v)} />
            <TextInput label="Heading Line 2 (highlighted)" value={(c.heading_line2 as string) || ""} onChange={(v) => set("heading_line2", v)} />
          </div>
          <TextArea label="Subheading" value={(c.subheading as string) || ""} onChange={(v) => set("subheading", v)} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="CTA Button Text" value={(c.cta_text as string) || ""} onChange={(v) => set("cta_text", v)} />
            <TextInput label="CTA Subtitle" value={(c.cta_subtitle as string) || ""} onChange={(v) => set("cta_subtitle", v)} />
          </div>
        </div>
      );

    case "trust_signals":
      return (
        <RepeaterEditor
          label="Trust Signals"
          items={(c.items as Array<Record<string, string>>) || []}
          onChange={(items) => set("items", items)}
          renderItem={(item, setItem) => (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelCls}>Icon</label>
                <select value={item.icon || ""} onChange={(e) => setItem({ ...item, icon: e.target.value })} className={inputCls}>
                  <option value="Eye">Eye</option>
                  <option value="Lock">Lock</option>
                  <option value="Clock">Clock</option>
                  <option value="Shield">Shield</option>
                </select>
              </div>
              <div className="col-span-2">
                <TextInput label="Text" value={item.text || ""} onChange={(v) => setItem({ ...item, text: v })} />
              </div>
            </div>
          )}
          newItem={{ icon: "Shield", text: "" }}
        />
      );

    case "about":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Title Prefix" value={(c.title_prefix as string) || ""} onChange={(v) => set("title_prefix", v)} placeholder="WHAT IS" />
            <TextInput label="Title Highlight" value={(c.title_highlight as string) || ""} onChange={(v) => set("title_highlight", v)} placeholder="GO VIRALL" />
          </div>
          <TextArea label="Body Text" value={(c.body as string) || ""} onChange={(v) => set("body", v)} rows={4} />
        </div>
      );

    case "platforms":
      return <SectionHeaderEditor content={c} onChange={onChange} extraFields={
        <TextInput label="Footnote" value={(c.footnote as string) || ""} onChange={(v) => set("footnote", v)} />
      } />;

    case "how_it_works":
      return (
        <div className="space-y-4">
          <SectionHeaderEditor content={c} onChange={onChange} />
          <RepeaterEditor
            label="Steps"
            items={(c.steps as Array<Record<string, string>>) || []}
            onChange={(steps) => set("steps", steps)}
            renderItem={(item, setItem) => (
              <div className="space-y-2">
                <TextInput label="Title" value={item.title || ""} onChange={(v) => setItem({ ...item, title: v })} />
                <TextArea label="Description" value={item.description || ""} onChange={(v) => setItem({ ...item, description: v })} rows={2} />
              </div>
            )}
            newItem={{ title: "", description: "" }}
          />
        </div>
      );

    case "features":
      return (
        <div className="space-y-4">
          <SectionHeaderEditor content={c} onChange={onChange} />
          <RepeaterEditor
            label="Feature Items"
            items={(c.items as Array<Record<string, string>>) || []}
            onChange={(items) => set("items", items)}
            renderItem={(item, setItem) => (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Icon</label>
                    <select value={item.icon || ""} onChange={(e) => setItem({ ...item, icon: e.target.value })} className={inputCls}>
                      <option value="BarChart3">BarChart3</option>
                      <option value="Sun">Sun</option>
                      <option value="Users">Users</option>
                      <option value="CreditCard">CreditCard</option>
                      <option value="CheckCircle">CheckCircle</option>
                      <option value="Activity">Activity</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <TextInput label="Title" value={item.title || ""} onChange={(v) => setItem({ ...item, title: v })} />
                  </div>
                </div>
                <TextArea label="Description" value={item.description || ""} onChange={(v) => setItem({ ...item, description: v })} rows={2} />
              </div>
            )}
            newItem={{ icon: "BarChart3", title: "", description: "" }}
          />
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-4">
          <SectionHeaderEditor content={c} onChange={onChange} />
          <RepeaterEditor
            label="Testimonials"
            items={(c.items as Array<Record<string, string>>) || []}
            onChange={(items) => set("items", items)}
            renderItem={(item, setItem) => (
              <div className="space-y-2">
                <TextArea label="Quote" value={item.quote || ""} onChange={(v) => setItem({ ...item, quote: v })} rows={2} />
                <div className="grid grid-cols-3 gap-2">
                  <TextInput label="Name" value={item.name || ""} onChange={(v) => setItem({ ...item, name: v })} />
                  <TextInput label="Handle" value={item.handle || ""} onChange={(v) => setItem({ ...item, handle: v })} />
                  <TextInput label="Platform" value={item.platform || ""} onChange={(v) => setItem({ ...item, platform: v })} />
                </div>
              </div>
            )}
            newItem={{ quote: "", name: "", handle: "", platform: "" }}
          />
        </div>
      );

    case "brands":
      return (
        <div className="space-y-4">
          <SectionHeaderEditor content={c} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="CTA Button Text" value={(c.cta_text as string) || ""} onChange={(v) => set("cta_text", v)} placeholder="Explore Brand Dashboard" />
            <TextInput label="CTA Link" value={(c.cta_href as string) || ""} onChange={(v) => set("cta_href", v)} placeholder="/brand" />
          </div>
          <RepeaterEditor
            label="Brand Features"
            items={(c.items as Array<Record<string, string>>) || []}
            onChange={(items) => set("items", items)}
            renderItem={(item, setItem) => (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelCls}>Icon</label>
                    <select value={item.icon || ""} onChange={(e) => setItem({ ...item, icon: e.target.value })} className={inputCls}>
                      <option value="Search">Search</option>
                      <option value="Target">Target</option>
                      <option value="Briefcase">Briefcase</option>
                      <option value="BarChart3">BarChart3</option>
                      <option value="CreditCard">CreditCard</option>
                      <option value="MessageCircle">MessageCircle</option>
                      <option value="Users">Users</option>
                      <option value="Handshake">Handshake</option>
                      <option value="Shield">Shield</option>
                      <option value="Zap">Zap</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <TextInput label="Title" value={item.title || ""} onChange={(v) => setItem({ ...item, title: v })} />
                  </div>
                </div>
                <TextArea label="Description" value={item.description || ""} onChange={(v) => setItem({ ...item, description: v })} rows={2} />
              </div>
            )}
            newItem={{ icon: "Briefcase", title: "", description: "" }}
          />
        </div>
      );

    case "pricing":
      return <PricingEditor content={c} onChange={onChange} />;

    case "faq":
      return (
        <div className="space-y-4">
          <SectionHeaderEditor content={c} onChange={onChange} />
          <RepeaterEditor
            label="FAQ Items"
            items={(c.items as Array<Record<string, string>>) || []}
            onChange={(items) => set("items", items)}
            renderItem={(item, setItem) => (
              <div className="space-y-2">
                <TextInput label="Question" value={item.question || ""} onChange={(v) => setItem({ ...item, question: v })} />
                <TextArea label="Answer" value={item.answer || ""} onChange={(v) => setItem({ ...item, answer: v })} rows={3} />
              </div>
            )}
            newItem={{ question: "", answer: "" }}
          />
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Heading Prefix" value={(c.heading_prefix as string) || ""} onChange={(v) => set("heading_prefix", v)} placeholder="READY TO GO" />
            <TextInput label="Heading Highlight" value={(c.heading_highlight as string) || ""} onChange={(v) => set("heading_highlight", v)} placeholder="VIRAL" />
          </div>
          <TextInput label="Subheading" value={(c.subheading as string) || ""} onChange={(v) => set("subheading", v)} />
          <TextInput label="Button Text" value={(c.button_text as string) || ""} onChange={(v) => set("button_text", v)} />
        </div>
      );

    case "footer":
      return (
        <div className="space-y-3">
          <TextArea label="Company Description" value={(c.description as string) || ""} onChange={(v) => set("description", v)} rows={2} />
          <TextInput label="Copyright Text" value={(c.copyright as string) || ""} onChange={(v) => set("copyright", v)} />
        </div>
      );

    default:
      return <GenericJsonEditor content={c} onChange={onChange} />;
  }
}

// ─── Sub-components ───

function SectionHeaderEditor({
  content,
  onChange,
  extraFields,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  extraFields?: React.ReactNode;
}) {
  const set = (key: string, val: unknown) => onChange({ ...content, [key]: val });
  return (
    <div className="space-y-3">
      <TextInput label="Section Label" value={(content.label as string) || ""} onChange={(v) => set("label", v)} />
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Title Line 1" value={(content.title_line1 as string) || ""} onChange={(v) => set("title_line1", v)} />
        <TextInput label="Title Line 2" value={(content.title_line2 as string) || ""} onChange={(v) => set("title_line2", v)} />
      </div>
      <TextInput label="Subtitle" value={(content.subtitle as string) || ""} onChange={(v) => set("subtitle", v)} />
      {extraFields}
    </div>
  );
}

function RepeaterEditor<T extends Record<string, unknown>>({
  label,
  items,
  onChange,
  renderItem,
  newItem,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, setItem: (item: T) => void, index: number) => React.ReactNode;
  newItem: T;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={labelCls}>{label} ({items.length})</span>
        <button
          onClick={() => onChange([...items, { ...newItem }])}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:underline"
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="border border-rule p-3 relative">
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="absolute top-2 right-2 text-ink-muted hover:text-editorial-red transition-colors"
              title="Remove"
            >
              <X size={14} />
            </button>
            {renderItem(
              item,
              (updated) => onChange(items.map((it, j) => (j === i ? updated : it))),
              i,
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const set = (key: string, val: unknown) => onChange({ ...content, [key]: val });
  const tiers = (content.tiers as Array<Record<string, unknown>>) || [];

  const setTier = (index: number, updated: Record<string, unknown>) => {
    set("tiers", tiers.map((t, i) => (i === index ? updated : t)));
  };

  return (
    <div className="space-y-4">
      <SectionHeaderEditor content={content} onChange={onChange} extraFields={
        <TextInput label="Footnote" value={(content.footnote as string) || ""} onChange={(v) => set("footnote", v)} />
      } />
      <div className="flex items-center justify-between">
        <span className={labelCls}>Pricing Tiers ({tiers.length})</span>
        <button
          onClick={() => set("tiers", [...tiers, { tier: "", price: "$0", description: "", features: [], cta_text: "", is_primary: false, is_recommended: false }])}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:underline"
        >
          <Plus size={12} /> Add Tier
        </button>
      </div>
      {tiers.map((tier, i) => (
        <div key={i} className="border border-rule p-3 space-y-2 relative">
          <button
            onClick={() => set("tiers", tiers.filter((_, j) => j !== i))}
            className="absolute top-2 right-2 text-ink-muted hover:text-editorial-red transition-colors"
          >
            <X size={14} />
          </button>
          <div className="grid grid-cols-3 gap-2">
            <TextInput label="Tier Name" value={(tier.tier as string) || ""} onChange={(v) => setTier(i, { ...tier, tier: v })} />
            <TextInput label="Price" value={(tier.price as string) || ""} onChange={(v) => setTier(i, { ...tier, price: v })} />
            <TextInput label="CTA Text" value={(tier.cta_text as string) || ""} onChange={(v) => setTier(i, { ...tier, cta_text: v })} />
          </div>
          <TextInput label="Description" value={(tier.description as string) || ""} onChange={(v) => setTier(i, { ...tier, description: v })} />
          <div className="flex gap-4">
            <CheckboxInput label="Primary CTA" checked={!!tier.is_primary} onChange={(v) => setTier(i, { ...tier, is_primary: v })} />
            <CheckboxInput label="Most Popular" checked={!!tier.is_recommended} onChange={(v) => setTier(i, { ...tier, is_recommended: v })} />
          </div>
          <div>
            <label className={labelCls}>Features (one per line)</label>
            <textarea
              value={((tier.features as string[]) || []).join("\n")}
              onChange={(e) => setTier(i, { ...tier, features: e.target.value.split("\n") })}
              rows={4}
              className={textareaCls}
              placeholder="Feature 1&#10;Feature 2"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericJsonEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const [jsonStr, setJsonStr] = useState(JSON.stringify(content, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <label className={labelCls}>Content (JSON)</label>
      {error && <p className="text-xs text-editorial-red mb-1">{error}</p>}
      <textarea
        value={jsonStr}
        onChange={(e) => {
          setJsonStr(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
            setError(null);
          } catch {
            setError("Invalid JSON");
          }
        }}
        rows={10}
        className={textareaCls}
      />
    </div>
  );
}

// ─── Main component ───

export function ContentClient({ content }: { content: SiteContent[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, unknown> | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newPage, setNewPage] = useState("home");
  const [newSection, setNewSection] = useState("");
  const [newContentJson, setNewContentJson] = useState("{}");
  const [newSortOrder, setNewSortOrder] = useState("0");

  const homeContent = useMemo(() => content.filter((c) => c.page === "home"), [content]);
  const otherContent = useMemo(() => content.filter((c) => c.page !== "home"), [content]);
  const hasHomeContent = homeContent.length > 0;

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

  const getSectionLabel = useCallback((section: string): string => {
    return SECTION_LABELS[section as HomeSectionName] || section;
  }, []);

  function handleExpand(item: SiteContent) {
    if (expandedId === item.id) {
      setExpandedId(null);
      setEditContent(null);
    } else {
      setExpandedId(item.id);
      setEditContent(structuredClone(item.content));
    }
  }

  function handleSave() {
    if (!expandedId || !editContent) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateSiteContent(expandedId, { content: editContent });
      if (result.error) {
        setActionError(result.error);
      } else {
        setExpandedId(null);
        setEditContent(null);
      }
    });
  }

  function handleToggleActive(item: SiteContent) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateSiteContent(item.id, { is_active: !item.is_active });
      if (result.error) setActionError(result.error);
    });
  }

  function handleDelete(item: SiteContent) {
    if (!window.confirm(`Delete "${getSectionLabel(item.section)}" from ${item.page}?`)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteSiteContent(item.id);
      if (result.error) setActionError(result.error);
    });
  }

  function handleSeed() {
    setActionError(null);
    startTransition(async () => {
      const result = await seedHomepageContent();
      if (result.error) setActionError(result.error);
    });
  }

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
        setNewPage("home");
        setNewSection("");
        setNewContentJson("{}");
        setNewSortOrder("0");
      }
    });
  }

  const displayItems = search.trim() ? filtered : content;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl font-bold text-ink">Site Content</h1>
        <div className="flex gap-2">
          {!hasHomeContent && (
            <button
              onClick={handleSeed}
              disabled={isPending}
              className="flex items-center gap-1.5 border border-editorial-gold bg-editorial-gold/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:bg-editorial-gold/20 transition-colors disabled:opacity-40"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              Seed Homepage Content
            </button>
          )}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
          >
            {showCreate ? <X size={20} /> : <Plus size={20} />}
            {showCreate ? "Cancel" : "New Block"}
          </button>
        </div>
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
          <div className="font-mono text-2xl font-bold text-editorial-green">{content.filter((c) => c.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Active</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">{content.filter((c) => !c.is_active).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Inactive</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(content.map((c) => c.page)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Pages</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{new Set(content.map((c) => c.section)).size}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Sections</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Add Content Block</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TextInput label="Page" value={newPage} onChange={setNewPage} placeholder="home" />
            <TextInput label="Section" value={newSection} onChange={setNewSection} placeholder="hero" />
            <TextInput label="Sort Order" value={newSortOrder} onChange={setNewSortOrder} />
          </div>
          <div>
            <label className={labelCls}>Content (JSON)</label>
            <textarea
              value={newContentJson}
              onChange={(e) => setNewContentJson(e.target.value)}
              rows={6}
              className={textareaCls}
              placeholder='{"title": "Welcome", "body": "..."}'
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={isPending || !newPage.trim() || !newSection.trim()} className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5">
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Section List */}
      <div className="border border-rule divide-y divide-rule">
        {displayItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            {search ? "No content blocks match your search." : "No site content yet. Use 'Seed Homepage Content' to get started."}
          </div>
        ) : (
          displayItems.map((item) => (
            <div key={item.id} className="transition-colors">
              {/* Collapsed row */}
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised/50 cursor-pointer"
                onClick={() => handleExpand(item)}
              >
                <span className="text-ink-muted">
                  {expandedId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary w-16 flex-shrink-0">
                  {item.page}
                </span>
                <span className="text-sm font-medium text-ink flex-1">
                  {getSectionLabel(item.section)}
                </span>
                <span className="font-mono text-xs text-ink-muted w-8 text-center flex-shrink-0">
                  {item.sort_order}
                </span>
                <span className="font-mono text-xs text-ink-muted flex-shrink-0">
                  {timeAgo(item.updated_at)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleActive(item); }}
                  disabled={isPending}
                  className="flex items-center gap-1 disabled:opacity-40 flex-shrink-0"
                  title={item.is_active ? "Deactivate" : "Activate"}
                >
                  {item.is_active ? (
                    <ToggleRight size={18} className="text-editorial-green" />
                  ) : (
                    <ToggleLeft size={18} className="text-ink-muted" />
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                  disabled={isPending}
                  className="text-ink-muted hover:text-editorial-red transition-colors disabled:opacity-40 flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Expanded editor */}
              {expandedId === item.id && editContent && (
                <div className="px-4 pb-4 bg-surface-card border-t border-rule">
                  <div className="pt-4">
                    <SectionEditor
                      section={item.section}
                      content={editContent}
                      onChange={setEditContent}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => { setExpandedId(null); setEditContent(null); }}
                      className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isPending}
                      className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {isPending && <Loader2 size={10} className="animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {displayItems.length} of {content.length} blocks
        </p>
      </div>
    </div>
  );
}
