import type { Metadata } from 'next';
import ResetPasswordClient from './reset-password-client';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Reset your Go Virall account password.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
