import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://qrtbfhhhilcoeovdubqb.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydGJmaGhoaWxjb2VvdmR1YnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMDM4MDUsImV4cCI6MjA4OTY3OTgwNX0.vJmTxT36lHf2IowpDtS0XS_kbyv1JH32aPeHJePpGb8';

/**
 * SecureStore on native (encrypted via Keychain/Keystore).
 * AsyncStorage on web where SecureStore is not available.
 * SecureStore has a 2KB limit per value — Supabase tokens fit easily.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : (ExpoSecureStoreAdapter as any),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
