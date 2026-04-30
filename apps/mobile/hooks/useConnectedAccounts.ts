import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  syncStatus: string;
}

interface UseConnectedAccountsReturn {
  accounts: ConnectedAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConnectedAccounts(): UseConnectedAccountsReturn {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await api.get<any[]>('/platforms');
      const healthy = (raw ?? [])
        .filter((p: any) => p.sync_status === 'healthy')
        .map((p: any): ConnectedAccount => ({
          id: p.id,
          platform: p.platform,
          username: p.platform_username ?? '',
          displayName: p.platform_display_name ?? null,
          avatarUrl: p.avatar_url ?? null,
          followerCount: p.follower_count ?? 0,
          syncStatus: p.sync_status,
        }))
        .sort((a: ConnectedAccount, b: ConnectedAccount) => b.followerCount - a.followerCount);
      setAccounts(healthy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  return { accounts, loading, error, refresh: fetchAccounts };
}
