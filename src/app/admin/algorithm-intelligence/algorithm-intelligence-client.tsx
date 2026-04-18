"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Loader2,
  Play,
  Send,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  PLATFORM_ALGORITHMS,
  type PlatformAlgorithm,
} from "@/lib/ai/platform-algorithms";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import {
  runAlgorithmAnalysis,
  resolveAlgorithmEvent,
  updateAdjustmentStatus,
} from "@/lib/actions/algorithm-monitor";
import { generateAlgorithmDeepDive } from "@/lib/actions/algorithm-intelligence";
import type {
  PlatformHealth,
  AlgorithmEvent,
  AlgorithmAdjustment,
  EngagementTrend,
} from "@/lib/dal/algorithm-monitor";
import type { SocialPlatform } from "@/types";

/* ═══════════════════════════ Constants ═══════════════════════════ */

const TABS = [
  "Algorithm Intelligence",
  "Platform Comparison",
  "AI Deep Dive",
  "Engagement Trends",
  "Change Detection",
] as const;

type Tab = (typeof TABS)[number];

const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#1D9BF0",
  linkedin: "#0A66C2",
  threads: "#000000",
  pinterest: "#E60023",
  twitch: "#9146FF",
};

function platformLabel(p: string): string {
  const map: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    threads: "Threads",
    pinterest: "Pinterest",
    twitch: "Twitch",
  };
  return map[p] ?? p;
}

function severityColor(s: string): string {
  switch (s) {
    case "critical":
      return "text-red-400 bg-red-400/10";
    case "high":
      return "text-orange-400 bg-orange-400/10";
    case "medium":
      return "text-yellow-400 bg-yellow-400/10";
    default:
      return "text-green-400 bg-green-400/10";
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    detected: "text-yellow-400 bg-yellow-400/10",
    analyzing: "text-blue-400 bg-blue-400/10",
    confirmed: "text-red-400 bg-red-400/10",
    resolved: "text-green-400 bg-green-400/10",
    false_positive: "text-ink-muted bg-surface-raised",
    suggested: "text-yellow-400 bg-yellow-400/10",
    approved: "text-blue-400 bg-blue-400/10",
    applied: "text-green-400 bg-green-400/10",
    rejected: "text-red-400 bg-red-400/10",
  };

  if (status === "applied") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-green-400">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
        LIVE
      </span>
    );
  }

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${styles[status] ?? "text-ink-muted"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const DEEP_DIVE_TOPICS = [
  "Explain the primary ranking signal in detail — how does it work behind the scenes?",
  "How should creators optimize content formats for maximum reach on this platform?",
  "What changed in the algorithm from 2025 to 2026?",
  "Give me a detailed tactical playbook for growing on this platform",
  "How does this algorithm affect different niches (e.g., fitness, tech, beauty)?",
  "What are the most common mistakes creators make on this platform?",
];

/* ═══════════════════════════ Props ═══════════════════════════ */

interface Props {
  health: PlatformHealth[];
  events: AlgorithmEvent[];
  adjustments: AlgorithmAdjustment[];
  trends: EngagementTrend[];
}

/* ═══════════════════════════ Main Component ═══════════════════════════ */

export function AlgorithmIntelligenceClient({
  health,
  events: initialEvents,
  adjustments: initialAdjustments,
  trends,
}: Props) {
  const [tab, setTab] = useState<Tab>("Algorithm Intelligence");
  const [events, setEvents] = useState(initialEvents);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [isPending, startTransition] = useTransition();
  const [analyzingAll, setAnalyzingAll] = useState(false);

  const handleAnalyzeAll = () => {
    setAnalyzingAll(true);
    startTransition(async () => {
      const platforms = health
        .filter((h) => h.totalProfiles > 0)
        .map((h) => h.platform);
      for (const p of platforms) {
        await runAlgorithmAnalysis(p);
      }
      setAnalyzingAll(false);
      window.location.reload();
    });
  };

  const handleResolveEvent = (
    eventId: string,
    status: "resolved" | "false_positive",
  ) => {
    startTransition(async () => {
      await resolveAlgorithmEvent(eventId, status);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, status, resolved_at: new Date().toISOString() }
            : e,
        ),
      );
    });
  };

  const handleAdjustmentAction = (
    id: string,
    status: "approved" | "applied" | "rejected",
  ) => {
    startTransition(async () => {
      await updateAdjustmentStatus(id, status);
      setAdjustments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    });
  };

  // Health strip KPIs
  const totalProfiles = health.reduce((s, h) => s + h.totalProfiles, 0);
  const totalSynced = health.reduce((s, h) => s + h.syncedLast24h, 0);
  const syncRate =
    totalProfiles > 0 ? Math.round((totalSynced / totalProfiles) * 100) : 100;
  const activeEvents = events.filter(
    (e) => e.status !== "resolved" && e.status !== "false_positive",
  ).length;

  return (
    <div>
      <h1
        className="text-2xl font-bold tracking-tight"
        style={{ color: "var(--color-ink)" }}
      >
        Algorithm Intelligence
      </h1>
      <p
        className="mb-5 text-sm"
        style={{ color: "var(--color-ink-muted)" }}
      >
        How each platform&apos;s algorithm works and what it rewards in 2026.
      </p>

      {/* ── Health Strip ── */}
      <div
        className="mb-5 grid grid-cols-4 gap-3 rounded-lg border p-3"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-rule)",
        }}
      >
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Connected Profiles
          </p>
          <p
            className="text-xl font-bold"
            style={{ color: "var(--color-ink)" }}
          >
            {totalProfiles}
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-ink-muted)" }}
          >
            24h Sync Rate
          </p>
          <p
            className={`text-xl font-bold ${syncRate >= 80 ? "text-green-400" : syncRate >= 50 ? "text-yellow-400" : "text-red-400"}`}
          >
            {syncRate}%
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Active Events
          </p>
          <p
            className={`text-xl font-bold ${activeEvents > 0 ? "text-yellow-400" : "text-green-400"}`}
          >
            {activeEvents}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <button
            onClick={handleAnalyzeAll}
            disabled={isPending || analyzingAll}
            className="flex items-center gap-2 rounded-md px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--color-editorial-gold), #e67e22)",
              color: "#fff",
            }}
          >
            {analyzingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {analyzingAll ? "Analyzing..." : "Analyze All"}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all"
            style={{
              background:
                tab === t
                  ? "var(--color-editorial-gold)"
                  : "var(--color-surface-raised)",
              color: tab === t ? "#fff" : "var(--color-ink-secondary)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {tab === "Algorithm Intelligence" && (
        <AlgorithmCardsTab onDeepDive={(p) => {
          setTab("AI Deep Dive");
          // The deep dive tab will pick up the platform
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("deep-dive-platform", { detail: p }),
            );
          }, 100);
        }} />
      )}
      {tab === "Platform Comparison" && <ComparisonTab />}
      {tab === "AI Deep Dive" && <DeepDiveTab />}
      {tab === "Engagement Trends" && <EngagementTrendsTab trends={trends} />}
      {tab === "Change Detection" && (
        <ChangeDetectionTab
          events={events}
          adjustments={adjustments}
          onResolve={handleResolveEvent}
          onAdjustmentAction={handleAdjustmentAction}
          isPending={isPending}
        />
      )}
    </div>
  );
}

/* ═══════════════════ Tab 1: Algorithm Intelligence Cards ═══════════════════ */

function AlgorithmCardsTab({
  onDeepDive,
}: {
  onDeepDive: (platform: SocialPlatform) => void;
}) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const allExpanded = expandedCards.size === ALL_PLATFORMS.length;

  const toggleCard = (p: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set(ALL_PLATFORMS));
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-ink-secondary)",
          }}
        >
          {allExpanded ? (
            <ChevronsUp size={12} />
          ) : (
            <ChevronsDown size={12} />
          )}
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {ALL_PLATFORMS.map((platform) => {
          const algo = PLATFORM_ALGORITHMS[platform];
          const expanded = expandedCards.has(platform);

          return (
            <div
              key={platform}
              className="overflow-hidden rounded-lg border"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-rule)",
                borderLeft: `3px solid ${PLATFORM_COLORS[platform]}`,
              }}
            >
              {/* Header — always visible */}
              <button
                onClick={() => toggleCard(platform)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:opacity-90"
              >
                <span style={{ color: PLATFORM_COLORS[platform] }}>
                  <PlatformIcon platform={platform} size={24} />
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {platformLabel(platform)}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    background: "var(--color-editorial-gold)",
                    color: "#fff",
                  }}
                >
                  {algo.algoName}
                </span>
                <span className="ml-auto" style={{ color: "var(--color-ink-muted)" }}>
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              </button>

              {/* Primary signal — always visible */}
              <div
                className="mx-4 mb-3 rounded px-3 py-2 text-xs"
                style={{
                  background: "var(--color-surface-raised)",
                  color: "var(--color-ink-secondary)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  Primary Signal:{" "}
                </span>
                {algo.primarySignal}
              </div>

              {/* Expanded details */}
              {expanded && (
                <div
                  className="space-y-4 border-t px-4 py-4"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  {/* Ranking Factors */}
                  <div>
                    <p
                      className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      Ranking Factors
                    </p>
                    <ol className="space-y-1">
                      {algo.rankingFactors.map((factor, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: "var(--color-ink-secondary)" }}
                        >
                          <span
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                            style={{
                              background:
                                i === 0
                                  ? "var(--color-editorial-gold)"
                                  : "var(--color-surface-raised)",
                              color: i === 0 ? "#fff" : "var(--color-ink-muted)",
                            }}
                          >
                            {i + 1}
                          </span>
                          {factor}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Formats + Cadence — two columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p
                        className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-ink-muted)" }}
                      >
                        Best Formats
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {algo.contentFormats.map((f) => (
                          <span
                            key={f}
                            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: "var(--color-surface-raised)",
                              color: "var(--color-ink-secondary)",
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p
                        className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-ink-muted)" }}
                      >
                        Posting Cadence
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-ink-secondary)" }}
                      >
                        {algo.postingCadence}
                      </p>
                    </div>
                  </div>

                  {/* Key Tactics */}
                  <div>
                    <p
                      className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      Key Tactics
                    </p>
                    <ul className="space-y-1.5">
                      {algo.keyTactics.map((t, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: "var(--color-ink-secondary)" }}
                        >
                          <Check
                            size={12}
                            className="mt-0.5 shrink-0 text-green-400"
                          />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Avoidances */}
                  <div>
                    <p
                      className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      Avoid
                    </p>
                    <ul className="space-y-1.5">
                      {algo.avoidances.map((a, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: "var(--color-ink-secondary)" }}
                        >
                          <X
                            size={12}
                            className="mt-0.5 shrink-0 text-red-400"
                          />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Deep Dive button */}
                  <button
                    onClick={() => onDeepDive(platform)}
                    className="flex items-center gap-2 rounded-md px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-90"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-editorial-gold), #e67e22)",
                      color: "#fff",
                    }}
                  >
                    <Zap size={12} />
                    AI Deep Dive
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ Tab 2: Platform Comparison ═══════════════════ */

function ComparisonTab() {
  const [selected, setSelected] = useState<SocialPlatform[]>([
    "instagram",
    "tiktok",
  ]);

  const togglePlatform = (p: SocialPlatform) => {
    setSelected((prev) => {
      if (prev.includes(p)) {
        if (prev.length <= 2) return prev; // minimum 2
        return prev.filter((x) => x !== p);
      }
      if (prev.length >= 4) return prev; // maximum 4
      return [...prev, p];
    });
  };

  return (
    <div>
      {/* Platform selectors */}
      <div className="mb-5 flex flex-wrap gap-2">
        {ALL_PLATFORMS.map((p) => {
          const isSelected = selected.includes(p);
          return (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: isSelected
                  ? PLATFORM_COLORS[p]
                  : "var(--color-surface-raised)",
                color: isSelected ? "#fff" : "var(--color-ink-secondary)",
                opacity: isSelected ? 1 : 0.7,
              }}
            >
              <PlatformIcon platform={p} size={14} />
              {platformLabel(p)}
            </button>
          );
        })}
        <span
          className="flex items-center text-[10px]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Select 2-4 platforms
        </span>
      </div>

      {/* Comparison table */}
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className="border-b"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-surface-raised)",
              }}
            >
              <th
                className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Attribute
              </th>
              {selected.map((p) => (
                <th key={p} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: PLATFORM_COLORS[p] }}>
                      <PlatformIcon platform={p} size={16} />
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {platformLabel(p)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows(selected).map((row) => (
              <tr
                key={row.label}
                className="border-b"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td
                  className="whitespace-nowrap px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  {row.label}
                </td>
                {row.values.map((val, i) => (
                  <td
                    key={i}
                    className="px-4 py-2.5 text-xs"
                    style={{ color: "var(--color-ink-secondary)" }}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function comparisonRows(platforms: SocialPlatform[]) {
  const algos = platforms.map((p) => PLATFORM_ALGORITHMS[p]);
  return [
    {
      label: "Algorithm Name",
      values: algos.map((a) => a.algoName),
    },
    {
      label: "Primary Signal",
      values: algos.map((a) => a.primarySignal),
    },
    {
      label: "#1 Ranking Factor",
      values: algos.map((a) => a.rankingFactors[0] ?? "—"),
    },
    {
      label: "#2 Ranking Factor",
      values: algos.map((a) => a.rankingFactors[1] ?? "—"),
    },
    {
      label: "#3 Ranking Factor",
      values: algos.map((a) => a.rankingFactors[2] ?? "—"),
    },
    {
      label: "Top Format",
      values: algos.map((a) => a.contentFormats[0] ?? "—"),
    },
    {
      label: "All Formats",
      values: algos.map((a) => a.contentFormats.join(", ")),
    },
    {
      label: "Posting Cadence",
      values: algos.map((a) => a.postingCadence),
    },
    {
      label: "Key Tactic #1",
      values: algos.map((a) => a.keyTactics[0] ?? "—"),
    },
    {
      label: "Key Tactic #2",
      values: algos.map((a) => a.keyTactics[1] ?? "—"),
    },
    {
      label: "Avoid #1",
      values: algos.map((a) => a.avoidances[0] ?? "—"),
    },
    {
      label: "Avoid #2",
      values: algos.map((a) => a.avoidances[1] ?? "—"),
    },
  ];
}

/* ═══════════════════ Tab 3: AI Deep Dive ═══════════════════ */

function DeepDiveTab() {
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [topic, setTopic] = useState(DEEP_DIVE_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [history, setHistory] = useState<
    {
      platform: SocialPlatform;
      topic: string;
      text: string;
      provider: string;
    }[]
  >([]);

  const handleGenerate = () => {
    const activeTopic = isCustom ? customTopic : topic;
    if (!activeTopic.trim()) return;

    startTransition(async () => {
      const result = await generateAlgorithmDeepDive(platform, activeTopic);
      if (result.success && result.text) {
        setHistory((prev) => [
          {
            platform,
            topic: activeTopic,
            text: result.text,
            provider: result.provider ?? "AI",
          },
          ...prev,
        ]);
      }
    });
  };

  // Listen for platform selection from Tab 1 deep dive buttons
  useState(() => {
    const handler = (e: Event) => {
      const p = (e as CustomEvent).detail as SocialPlatform;
      if (p) setPlatform(p);
    };
    window.addEventListener("deep-dive-platform", handler);
    return () => window.removeEventListener("deep-dive-platform", handler);
  });

  return (
    <div className="space-y-5">
      {/* Platform selector */}
      <div className="flex flex-wrap gap-2">
        {ALL_PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all"
            style={{
              background:
                platform === p
                  ? PLATFORM_COLORS[p]
                  : "var(--color-surface-raised)",
              color: platform === p ? "#fff" : "var(--color-ink-secondary)",
            }}
          >
            <PlatformIcon platform={p} size={14} />
            {platformLabel(p)}
          </button>
        ))}
      </div>

      {/* Topic selector */}
      <div
        className="rounded-lg border p-4"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-rule)",
        }}
      >
        <p
          className="mb-3 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Select a Topic
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {DEEP_DIVE_TOPICS.map((t, i) => (
            <button
              key={i}
              onClick={() => {
                setTopic(t);
                setIsCustom(false);
              }}
              className="rounded px-3 py-1.5 text-xs transition-all"
              style={{
                background:
                  !isCustom && topic === t
                    ? "var(--color-editorial-gold)"
                    : "var(--color-surface-raised)",
                color:
                  !isCustom && topic === t
                    ? "#fff"
                    : "var(--color-ink-secondary)",
              }}
            >
              {t.length > 60 ? t.slice(0, 57) + "..." : t}
            </button>
          ))}
          <button
            onClick={() => setIsCustom(true)}
            className="rounded px-3 py-1.5 text-xs transition-all"
            style={{
              background: isCustom
                ? "var(--color-editorial-gold)"
                : "var(--color-surface-raised)",
              color: isCustom ? "#fff" : "var(--color-ink-secondary)",
            }}
          >
            Custom Question
          </button>
        </div>

        {isCustom && (
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="Ask anything about this platform's algorithm..."
            className="mb-3 w-full rounded-md border px-3 py-2 text-sm"
            style={{
              background: "var(--color-surface-raised)",
              borderColor: "var(--color-rule)",
              color: "var(--color-ink)",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
          />
        )}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2 rounded-md px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all hover:opacity-90 disabled:opacity-50"
          style={{
            background:
              "linear-gradient(135deg, var(--color-editorial-gold), #e67e22)",
            color: "#fff",
          }}
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {isPending ? "Generating..." : "Generate Analysis"}
        </button>
      </div>

      {/* Results */}
      {history.length > 0 && (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border p-4"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-rule)",
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span style={{ color: PLATFORM_COLORS[item.platform] }}>
                  <PlatformIcon platform={item.platform} size={18} />
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {platformLabel(item.platform)}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                  style={{
                    background: "var(--color-surface-raised)",
                    color: "var(--color-ink-muted)",
                  }}
                >
                  via {item.provider}
                </span>
              </div>
              <p
                className="mb-2 text-xs font-semibold"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {item.topic}
              </p>
              <div
                className="whitespace-pre-wrap text-sm leading-relaxed"
                style={{ color: "var(--color-ink-secondary)" }}
              >
                {item.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && !isPending && (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-rule)",
            color: "var(--color-ink-muted)",
          }}
        >
          Select a platform and topic, then click Generate Analysis to get
          AI-powered algorithm intelligence.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Tab 4: Engagement Trends ═══════════════════ */

function EngagementTrendsTab({ trends }: { trends: EngagementTrend[] }) {
  const platforms = [...new Set(trends.map((t) => t.platform))];

  const dateMap: Record<string, Record<string, number>> = {};
  for (const t of trends) {
    if (!dateMap[t.date]) dateMap[t.date] = {};
    dateMap[t.date][t.platform] = t.avgEngagement;
  }
  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: date.slice(5), ...vals }));

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center text-sm"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-rule)",
          color: "var(--color-ink-muted)",
        }}
      >
        No engagement data yet. Sync profiles to start collecting trends.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg border p-4"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-rule)",
        }}
      >
        <h3
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          Engagement Rate by Platform (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value).toFixed(2)}%`]}
            />
            {platforms.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                name={platformLabel(p)}
                stroke={PLATFORM_COLORS[p] ?? "#666"}
                fill={PLATFORM_COLORS[p] ?? "#666"}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-3 flex flex-wrap gap-4">
          {platforms.map((p) => (
            <div key={p} className="flex items-center gap-1.5 text-xs">
              <span style={{ color: PLATFORM_COLORS[p] ?? "#666" }}>
                <PlatformIcon platform={p as SocialPlatform} size={14} />
              </span>
              <span style={{ color: "var(--color-ink-secondary)" }}>
                {platformLabel(p)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* WoW comparison cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platforms.map((p) => {
          const pTrends = trends
            .filter((t) => t.platform === p)
            .sort((a, b) => a.date.localeCompare(b.date));
          const last7 = pTrends.slice(-7);
          const prev7 = pTrends.slice(-14, -7);
          const lastAvg =
            last7.reduce((s, t) => s + t.avgEngagement, 0) /
            (last7.length || 1);
          const prevAvg =
            prev7.reduce((s, t) => s + t.avgEngagement, 0) /
            (prev7.length || 1);
          const change =
            prevAvg > 0 ? ((lastAvg - prevAvg) / prevAvg) * 100 : 0;

          return (
            <div
              key={p}
              className="rounded-lg border p-4"
              style={{
                background: "var(--color-surface-card)",
                borderColor: "var(--color-rule)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: PLATFORM_COLORS[p] ?? "#666" }}>
                  <PlatformIcon platform={p as SocialPlatform} size={14} />
                </span>
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-ink-secondary)" }}
                >
                  {platformLabel(p)}
                </p>
              </div>
              <p
                className="mt-1 text-xl font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                {lastAvg.toFixed(2)}%
              </p>
              <p
                className={`text-xs font-semibold ${change >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(1)}% WoW
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ Tab 5: Change Detection ═══════════════════ */

function ChangeDetectionTab({
  events,
  adjustments,
  onResolve,
  onAdjustmentAction,
  isPending,
}: {
  events: AlgorithmEvent[];
  adjustments: AlgorithmAdjustment[];
  onResolve: (id: string, status: "resolved" | "false_positive") => void;
  onAdjustmentAction: (
    id: string,
    status: "approved" | "applied" | "rejected",
  ) => void;
  isPending: boolean;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? events
      : events.filter((e) => e.platform === filter);

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...ALL_PLATFORMS].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all"
            style={{
              background:
                filter === f
                  ? "var(--color-editorial-gold)"
                  : "var(--color-surface-raised)",
              color: filter === f ? "#fff" : "var(--color-ink-secondary)",
            }}
          >
            {f === "all" ? "All" : platformLabel(f)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-rule)",
            color: "var(--color-ink-muted)",
          }}
        >
          No algorithm change events detected yet. Use Analyze All to scan all
          platforms, or wait for the daily automated check.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const eventAdjustments = adjustments.filter(
              (a) => a.event_id === e.id,
            );
            const isExpanded = expandedEvent === e.id;

            return (
              <div
                key={e.id}
                className="rounded-lg border"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-rule)",
                }}
              >
                {/* Event header */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  onClick={() =>
                    setExpandedEvent((prev) =>
                      prev === e.id ? null : e.id,
                    )
                  }
                >
                  {isExpanded ? (
                    <ChevronDown
                      size={14}
                      style={{ color: "var(--color-ink-muted)" }}
                    />
                  ) : (
                    <ChevronRight
                      size={14}
                      style={{ color: "var(--color-ink-muted)" }}
                    />
                  )}
                  <span style={{ color: PLATFORM_COLORS[e.platform] ?? "#666" }}>
                    <PlatformIcon
                      platform={e.platform as SocialPlatform}
                      size={16}
                    />
                  </span>
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {e.title}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor(e.severity)}`}
                  >
                    {e.severity}
                  </span>
                  {statusBadge(e.status)}
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    {timeAgo(e.created_at)}
                  </span>
                </div>

                {/* Expanded: event details + linked adjustments */}
                {isExpanded && (
                  <div
                    className="border-t px-4 py-3"
                    style={{ borderColor: "var(--color-rule)" }}
                  >
                    {e.description && (
                      <p
                        className="mb-2 text-sm"
                        style={{ color: "var(--color-ink-secondary)" }}
                      >
                        {e.description}
                      </p>
                    )}
                    {e.ai_analysis && (
                      <div className="mb-3">
                        <p
                          className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          AI Analysis
                        </p>
                        <pre
                          className="max-h-60 overflow-auto rounded p-3 text-xs"
                          style={{
                            background: "var(--color-surface-raised)",
                            color: "var(--color-ink-secondary)",
                          }}
                        >
                          {e.ai_analysis}
                        </pre>
                      </div>
                    )}

                    {/* Actions for unresolved events */}
                    {e.status !== "resolved" &&
                      e.status !== "false_positive" && (
                        <div className="mb-3 flex gap-2">
                          <button
                            onClick={() => onResolve(e.id, "resolved")}
                            disabled={isPending}
                            className="flex items-center gap-1 rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-green-400 transition-colors"
                            style={{ background: "rgba(74,222,128,0.1)" }}
                          >
                            <CheckCircle size={10} /> Resolve
                          </button>
                          <button
                            onClick={() => onResolve(e.id, "false_positive")}
                            disabled={isPending}
                            className="flex items-center gap-1 rounded px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-muted transition-colors"
                            style={{
                              background: "var(--color-surface-raised)",
                            }}
                          >
                            <XCircle size={10} /> False Positive
                          </button>
                        </div>
                      )}

                    {/* Linked adjustments */}
                    {eventAdjustments.length > 0 && (
                      <div>
                        <p
                          className="mb-2 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          Suggested Adjustments
                        </p>
                        <div className="space-y-2">
                          {eventAdjustments.map((a) => (
                            <div
                              key={a.id}
                              className="rounded border p-3"
                              style={{
                                borderColor: "var(--color-rule)",
                                background: "var(--color-surface-raised)",
                              }}
                            >
                              <div className="mb-2 flex items-center gap-2">
                                <span
                                  className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                                  style={{
                                    background: "var(--color-surface-card)",
                                    color: "var(--color-ink-secondary)",
                                  }}
                                >
                                  {a.adjustment_type.replace(/_/g, " ")}
                                </span>
                                {statusBadge(a.status)}
                              </div>

                              <div className="mb-2 grid grid-cols-2 gap-2">
                                <div>
                                  <p
                                    className="mb-1 text-[9px] font-bold uppercase tracking-widest"
                                    style={{ color: "var(--color-ink-muted)" }}
                                  >
                                    Current
                                  </p>
                                  <pre
                                    className="text-[11px]"
                                    style={{
                                      color: "var(--color-ink-secondary)",
                                    }}
                                  >
                                    {JSON.stringify(a.current_value, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-green-400">
                                    Suggested
                                  </p>
                                  <pre
                                    className="text-[11px]"
                                    style={{
                                      color: "var(--color-ink-secondary)",
                                    }}
                                  >
                                    {JSON.stringify(
                                      a.suggested_value,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              </div>

                              {a.ai_reasoning && (
                                <p
                                  className="mb-2 text-xs"
                                  style={{
                                    color: "var(--color-ink-secondary)",
                                  }}
                                >
                                  {a.ai_reasoning}
                                </p>
                              )}

                              {a.status === "suggested" && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      onAdjustmentAction(a.id, "approved")
                                    }
                                    disabled={isPending}
                                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-green-400"
                                    style={{
                                      background: "rgba(74,222,128,0.1)",
                                    }}
                                  >
                                    <CheckCircle size={10} /> Approve
                                  </button>
                                  <button
                                    onClick={() =>
                                      onAdjustmentAction(a.id, "applied")
                                    }
                                    disabled={isPending}
                                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                                    style={{
                                      background:
                                        "var(--color-editorial-gold)",
                                      color: "#fff",
                                    }}
                                  >
                                    <Play size={10} /> Apply
                                  </button>
                                  <button
                                    onClick={() =>
                                      onAdjustmentAction(a.id, "rejected")
                                    }
                                    disabled={isPending}
                                    className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-red-400"
                                    style={{
                                      background: "rgba(239,68,68,0.1)",
                                    }}
                                  >
                                    <XCircle size={10} /> Reject
                                  </button>
                                </div>
                              )}
                              {a.status === "approved" && (
                                <button
                                  onClick={() =>
                                    onAdjustmentAction(a.id, "applied")
                                  }
                                  disabled={isPending}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-widest"
                                  style={{
                                    background: "var(--color-editorial-gold)",
                                    color: "#fff",
                                  }}
                                >
                                  <Play size={10} /> Apply Now
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
