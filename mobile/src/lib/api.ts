import { supabase } from './supabase';

// API base URL — override via EXPO_PUBLIC_API_URL (see eas.json build profiles).
// For local dev on a physical device, use your machine's network IP instead of localhost.
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? 'http://192.168.1.152:3600' : 'https://govirall.com');

/** Authenticated fetch wrapper for the Next.js API */
export async function mobileApi<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
    timeoutMs?: number;
  } = {},
): Promise<{ data?: T; error?: string; planLimitReached?: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Not authenticated. Please sign in again.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 90000);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    clearTimeout(timeout);
    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || `Request failed (${res.status})`, planLimitReached: json.planLimitReached };
    }

    return { data: json };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }
    return { error: err.message || 'Network error. Make sure the server is running.' };
  }
}
