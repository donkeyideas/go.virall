"use client";

import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, GripVertical } from "lucide-react";
import { Handshake } from "lucide-react";
import type { ScheduledPost, SocialPlatform } from "@/types";
import { reschedulePost } from "@/lib/actions/publishing";

// ─── Deal Event Type ─────────────────────────────────────────────────────────

export interface DealEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  value: number | null;
  stage: string;
  logoUrl?: string | null;
  proposalId?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  paidAmount?: number | null;
  deliverablesCount?: number;
  completedDeliverables?: number;
}

// ─── Platform Colors ────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#00f2ea",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  threads: "#999999",
  pinterest: "#E60023",
  twitch: "#9146FF",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
  twitch: "Twitch",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  scheduled: "#3182CE",
  publishing: "#F59E0B",
  published: "#34D399",
  failed: "#EF4444",
  cancelled: "#9CA3AF",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContentCalendarProps {
  posts: ScheduledPost[];
  dealEvents?: DealEvent[];
  onDayClick: (date: Date) => void;
  onPostClick: (post: ScheduledPost) => void;
  onNewPost: (date: Date) => void;
  onDealClick?: (deal: DealEvent) => void;
}

type ViewMode = "month" | "week";

// ─── Component ──────────────────────────────────────────────────────────────

export function ContentCalendar({ posts, dealEvents = [], onDayClick, onPostClick, onNewPost, onDealClick }: ContentCalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Navigation
  const goToPrevMonth = useCallback(() => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }, [year, month]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }, [year, month]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(null);
  }, []);

  const goToPrevWeek = useCallback(() => {
    setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  }, [currentDate]);

  const goToNextWeek = useCallback(() => {
    setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  }, [currentDate]);

  // Get posts for a specific date
  function getPostsForDate(date: Date): ScheduledPost[] {
    return posts.filter((p) => {
      const postDate = new Date(p.scheduled_at);
      return isSameDay(postDate, date);
    });
  }

  // Get deal events that span a specific date
  function getDealsForDate(date: Date): DealEvent[] {
    return dealEvents.filter((d) => {
      const start = new Date(d.startDate);
      start.setHours(0, 0, 0, 0);
      const end = d.endDate ? new Date(d.endDate) : start;
      end.setHours(23, 59, 59, 999);
      const check = new Date(date);
      check.setHours(12, 0, 0, 0);
      return check >= start && check <= end;
    });
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, post: ScheduledPost) {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", post.id);
  }

  function handleDragOver(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  }

  function handleDragEnter(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    dragCounterRef.current++;
    setDragOverDate(dateStr);
  }

  function handleDragLeave() {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverDate(null);
    }
  }

  async function handleDrop(e: React.DragEvent, targetDate: Date) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragOverDate(null);

    if (!draggedPost) return;
    if (draggedPost.status === "published") return;

    // Preserve original time, just change the date
    const originalDate = new Date(draggedPost.scheduled_at);
    const newDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      originalDate.getHours(),
      originalDate.getMinutes(),
      originalDate.getSeconds(),
    );

    await reschedulePost(draggedPost.id, newDate.toISOString());
    setDraggedPost(null);
  }

  function handleDragEnd() {
    setDraggedPost(null);
    setDragOverDate(null);
    dragCounterRef.current = 0;
  }

  // Handle day selection
  function handleDayClick(date: Date) {
    setSelectedDay(date);
    onDayClick(date);
  }

  // ─── Build Calendar Grid ──────────────────────────────────────────────

  function renderMonthView() {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cells: { date: Date; inMonth: boolean }[] = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        inMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        inMonth: true,
      });
    }

    // Next month leading days (fill to complete the grid)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        date: new Date(year, month + 1, d),
        inMonth: false,
      });
    }

    // Only show 5 rows if the 6th row is all next-month days
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    const visibleRows = rows.filter((row) => row.some((c) => c.inMonth));

    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Day names header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
            flexShrink: 0,
          }}
        >
          {dayNames.map((name) => (
            <div
              key={name}
              style={{
                padding: "8px 4px",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {visibleRows.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1,
              minHeight: 0,
              borderBottom:
                rowIdx < visibleRows.length - 1
                  ? "1px solid rgba(var(--accent-rgb),0.06)"
                  : "none",
            }}
          >
            {row.map((cell) => {
              const isToday = isSameDay(cell.date, today);
              const isSelected = selectedDay ? isSameDay(cell.date, selectedDay) : false;
              const dayPosts = getPostsForDate(cell.date);
              const dateStr = cell.date.toISOString().slice(0, 10);
              const isDragOver = dragOverDate === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(cell.date)}
                  onDragOver={(e) => handleDragOver(e, dateStr)}
                  onDragEnter={(e) => handleDragEnter(e, dateStr)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cell.date)}
                  style={{
                    minHeight: 100,
                    padding: 6,
                    cursor: "pointer",
                    position: "relative",
                    background: isDragOver
                      ? "rgba(var(--accent-rgb),0.08)"
                      : isSelected
                        ? "rgba(var(--accent-rgb),0.06)"
                        : "transparent",
                    borderRight: "1px solid rgba(var(--accent-rgb),0.06)",
                    transition: "background 0.15s ease",
                    opacity: cell.inMonth ? 1 : 0.35,
                  }}
                >
                  {/* Day number */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: isToday ? 26 : "auto",
                        height: isToday ? 26 : "auto",
                        borderRadius: "50%",
                        background: isToday ? "var(--color-editorial-red)" : "transparent",
                        color: isToday
                          ? "#fff"
                          : cell.inMonth
                            ? "var(--color-ink)"
                            : "var(--color-ink-muted)",
                        fontSize: 12,
                        fontWeight: isToday ? 800 : 600,
                      }}
                    >
                      {cell.date.getDate()}
                    </span>

                    {cell.inMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewPost(cell.date);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: "transparent",
                          border: "none",
                          color: "var(--color-ink-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0.4,
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.opacity = "0.4";
                        }}
                        title="Create post"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  {/* Post dots/chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dayPosts.slice(0, 3).map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, post)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPostClick(post);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `${PLATFORM_COLORS[post.platform] || "#4B9CD3"}18`,
                          cursor: "grab",
                          transition: "transform 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--color-ink)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 80,
                          }}
                        >
                          {post.content.slice(0, 20)}
                          {post.content.length > 20 ? "..." : ""}
                        </span>
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "var(--color-ink-muted)",
                          paddingLeft: 6,
                        }}
                      >
                        +{dayPosts.length - 3} more
                      </span>
                    )}

                    {/* Deal event chips */}
                    {getDealsForDate(cell.date).map((deal) => (
                      <div
                        key={`deal-${deal.id}`}
                        onClick={(e) => { e.stopPropagation(); onDealClick?.(deal); }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(16,185,129,0.15)",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.25)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.15)"; }}
                      >
                        {deal.logoUrl ? (
                          <img
                            src={deal.logoUrl}
                            alt=""
                            style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <Handshake size={8} style={{ color: "#10B981", flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#10B981",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 80,
                          }}
                        >
                          {deal.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function renderWeekView() {
    // Get the start of the week (Sunday)
    const dayOfWeek = currentDate.getDay();
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      weekDays.push(d);
    }

    const weekLabel = `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

    return (
      <div>
        {/* Week header with override navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 0",
            gap: 16,
            marginBottom: 8,
          }}
        >
          <button
            onClick={goToPrevWeek}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-ink-secondary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
            {weekLabel}
          </span>
          <button
            onClick={goToNextWeek}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-ink-secondary)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Week grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 0,
          }}
        >
          {weekDays.map((date, idx) => {
            const isToday = isSameDay(date, today);
            const dayPosts = getPostsForDate(date);
            const dateStr = date.toISOString().slice(0, 10);
            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={dateStr}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragEnter={(e) => handleDragEnter(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
                style={{
                  minHeight: 280,
                  borderRight: idx < 6 ? "1px solid rgba(var(--accent-rgb),0.06)" : "none",
                  background: isDragOver ? "rgba(var(--accent-rgb),0.08)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Day header */}
                <div
                  style={{
                    padding: "8px 8px 4px",
                    borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--color-ink-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {dayNames[idx]}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: isToday ? 28 : "auto",
                        height: isToday ? 28 : "auto",
                        borderRadius: "50%",
                        background: isToday ? "var(--color-editorial-red)" : "transparent",
                        color: isToday ? "#fff" : "var(--color-ink)",
                        fontSize: 14,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <button
                    onClick={() => onNewPost(date)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: "rgba(var(--accent-rgb),0.08)",
                      border: "none",
                      color: "var(--color-ink-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Create post"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Posts list */}
                <div style={{ padding: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                  {dayPosts.map((post) => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, post)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onPostClick(post)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        background: `${PLATFORM_COLORS[post.platform] || "#4B9CD3"}12`,
                        borderLeft: `3px solid ${PLATFORM_COLORS[post.platform] || "#4B9CD3"}`,
                        cursor: "grab",
                        transition: "transform 0.1s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                        <GripVertical size={10} style={{ color: "var(--color-ink-muted)", flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {post.platform}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            color: "var(--color-ink-muted)",
                            marginLeft: "auto",
                          }}
                        >
                          {formatTime(post.scheduled_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--color-ink)",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          margin: 0,
                        }}
                      >
                        {post.content}
                      </p>
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 3,
                          fontSize: 8,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: `${STATUS_COLORS[post.status] || "#6B7280"}20`,
                          color: STATUS_COLORS[post.status] || "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {post.status}
                      </div>
                    </div>
                  ))}

                  {/* Deal events in week view */}
                  {getDealsForDate(date).map((deal) => (
                    <div
                      key={`deal-${deal.id}`}
                      onClick={() => onDealClick?.(deal)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        background: "rgba(16,185,129,0.12)",
                        borderLeft: "3px solid #10B981",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.22)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(16,185,129,0.12)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {deal.logoUrl ? (
                          <img src={deal.logoUrl} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <Handshake size={10} style={{ color: "#10B981", flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>
                          {deal.title}
                        </span>
                      </div>
                      {deal.value != null && (
                        <span style={{ fontSize: 10, color: "var(--color-ink-secondary)" }}>
                          ${deal.value.toLocaleString()}
                        </span>
                      )}
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 3,
                          marginLeft: deal.value != null ? 8 : 0,
                          fontSize: 8,
                          fontWeight: 700,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "rgba(16,185,129,0.2)",
                          color: "#10B981",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {deal.stage}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Side Panel (posts for selected day) ──────────────────────────────

  function renderSidePanel() {
    if (!selectedDay) return null;

    const dayPosts = getPostsForDate(selectedDay);
    const dayDeals = getDealsForDate(selectedDay);
    const dayLabel = selectedDay.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <div
        style={{
          width: 300,
          borderLeft: "1px solid rgba(var(--accent-rgb),0.12)",
          background: "var(--color-surface-card)",
          padding: 16,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            {dayLabel}
          </h3>
          <button
            onClick={() => setSelectedDay(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-ink-muted)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        <button
          onClick={() => onNewPost(selectedDay)}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            background: "rgba(var(--accent-rgb),0.08)",
            border: "1px dashed rgba(var(--accent-rgb),0.2)",
            color: "var(--color-editorial-blue)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={14} />
          New Post
        </button>

        {/* Deal events for selected day */}
        {dayDeals.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>
              Deals ({dayDeals.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {dayDeals.map((deal) => (
                <div
                  key={`side-deal-${deal.id}`}
                  onClick={() => onDealClick?.(deal)}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.15)",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.4)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.15)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {deal.logoUrl ? (
                      <img src={deal.logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <Handshake size={14} style={{ color: "#10B981", flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>{deal.title}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    {deal.value != null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)" }}>
                        ${deal.value.toLocaleString()}
                      </span>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(16,185,129,0.2)", color: "#10B981", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dayPosts.length === 0 && dayDeals.length === 0 ? (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-muted)",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            No posts scheduled for this day
          </p>
        ) : dayPosts.length === 0 ? null : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dayPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--color-surface-inset)",
                  border: "1px solid rgba(var(--accent-rgb),0.08)",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--accent-rgb),0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(var(--accent-rgb),0.08)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                    }}
                  >
                    {PLATFORM_LABELS[post.platform] || post.platform}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 10,
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    {formatTime(post.scheduled_at)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink)",
                    lineHeight: 1.4,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {post.content}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${STATUS_COLORS[post.status] || "#6B7280"}20`,
                      color: STATUS_COLORS[post.status] || "#6B7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {post.status}
                  </span>
                  {post.ai_optimized && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(var(--accent-rgb),0.12)",
                        color: "var(--color-editorial-blue)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Smart
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Legend ────────────────────────────────────────────────────────────

  function renderLegend() {
    const activePlatforms = [...new Set(posts.map((p) => p.platform))];
    if (activePlatforms.length === 0) return null;

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 0",
        }}
      >
        {activePlatforms.map((platform) => (
          <div
            key={platform}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: PLATFORM_COLORS[platform] || "#4B9CD3",
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink-secondary)",
              }}
            >
              {PLATFORM_LABELS[platform] || platform}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", gap: 0, height: "100%", fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Calendar Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
            flexShrink: 0,
          }}
        >
          {/* Left: navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={viewMode === "month" ? goToPrevMonth : goToPrevWeek}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--color-surface-inset)",
                border: "1px solid rgba(var(--accent-rgb),0.08)",
                color: "var(--color-ink-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
                minWidth: 180,
                textAlign: "center",
              }}
            >
              {monthName}
            </h2>
            <button
              onClick={viewMode === "month" ? goToNextMonth : goToNextWeek}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--color-surface-inset)",
                border: "1px solid rgba(var(--accent-rgb),0.08)",
                color: "var(--color-ink-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={goToToday}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                background: "rgba(var(--accent-rgb),0.08)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                color: "var(--color-editorial-blue)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                marginLeft: 4,
              }}
            >
              Today
            </button>
          </div>

          {/* Right: view toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
            }}
          >
            <button
              onClick={() => setViewMode("month")}
              style={{
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                background: viewMode === "month" ? "rgba(var(--accent-rgb),0.12)" : "transparent",
                color:
                  viewMode === "month"
                    ? "var(--color-editorial-blue)"
                    : "var(--color-ink-secondary)",
              }}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              style={{
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                borderLeft: "1px solid rgba(var(--accent-rgb),0.12)",
                cursor: "pointer",
                fontFamily: "inherit",
                background: viewMode === "week" ? "rgba(var(--accent-rgb),0.12)" : "transparent",
                color:
                  viewMode === "week"
                    ? "var(--color-editorial-blue)"
                    : "var(--color-ink-secondary)",
              }}
            >
              Week
            </button>
          </div>
        </div>

        {/* Calendar body */}
        <div style={{ background: "var(--color-surface-card)", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {viewMode === "month" ? renderMonthView() : renderWeekView()}
        </div>

        {/* Legend */}
        <div style={{ padding: "0 16px", flexShrink: 0 }}>{renderLegend()}</div>
      </div>

      {/* Side panel for selected day */}
      {viewMode === "month" && renderSidePanel()}
    </div>
  );
}
