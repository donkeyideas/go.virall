import { mobileApi } from './api';

/**
 * Mobile event tracking — fire-and-forget.
 */
export function trackEvent(
  eventType: string,
  screen?: string,
  metadata?: Record<string, unknown>,
): void {
  mobileApi('/api/mobile/events', {
    method: 'POST',
    body: { eventType, screen, metadata },
  }).catch(() => {
    // Silently ignore tracking failures
  });
}
