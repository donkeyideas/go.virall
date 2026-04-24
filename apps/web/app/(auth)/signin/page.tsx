import type { Metadata } from 'next';
import SignInClient from './signin-client';

export const metadata: Metadata = {
  title: 'Sign In - Access Your Go Virall Dashboard',
  description:
    'Sign in to Go Virall to access your creator dashboard, analytics, viral scores, and AI content studio.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/signin' },
};

export default function SignInPage() {
  return <SignInClient />;
}
