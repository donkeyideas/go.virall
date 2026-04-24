import * as SecureStore from 'expo-secure-store';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// In dev: Android emulator uses 10.0.2.2, physical devices use the host machine IP.
// Expo sets debuggerHost to "IP:PORT" — extract the IP from that.
function getDevApiBase(): string {
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost ?? '';
  const hostIp = debuggerHost.split(':')[0];
  if (hostIp) return `http://${hostIp}:3700/api`;
  // Fallback for Android emulator
  if (Platform.OS === 'android') return 'http://10.0.2.2:3700/api';
  return 'http://localhost:3700/api';
}

const API_BASE = __DEV__
  ? getDevApiBase()
  : 'https://www.govirall.com/api';

if (__DEV__) {
  console.log('[api] API_BASE =', API_BASE);
}

class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('access_token');
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }

  const json = await res.json();
  // API wraps responses in { data: ... } — unwrap for convenience
  return (json?.data !== undefined ? json.data : json) as T;
}

// Convenience methods
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
