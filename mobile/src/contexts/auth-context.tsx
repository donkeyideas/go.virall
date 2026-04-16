import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// Native modules (Google Sign-In, Apple Auth) are NOT available in Expo Go.
// They're lazy-loaded inside the sign-in handlers so the app can still boot in
// Expo Go for day-to-day testing of everything else.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let googleConfigured = false;
function loadGoogleSignin(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin');
    if (!googleConfigured && GOOGLE_WEB_CLIENT_ID) {
      mod.GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: false,
      });
      googleConfigured = true;
    }
    return mod;
  } catch {
    return null;
  }
}

function loadAppleAuth(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-apple-authentication');
  } catch {
    return null;
  }
}

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

  const signInWithApple = async (): Promise<{ error: string | null }> => {
    const AppleAuthentication = loadAppleAuth();
    if (!AppleAuthentication) {
      return { error: 'Apple Sign-In requires a dev build (not available in Expo Go).' };
    }
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        return { error: 'Apple Sign-In is not available on this device.' };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: 'No identity token returned by Apple.' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      return { error: error?.message ?? null };
    } catch (e: any) {
      // user cancelled — treat as non-error
      if (e?.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: e?.message || 'Apple Sign-In failed.' };
    }
  };

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    const mod = loadGoogleSignin();
    if (!mod) {
      return { error: 'Google Sign-In requires a dev build (not available in Expo Go).' };
    }
    const { GoogleSignin, statusCodes } = mod;
    try {
      if (!GOOGLE_WEB_CLIENT_ID) {
        return { error: 'Google Sign-In is not configured.' };
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      // v16 returns { type: 'success', data: { idToken, user } } or { type: 'cancelled' }
      if (response.type === 'cancelled') return { error: null };

      const idToken = response.data?.idToken;
      if (!idToken) return { error: 'No idToken returned by Google.' };

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      return { error: error?.message ?? null };
    } catch (e: any) {
      if (
        e?.code === statusCodes.SIGN_IN_CANCELLED ||
        e?.code === statusCodes.IN_PROGRESS
      ) {
        return { error: null };
      }
      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { error: 'Google Play Services unavailable.' };
      }
      return { error: e?.message || 'Google Sign-In failed.' };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (provider === 'apple') {
      if (Platform.OS !== 'ios') {
        return { error: 'Apple Sign-In is only available on iOS.' };
      }
      return signInWithApple();
    }
    return signInWithGoogle();
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
