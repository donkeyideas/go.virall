import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  system_role: string;
  timezone: string;
  account_type: 'creator' | 'brand' | null;
  company_name: string | null;
  industry: string | null;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  subscription_status: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  organization: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signInWithProvider: async () => ({ error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, organization_id, full_name, avatar_url, role, system_role, timezone, account_type, company_name, industry')
      .eq('id', userId)
      .single();

    setProfile(prof);

    if (prof?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, plan, subscription_status')
        .eq('id', prof.organization_id)
        .single();
      setOrganization(org);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setOrganization(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    try {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: 'Could not get auth URL.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return { error: null }; // user cancelled

      // Parse tokens from redirect URL
      const url = result.url;
      const hashPart = url.includes('#') ? url.split('#')[1] : '';
      const searchPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] : '';
      const combined = [searchPart, hashPart].filter(Boolean).join('&');
      const params = Object.fromEntries(new URLSearchParams(combined));

      if (params.error_code || params.error) {
        return { error: params.error_description || params.error || 'OAuth error' };
      }

      const { access_token, refresh_token } = params;
      if (!access_token) return { error: 'No access token returned.' };

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      return { error: sessionError?.message ?? null };
    } catch (e: any) {
      return { error: e.message || 'OAuth sign-in failed.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, organization, loading, signIn, signUp, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
