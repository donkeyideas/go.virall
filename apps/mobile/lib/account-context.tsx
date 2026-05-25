import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './auth';

export interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  syncStatus: string;
}

interface AccountContextValue {
  accounts: ConnectedAccount[];
  accountsLoading: boolean;
  selectedAccountId: string | null;
  selectedPlatform: string | null;
  setSelectedAccount: (id: string | null, platform: string | null) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
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
    } catch {
      // silent — pages handle empty accounts gracefully
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchAccounts();
    } else {
      setAccounts([]);
      setSelectedAccountId(null);
      setSelectedPlatform(null);
      setAccountsLoading(false);
    }
  }, [user, authLoading, fetchAccounts]);

  const setSelectedAccount = useCallback((id: string | null, platform: string | null) => {
    setSelectedAccountId(id);
    setSelectedPlatform(platform);
  }, []);

  return (
    <AccountContext.Provider value={{
      accounts,
      accountsLoading,
      selectedAccountId,
      selectedPlatform,
      setSelectedAccount,
      refreshAccounts: fetchAccounts,
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
