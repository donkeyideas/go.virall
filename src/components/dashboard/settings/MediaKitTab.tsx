"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, ChevronUp, ChevronDown, Plus, X, Copy, Check } from "lucide-react";
import { formatCompact, cn } from "@/lib/utils";
import type { Profile, SocialProfile } from "@/types";

/* ─── Types ─── */

interface DemographicRow {
  label: string;
  pct: number;
  color: string;
}

interface CollabRow {
  brand: string;
  detail: string;
}

interface Section {
  id: string;
  label: string;
  visible: boolean;
}

/* ─── Constants ─── */

const COLOR_OPTIONS = [
  { label: "Red", value: "bg-editorial-red" },
  { label: "Blue", value: "bg-editorial-blue" },
  { label: "Gold", value: "bg-editorial-gold" },
  { label: "Green", value: "bg-editorial-green" },
];

/* ─── Component ─── */

export function MediaKitTab({
  profile,
  socialProfiles,
}: {
  profile: Profile | null;
  socialProfiles: SocialProfile[];
}) {
  const totalFollowers = socialProfiles.reduce((s, p) => s + p.followers_count, 0);
  const avgEngagement =
    socialProfiles.length > 0
      ? socialProfiles.reduce((s, p) => s + (p.engagement_rate ?? 0), 0) / socialProfiles.length
      : 0;

  const handle = profile?.display_name ?? socialProfiles[0]?.handle ?? "username";
  const initial = (profile?.full_name ?? "U")[0].toUpperCase();

  // ── Slug state ──
  const [slug, setSlug] = useState(handle);
  const [editingSlug, setEditingSlug] = useState(false);
  const [copied, setCopied] = useState(false);
  const mediaKitUrl = `govirall.app/mediakit/${slug}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(`https://${mediaKitUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Bio state ──
  const [bio, setBio] = useState(
    profile?.bio ??
      `Helping ${formatCompact(totalFollowers)}+ followers build wardrobes they love on any budget. Specializing in capsule wardrobes, sustainable fashion & budget styling.`,
  );
  const [editingBio, setEditingBio] = useState(false);

  // ── Demographics state ──
  const [demographics, setDemographics] = useState<DemographicRow[]>([
    { label: "Female 25-34", pct: 42, color: "bg-editorial-red" },
    { label: "Female 18-24", pct: 28, color: "bg-editorial-red" },
    { label: "Male 25-34", pct: 14, color: "bg-editorial-blue" },
    { label: "Other", pct: 16, color: "bg-editorial-gold" },
  ]);
  const [editingDemo, setEditingDemo] = useState(false);
  const [newDemoLabel, setNewDemoLabel] = useState("");
  const [newDemoPct, setNewDemoPct] = useState("");
  const [newDemoColor, setNewDemoColor] = useState("bg-editorial-red");

  // ── Collaborations state ──
  const [collabs, setCollabs] = useState<CollabRow[]>([
    { brand: "Nike Running", detail: "3 Reels" },
    { brand: "Glossier", detail: "1 Post + Stories" },
    { brand: "Zara", detail: "UGC Campaign" },
    { brand: "Revolve", detail: "2 Reels" },
    { brand: "Sephora", detail: "Stories Series" },
  ]);
  const [editingCollabs, setEditingCollabs] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newDetail, setNewDetail] = useState("");

  // ── Sections (order + visibility) ──
  const [sections, setSections] = useState<Section[]>([
    { id: "profile", label: "Profile Header", visible: true },
    { id: "stats", label: "Key Stats", visible: true },
    { id: "demographics", label: "Audience Demographics", visible: true },
    { id: "collabs", label: "Past Collaborations", visible: true },
  ]);

  const toggleVisibility = useCallback((id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }, []);

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // ── Helpers ──
  function addDemographic() {
    if (!newDemoLabel.trim() || !newDemoPct) return;
    setDemographics([...demographics, { label: newDemoLabel.trim(), pct: Number(newDemoPct), color: newDemoColor }]);
    setNewDemoLabel("");
    setNewDemoPct("");
  }

  function addCollab() {
    if (!newBrand.trim()) return;
    setCollabs([...collabs, { brand: newBrand.trim(), detail: newDetail.trim() }]);
    setNewBrand("");
    setNewDetail("");
  }

  // ── Render individual sections ──

  function renderProfile() {
    return (
      <div className="text-center mb-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-rule bg-surface-raised mb-3">
          <span className="font-serif text-2xl font-bold text-ink-muted">{initial}</span>
        </div>
        <h4 className="font-serif text-xl font-bold text-ink">
          {profile?.full_name ?? "Your Name"}
        </h4>
        <p className="text-xs text-ink-muted mt-1">
          @{handle}
          {profile?.niche ? ` \u00B7 ${profile.niche}` : ""}
          {profile?.location ? ` \u00B7 ${profile.location}` : ""}
        </p>
        {editingBio ? (
          <div className="mt-3 max-w-md mx-auto">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted resize-y"
            />
            <button
              onClick={() => setEditingBio(false)}
              className="mt-1 bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <p
            onClick={() => setEditingBio(true)}
            className="text-sm text-ink-secondary mt-3 max-w-md mx-auto cursor-pointer hover:bg-surface-raised/50 px-2 py-1 transition-colors border border-transparent hover:border-rule"
            title="Click to edit"
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  function renderStats() {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {[
          { label: "Followers", value: formatCompact(totalFollowers) },
          { label: "Engagement", value: `${avgEngagement.toFixed(1)}%` },
          { label: "Avg. Reach", value: formatCompact(Math.round(totalFollowers * 0.31)) },
          { label: "Post Rate", value: `$${formatCompact(Math.round(totalFollowers * 0.01))}` },
        ].map((stat) => (
          <div key={stat.label} className="border border-rule p-3 text-center">
            <p className="editorial-overline mb-1">{stat.label}</p>
            <p className="font-serif text-xl font-bold text-editorial-red">{stat.value}</p>
          </div>
        ))}
      </div>
    );
  }

  function renderDemographics() {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="editorial-overline">Audience Demographics</p>
          <button
            onClick={() => setEditingDemo(!editingDemo)}
            className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
          >
            {editingDemo ? "Done" : "Edit"}
          </button>
        </div>
        <div className="space-y-3">
          {demographics.map((d, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
                <span>{d.label}</span>
                <div className="flex items-center gap-2">
                  <span>{d.pct}%</span>
                  {editingDemo && (
                    <button
                      onClick={() => setDemographics(demographics.filter((_, j) => j !== i))}
                      className="text-editorial-red hover:text-editorial-red/70"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        {editingDemo && (
          <div className="mt-3 flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-[9px] text-ink-muted uppercase block mb-0.5">Label</label>
              <input
                value={newDemoLabel}
                onChange={(e) => setNewDemoLabel(e.target.value)}
                placeholder="e.g. Male 18-24"
                className="border border-rule bg-surface-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink-muted w-32"
              />
            </div>
            <div>
              <label className="text-[9px] text-ink-muted uppercase block mb-0.5">%</label>
              <input
                type="number"
                value={newDemoPct}
                onChange={(e) => setNewDemoPct(e.target.value)}
                placeholder="0"
                min={0}
                max={100}
                className="border border-rule bg-surface-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink-muted w-16"
              />
            </div>
            <div>
              <label className="text-[9px] text-ink-muted uppercase block mb-0.5">Color</label>
              <select
                value={newDemoColor}
                onChange={(e) => setNewDemoColor(e.target.value)}
                className="border border-rule bg-surface-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink-muted"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addDemographic}
              className="inline-flex items-center gap-1 bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderCollabs() {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="editorial-overline">Past Collaborations</p>
          <button
            onClick={() => setEditingCollabs(!editingCollabs)}
            className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
          >
            {editingCollabs ? "Done" : "Edit"}
          </button>
        </div>
        <div className="space-y-0">
          {collabs.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-rule last:border-b-0">
              <span className="text-sm text-ink">{c.brand}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-muted font-mono">{c.detail}</span>
                {editingCollabs && (
                  <button
                    onClick={() => setCollabs(collabs.filter((_, j) => j !== i))}
                    className="text-editorial-red hover:text-editorial-red/70"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {editingCollabs && (
          <div className="mt-3 flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-[9px] text-ink-muted uppercase block mb-0.5">Brand</label>
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="e.g. Adidas"
                className="border border-rule bg-surface-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink-muted w-32"
              />
            </div>
            <div>
              <label className="text-[9px] text-ink-muted uppercase block mb-0.5">Detail</label>
              <input
                value={newDetail}
                onChange={(e) => setNewDetail(e.target.value)}
                placeholder="e.g. 2 Reels"
                className="border border-rule bg-surface-raised px-2 py-1 text-xs text-ink outline-none focus:border-ink-muted w-32"
              />
            </div>
            <button
              onClick={addCollab}
              className="inline-flex items-center gap-1 bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
            >
              <Plus size={10} /> Add
            </button>
          </div>
        )}
      </div>
    );
  }

  const renderMap: Record<string, () => React.ReactNode> = {
    profile: renderProfile,
    stats: renderStats,
    demographics: renderDemographics,
    collabs: renderCollabs,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h3 className="font-serif text-lg font-bold text-ink">Media Kit Editor</h3>
        <div className="flex items-center gap-2">
          <button className="border border-rule px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors">
            Preview
          </button>
          <button className="bg-ink px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors">
            Download PDF
          </button>
          <button className="bg-editorial-red px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-editorial-red/90 transition-colors">
            Share Link
          </button>
        </div>
      </div>

      {/* Public URL */}
      <div className="border border-rule bg-surface-raised p-4 mb-6">
        <p className="editorial-overline mb-1.5">Public Media Kit URL</p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {editingSlug ? (
            <div className="flex items-center gap-0 font-mono text-sm">
              <span className="text-ink-muted">govirall.app/mediakit/</span>
              <input
                autoFocus
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                className="border-b border-editorial-blue bg-transparent px-1 py-0.5 text-sm text-editorial-blue outline-none w-32"
                onKeyDown={(e) => e.key === "Enter" && setEditingSlug(false)}
              />
            </div>
          ) : (
            <span className="text-sm text-editorial-blue font-mono">{mediaKitUrl}</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 border border-rule px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors"
            >
              {copied ? <Check size={10} className="text-editorial-green" /> : <Copy size={10} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={() => setEditingSlug(!editingSlug)}
              className="border border-rule px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors"
            >
              {editingSlug ? "Save" : "Edit Slug"}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-ink-muted font-mono mt-2">
          148 views this month &middot; 23 unique brands viewed &middot; 4 contact requests
        </p>
      </div>

      {/* Section Controls */}
      <div className="border border-rule bg-surface-raised p-3 mb-4">
        <p className="editorial-overline mb-2">Sections &mdash; Reorder &amp; Toggle Visibility</p>
        <div className="space-y-1">
          {sections.map((section, idx) => (
            <div key={section.id} className="flex items-center gap-2 py-1.5 px-2 border border-rule bg-surface-card">
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                  className="text-ink-muted hover:text-ink disabled:opacity-20 transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === sections.length - 1}
                  className="text-ink-muted hover:text-ink disabled:opacity-20 transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <span className="text-xs font-semibold text-ink flex-1">{section.label}</span>
              <button
                onClick={() => toggleVisibility(section.id)}
                className={cn(
                  "transition-colors",
                  section.visible ? "text-editorial-green hover:text-editorial-green/70" : "text-ink-faint hover:text-ink-muted",
                )}
                title={section.visible ? "Visible on public page" : "Hidden from public page"}
              >
                {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Card — renders sections in order */}
      <div className="border border-rule p-8">
        {sections.map((section) => {
          const renderer = renderMap[section.id];
          if (!renderer) return null;

          return (
            <div
              key={section.id}
              className={cn(
                "relative transition-opacity",
                !section.visible && "opacity-25 pointer-events-none select-none",
              )}
            >
              {!section.visible && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <span className="bg-surface-card border border-rule px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                    Hidden
                  </span>
                </div>
              )}
              {renderer()}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-ink-muted text-center mt-4">
        Use controls above to reorder sections &middot; Click text to edit &middot; Toggle visibility with the eye icon
      </p>
    </div>
  );
}
