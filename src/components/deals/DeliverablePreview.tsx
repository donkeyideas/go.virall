"use client";

import { ExternalLink } from "lucide-react";
import type { OEmbedData } from "@/types";
import { PLATFORM_DISPLAY } from "@/lib/oembed";

interface Props {
  url: string;
  platform: string | null;
  oembedData: OEmbedData | null;
}

export function DeliverablePreview({ url, platform, oembedData }: Props) {
  const platformInfo = platform ? PLATFORM_DISPLAY[platform] : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: 12,
        padding: 10,
        background: "var(--color-surface-card)",
        border: "1px solid rgba(75,156,211,0.12)",
        borderRadius: 10,
        textDecoration: "none",
        marginBottom: 10,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      {/* Thumbnail */}
      {oembedData?.thumbnail_url && (
        <div
          style={{
            width: 72,
            height: 54,
            borderRadius: 6,
            overflow: "hidden",
            flexShrink: 0,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <img
            src={oembedData.thumbnail_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {oembedData?.title ? (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 3,
            }}
          >
            {oembedData.title}
          </div>
        ) : null}

        {oembedData?.author_name && (
          <div style={{ fontSize: 10, color: "var(--color-ink-secondary)", marginBottom: 3 }}>
            {oembedData.author_name}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {platformInfo && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: platformInfo.color,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {platformInfo.label}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: "rgba(75,156,211,0.7)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {new URL(url).hostname}
          </span>
          <ExternalLink size={9} style={{ color: "rgba(75,156,211,0.5)", flexShrink: 0 }} />
        </div>
      </div>
    </a>
  );
}
