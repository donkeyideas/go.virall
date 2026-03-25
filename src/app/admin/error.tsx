"use client";

import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="border border-rule bg-surface-card p-8 text-center max-w-md">
        <AlertTriangle size={32} className="mx-auto mb-4 text-editorial-red" />
        <h2 className="font-serif text-lg font-bold text-ink mb-2">
          Something went wrong
        </h2>
        <p className="text-xs text-ink-muted mb-4 font-mono">
          {error.message || "An unexpected error occurred in the admin panel."}
        </p>
        <button
          onClick={reset}
          className="border border-rule px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
