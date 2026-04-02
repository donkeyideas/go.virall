"use client";

/**
 * Client-side event tracking for web dashboard.
 * Fires-and-forgets to avoid blocking the UI.
 */
export function trackEvent(
  eventType: string,
  screen?: string,
  metadata?: Record<string, unknown>,
): void {
  import("@/lib/actions/events")
    .then(({ trackEvent: serverTrack }) =>
      serverTrack({ eventType, screen, metadata }),
    )
    .catch(() => {
      // Silently ignore tracking failures
    });
}
