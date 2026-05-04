'use server';

import { createServerClient } from '@govirall/db/server';
import { redirect } from 'next/navigation';

// Detect gibberish: long runs of mixed-case with no spaces/vowel patterns
function looksLikeGibberish(name: string): boolean {
  if (!name || name.length < 3) return false;
  // More than 12 chars with no spaces and heavy mixed case → likely bot
  if (name.length > 12 && !name.includes(' ') && /[A-Z].*[a-z].*[A-Z]/.test(name)) {
    const upper = (name.match(/[A-Z]/g) || []).length;
    const ratio = upper / name.length;
    if (ratio > 0.3 && ratio < 0.8) return true;
  }
  // Pure random characters — no vowels in a long string
  if (name.length > 8 && !/[aeiouAEIOU]/.test(name)) return true;
  return false;
}

export async function signUp(formData: FormData) {
  const supabase = await createServerClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('displayName') as string;

  // Honeypot — bots fill this hidden field, real users don't
  const website = formData.get('website') as string;
  if (website) {
    // Silently reject — don't reveal this is a bot trap
    return { success: true, message: 'Check your email to verify your account.' };
  }

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // Reject gibberish display names (common bot pattern)
  if (looksLikeGibberish(displayName)) {
    return { error: 'Please enter a valid display name' };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split('@')[0],
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Check your email to verify your account.' };
}

export async function signIn(formData: FormData) {
  const supabase = await createServerClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirect') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo || '/today');
}

export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600'}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/signin');
}

export async function resetPassword(formData: FormData) {
  const supabase = await createServerClient();

  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600'}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: 'Check your email for a password reset link.' };
}
