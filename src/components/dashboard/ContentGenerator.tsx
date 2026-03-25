"use client";

import { useState, useTransition } from "react";
import { ProfileSelector } from "./ProfileSelector";
import {
  Play,
  Loader2,
  RefreshCw,
  Lightbulb,
  MessageSquare,
  Calendar,
  Video,
  LayoutGrid,
  User,
  Copy,
  Check,
} from "lucide-react";
import { generateContentAction } from "@/lib/actions/content";
import { cn } from "@/lib/utils";
import type { SocialProfile } from "@/types";
import type { ContentType } from "@/lib/ai/content-generator";

interface ContentGeneratorProps {
  profiles: SocialProfile[];
}

const CONTENT_TABS: {
  key: ContentType;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "post_ideas", label: "Post Ideas", icon: Lightbulb },
  { key: "captions", label: "Captions", icon: MessageSquare },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "scripts", label: "Scripts", icon: Video },
  { key: "carousels", label: "Carousels", icon: LayoutGrid },
  { key: "bio", label: "Bio", icon: User },
];

const TONES = [
  "Professional",
  "Casual",
  "Humorous",
  "Inspirational",
  "Educational",
  "Storytelling",
];

export function ContentGenerator({ profiles }: ContentGeneratorProps) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [activeTab, setActiveTab] = useState<ContentType>("post_ideas");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [count, setCount] = useState(5);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await generateContentAction(
        selectedId,
        activeTab,
        topic.trim(),
        tone,
        count,
      );
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setResultData(result.data);
      }
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">
          Add a social profile to use the Content Generator.
        </p>
      </div>
    );
  }

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setResultData(null);
        }}
      />

      <div className="mt-4 space-y-4">
        {/* Content type tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-rule">
          {CONTENT_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setResultData(null);
                }}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
                  activeTab === tab.key
                    ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                    : "text-ink-secondary hover:text-ink",
                )}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="border border-rule bg-surface-card p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Topic */}
            <div className="sm:col-span-3">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Topic / Theme
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Summer fashion trends, Productivity hacks, Healthy recipes..."
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-editorial-red focus:outline-none"
              />
            </div>

            {/* Tone */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-editorial-red focus:outline-none"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Count
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) =>
                  setCount(
                    Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                  )
                }
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-editorial-red focus:outline-none"
              />
            </div>

            {/* Generate button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={isPending || !selectedId}
                className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/90 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : resultData ? (
                  <>
                    <RefreshCw size={14} />
                    Regenerate
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        {/* Processing */}
        {isPending && (
          <div className="border border-rule bg-surface-card p-6">
            <div className="flex items-center gap-3">
              <Loader2
                size={20}
                className="animate-spin text-editorial-red"
              />
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  Generating Content
                </h3>
                <p className="text-[11px] text-ink-muted">
                  AI is crafting your{" "}
                  {CONTENT_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}
                  ...
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden bg-surface-raised">
              <div className="h-full animate-pulse bg-editorial-red/60 transition-all" style={{ width: "60%" }} />
            </div>
          </div>
        )}

        {/* Results */}
        {!isPending && resultData && (
          <ContentResults data={resultData} contentType={activeTab} />
        )}

        {/* Empty state */}
        {!isPending && !resultData && !error && (
          <div className="border border-rule bg-surface-card px-6 py-12 text-center">
            <p className="text-sm text-ink-secondary">
              Enter a topic and click Generate to create{" "}
              {CONTENT_TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Renderers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Repair truncated/malformed JSON: close unclosed strings,
 * remove trailing fragments, close unbalanced brackets/braces.
 */
function repairJSON(text: string): string {
  let s = text;

  // Fix unquoted hashtag values (AI drops opening quotes)
  // e.g., ["#tag1", #tag2", "#tag3"] → ["#tag1", "#tag2", "#tag3"]
  s = s.replace(/([,\[])(\s*)#([A-Za-z0-9_]+)"/g, '$1$2"#$3"');

  // Detect and close unclosed strings
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
  }
  if (inString) s += '"';

  // Remove trailing incomplete key-value pairs and commas
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"\s*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*"[^"]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*\[[^\]]*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  s = s.replace(/,\s*"[^"]*"\s*$/, "");
  s = s.replace(/,\s*$/, "");

  // Track nesting order with a stack, close in reverse
  const stack: string[] = [];
  inString = false;
  escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  while (stack.length > 0) s += stack.pop();
  return s;
}

function tryParse(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    if (v && typeof v === "object") return v as Record<string, unknown>;
    return null;
  } catch { return null; }
}

function tryParseJSON(text: string, expectedKey: string): Record<string, unknown> | null {
  // Strip think tags if present
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Direct parse
  const direct = tryParse(cleaned);
  if (direct) {
    if (Array.isArray(direct)) return { [expectedKey]: direct };
    // Normalize: if expected key missing, find first array
    if (!direct[expectedKey]) {
      for (const [key, value] of Object.entries(direct)) {
        if (Array.isArray(value) && value.length > 0) {
          return { ...direct, [expectedKey]: value };
        }
      }
    }
    return direct;
  }

  // Extract {...} or [...]
  const braceMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    const r = tryParse(braceMatch[1].trim());
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return r;
    }
  }
  const bracketMatch = cleaned.match(/(\[[\s\S]*\])/);
  if (bracketMatch) {
    const r = tryParse(bracketMatch[1].trim());
    if (r && Array.isArray(r)) return { [expectedKey]: r };
  }

  // Extract from code blocks
  const codeMatch =
    cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    cleaned.match(/```(?:json)?\s*([\s\S]*)```/);
  if (codeMatch) {
    const content = codeMatch[1].trim();
    const r = tryParse(content);
    if (r) {
      if (Array.isArray(r)) return { [expectedKey]: r };
      return r;
    }
    const r2 = tryParse(`{${content}}`);
    if (r2) return r2;
  }

  // Repair truncated JSON
  let raw = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
  const repairedDirect = repairJSON(raw);
  const rd = tryParse(repairedDirect);
  if (rd) {
    if (Array.isArray(rd)) return { [expectedKey]: rd };
    return rd;
  }
  if (!raw.startsWith("{") && !raw.startsWith("[")) raw = `{${raw}`;
  const repaired = repairJSON(raw);
  const r = tryParse(repaired);
  if (r) {
    if (Array.isArray(r)) return { [expectedKey]: r };
    return r;
  }

  return null;
}

function resolveData(
  data: Record<string, unknown>,
  expectedKey: string,
): Record<string, unknown> {
  console.log("[resolveData v2] expectedKey:", expectedKey, "dataKeys:", Object.keys(data));

  // Already has the expected key
  if (data[expectedKey] && (Array.isArray(data[expectedKey]) ? (data[expectedKey] as unknown[]).length > 0 : true)) {
    console.log("[resolveData v2] Found expected key directly");
    return data;
  }

  // Try to find any array value and remap it under the expected key
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && key !== "contentType" && key !== "topic" && key !== "tone") {
      console.log("[resolveData v2] Remapping array from key:", key, "→", expectedKey);
      return { ...data, [expectedKey]: value };
    }
  }

  // Try to parse the raw field
  if (typeof data.raw === "string") {
    console.log("[resolveData v2] Trying to parse raw field, length:", data.raw.length);
    // Strip think tags from raw too
    const cleaned = (data.raw as string).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const parsed = tryParseJSON(cleaned, expectedKey);
    if (parsed && parsed[expectedKey]) {
      console.log("[resolveData v2] Parsed raw field successfully");
      return { ...data, ...parsed };
    }
  }

  console.log("[resolveData v2] Could not resolve data for key:", expectedKey);
  return data;
}

/**
 * Bulletproof data extraction: tries every strategy to get an array
 * from the data, including parsing the `raw` field directly.
 */
function extractContent(data: Record<string, unknown>, expectedKey: string): Record<string, unknown> {
  // 1. Direct key exists with data
  const directVal = data[expectedKey];
  if (directVal && Array.isArray(directVal) && directVal.length > 0) {
    return data;
  }

  // 2. Find any non-metadata array in the data
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length > 0 && !["contentType", "topic", "tone"].includes(key)) {
      return { ...data, [expectedKey]: value };
    }
  }

  // 3. Parse the `raw` field (most common failure path)
  if (typeof data.raw === "string") {
    const rawStr = (data.raw as string).replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    // Helper to extract content from parsed object
    const extractFromParsed = (parsed: unknown): Record<string, unknown> | null => {
      if (!parsed || typeof parsed !== "object") return null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { ...data, [expectedKey]: parsed };
      }
      const obj = parsed as Record<string, unknown>;
      if (obj[expectedKey]) return { ...data, ...obj };
      for (const v of Object.values(obj)) {
        if (Array.isArray(v) && v.length > 0) {
          return { ...data, [expectedKey]: v };
        }
      }
      return null;
    };

    // 3a. Direct JSON.parse
    try {
      const result = extractFromParsed(JSON.parse(rawStr));
      if (result) return result;
    } catch { /* continue */ }

    // 3b. Repair truncated JSON then parse
    try {
      const repaired = repairJSON(rawStr);
      const result = extractFromParsed(JSON.parse(repaired));
      if (result) return result;
    } catch { /* continue */ }

    // 3c. Extract JSON object from text
    const braceMatch = rawStr.match(/(\{[\s\S]*\})/);
    if (braceMatch) {
      try {
        const result = extractFromParsed(JSON.parse(braceMatch[1]));
        if (result) return result;
      } catch { /* continue */ }
    }

    // 3d. Extract JSON array from text
    const bracketMatch = rawStr.match(/(\[[\s\S]*\])/);
    if (bracketMatch) {
      try {
        const result = extractFromParsed(JSON.parse(bracketMatch[1]));
        if (result) return result;
      } catch { /* continue */ }
    }

    // 3e. Repair extracted JSON (objects and arrays)
    if (braceMatch) {
      try {
        const repaired = repairJSON(braceMatch[1]);
        const result = extractFromParsed(JSON.parse(repaired));
        if (result) return result;
      } catch { /* continue */ }
    }
    if (bracketMatch) {
      try {
        const repaired = repairJSON(bracketMatch[1]);
        const result = extractFromParsed(JSON.parse(repaired));
        if (result) return result;
      } catch { /* continue */ }
    }
  }

  return data;
}

function ContentResults({
  data,
  contentType,
}: {
  data: Record<string, unknown>;
  contentType: ContentType;
}) {
  const keyMap: Record<ContentType, string> = {
    post_ideas: "ideas",
    captions: "captions",
    calendar: "calendar",
    scripts: "scripts",
    carousels: "carousels",
    bio: "bios",
  };
  const resolved = extractContent(data, keyMap[contentType]);

  switch (contentType) {
    case "post_ideas":
      return <PostIdeasResult data={resolved} />;
    case "captions":
      return <CaptionsResult data={resolved} />;
    case "calendar":
      return <CalendarResult data={resolved} />;
    case "scripts":
      return <ScriptsResult data={resolved} />;
    case "carousels":
      return <CarouselsResult data={resolved} />;
    case "bio":
      return <BioResult data={resolved} />;
    default:
      return <RawResult data={resolved} />;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1 border border-rule px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ---- Post Ideas ---- */
function PostIdeasResult({ data }: { data: Record<string, unknown> }) {
  const ideas = (data.ideas as Record<string, unknown>[]) ?? [];
  if (!ideas.length) return <RawResult data={data} />;

  function ideaToText(idea: Record<string, unknown>) {
    const hashtags = ((idea.hashtags as string[]) ?? []).join(" ");
    return `${idea.title}\n\nHook: ${idea.hook}\n\n${idea.angle}\n\nFormat: ${idea.format}\n${hashtags}`;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink">
        Generated Post Ideas
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {ideas.map((idea, i) => (
          <div
            key={i}
            className="border border-rule bg-surface-card p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h4 className="font-serif text-sm font-bold text-ink">
                {idea.title as string}
              </h4>
              <div className="flex shrink-0 items-center gap-1.5">
                <span
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-bold uppercase",
                    (idea.format as string) === "reel"
                      ? "bg-surface-raised text-editorial-red"
                      : (idea.format as string) === "carousel"
                        ? "bg-surface-raised text-editorial-gold"
                        : "bg-surface-raised text-ink-secondary",
                  )}
                >
                  {idea.format as string}
                </span>
                <CopyButton text={ideaToText(idea)} />
              </div>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-ink-secondary">
              <span className="font-semibold text-ink">Hook:</span>{" "}
              {idea.hook as string}
            </p>
            <p className="mb-3 text-xs text-ink-muted">
              {idea.angle as string}
            </p>
            {(idea.hashtags as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(idea.hashtags as string[]).map((tag, j) => (
                  <span
                    key={j}
                    className="bg-surface-raised px-1.5 py-0.5 text-[10px] text-ink-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Captions ---- */
function CaptionsResult({ data }: { data: Record<string, unknown> }) {
  const captions = (data.captions as Record<string, unknown>[]) ?? [];
  if (!captions.length) return <RawResult data={data} />;

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink">
        Generated Captions
      </h3>
      <div className="space-y-3">
        {captions.map((cap, i) => (
          <div
            key={i}
            className="border border-rule bg-surface-card p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <span className="bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-secondary">
                {cap.tone as string}
              </span>
              <CopyButton text={cap.text as string} />
            </div>
            <p className="mb-2 whitespace-pre-line text-sm leading-relaxed text-ink">
              {cap.text as string}
            </p>
            <p className="mb-3 text-xs font-medium text-editorial-red">
              {cap.callToAction as string}
            </p>
            {(cap.hashtags as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(cap.hashtags as string[]).map((tag, j) => (
                  <span
                    key={j}
                    className="bg-surface-raised px-1.5 py-0.5 text-[10px] text-ink-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Calendar ---- */
function CalendarResult({ data }: { data: Record<string, unknown> }) {
  const calendar = (data.calendar as Record<string, unknown>[]) ?? [];
  if (!calendar.length) return <RawResult data={data} />;

  const calendarText = calendar
    .map((d) => `${d.day} @ ${d.time} — [${d.contentType}] ${d.topic}\n  ${d.caption}`)
    .join("\n\n");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-ink">
          7-Day Content Calendar
        </h3>
        <CopyButton text={calendarText} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b-2 border-ink text-[10px] font-semibold uppercase tracking-widest text-ink-secondary">
              <th className="py-2 pr-3">Day</th>
              <th className="py-2 pr-3">Time</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Topic</th>
              <th className="py-2">Caption</th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((day, i) => (
              <tr key={i} className="border-b border-rule">
                <td className="py-2.5 pr-3 font-semibold text-ink">
                  {day.day as string}
                </td>
                <td className="py-2.5 pr-3 font-mono text-ink-secondary">
                  {day.time as string}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary">
                    {day.contentType as string}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-ink">
                  {day.topic as string}
                </td>
                <td className="py-2.5 text-ink-muted">
                  {day.caption as string}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Scripts ---- */
function ScriptsResult({ data }: { data: Record<string, unknown> }) {
  const scripts = (data.scripts as Record<string, unknown>[]) ?? [];
  if (!scripts.length) return <RawResult data={data} />;

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink">
        Generated Scripts
      </h3>
      <div className="space-y-4">
        {scripts.map((script, i) => (
          <div
            key={i}
            className="border border-rule bg-surface-card p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-serif text-sm font-bold text-ink">
                {script.title as string}
              </h4>
              <span className="bg-surface-raised px-2 py-0.5 text-[10px] font-mono text-ink-secondary">
                {script.duration as string}
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-editorial-red">
                  Hook
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-ink">
                  {script.hook as string}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                  Body
                </span>
                <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink-secondary">
                  {script.body as string}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-editorial-green">
                  CTA
                </span>
                <p className="mt-0.5 text-xs leading-relaxed text-ink">
                  {script.callToAction as string}
                </p>
              </div>
              {(script.visualNotes as string) && (
                <div className="mt-2 bg-surface-raised px-3 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    Visual Notes
                  </span>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">
                    {script.visualNotes as string}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <CopyButton
                text={`HOOK: ${script.hook}\n\n${script.body}\n\nCTA: ${script.callToAction}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Carousels ---- */
function CarouselsResult({ data }: { data: Record<string, unknown> }) {
  const carousels = (data.carousels as Record<string, unknown>[]) ?? [];
  if (!carousels.length) return <RawResult data={data} />;

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink">
        Generated Carousels
      </h3>
      <div className="space-y-4">
        {carousels.map((carousel, i) => {
          const slides = (carousel.slides as Record<string, unknown>[]) ?? [];
          const caption = carousel.caption as string | undefined;
          return (
            <div
              key={i}
              className="border border-rule bg-surface-card p-4"
            >
              <h4 className="mb-3 font-serif text-sm font-bold text-ink">
                {carousel.title as string}
              </h4>

              {/* Slides */}
              <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {slides.map((slide, j) => (
                  <div
                    key={j}
                    className="border border-rule bg-surface-cream p-3"
                  >
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                      Slide {String(slide.slideNumber)}
                    </div>
                    <p className="text-xs font-semibold text-ink">
                      {slide.headline as string}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">
                      {slide.body as string}
                    </p>
                  </div>
                ))}
              </div>

              {caption && (
                <div className="flex items-start justify-between gap-2 border-t border-rule pt-3">
                  <p className="text-xs text-ink-secondary">{caption}</p>
                  <CopyButton text={caption} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Bio ---- */
function BioResult({ data }: { data: Record<string, unknown> }) {
  const bios = (data.bios as Record<string, unknown>[]) ?? [];
  if (!bios.length) return <RawResult data={data} />;

  return (
    <div className="space-y-3">
      <h3 className="font-serif text-lg font-bold text-ink">
        Generated Bios
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {bios.map((bio, i) => (
          <div
            key={i}
            className="border border-rule bg-surface-card p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="bg-surface-raised px-2.5 py-0.5 text-[10px] font-semibold uppercase text-ink-secondary">
                {bio.style as string}
              </span>
              <CopyButton text={bio.text as string} />
            </div>
            <p className="mb-2 whitespace-pre-line text-sm leading-relaxed text-ink">
              {bio.text as string}
            </p>
            {(bio.keywords as string[])?.length > 0 && (
              <div className="flex flex-wrap gap-1 border-t border-rule pt-2">
                {(bio.keywords as string[]).map((kw, j) => (
                  <span
                    key={j}
                    className="bg-surface-raised px-1.5 py-0.5 text-[10px] text-ink-muted"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Fallback ---- */
function RawResult({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="border border-rule bg-surface-card p-4">
      <pre className="whitespace-pre-wrap text-xs text-ink-secondary">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
