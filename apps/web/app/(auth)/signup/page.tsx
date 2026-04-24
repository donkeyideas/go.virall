import type { Metadata } from 'next';
import SignUpClient from './signup-client';

export const metadata: Metadata = {
  title: 'Sign Up - Create Your Free Go Virall Account',
  description:
    'Create a free Go Virall account to access viral scoring, AI content studio, and analytics across all social platforms.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/signup' },
};

export default function SignUpPage() {
  return <SignUpClient />;
}
