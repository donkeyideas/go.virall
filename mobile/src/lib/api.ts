import { supabase } from './supabase';

// In production, replace with your deployed domain.
// For local dev on a physical device, use your machine's network IP instead of localhost.
const API_BASE = 'http://localhost:3600';

/** Authenticated fetch wrapper for the Next.js API */
export async function mobileApi<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
): Promise<{ data?: T; error?: string; planLimitReached?: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { error: 'Not authenticated. Please sign in again.' };
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || `Request failed (${res.status})`, planLimitReached: json.planLimitReached };
    }

    return { data: json };
  } catch (err: any) {
    return { error: err.message || 'Network error. Make sure the server is running.' };
  }
}
