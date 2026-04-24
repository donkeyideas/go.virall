'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from '@/lib/actions/auth';

export function UserMenu({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-[var(--radius-md)] hover:bg-[var(--paper)] transition-colors"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs text-white font-semibold">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <span className="text-sm text-[var(--fg)] hidden sm:inline">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-[var(--radius-md)] bg-[var(--card-background)] border border-[var(--line)] shadow-[var(--shadow-floating)] py-1 z-[var(--z-dropdown)]">
          <a
            href="/settings"
            className="block px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--paper)]"
          >
            Settings
          </a>
          <hr className="border-[var(--line)] my-1" />
          <form action={signOut}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm text-[var(--color-bad)] hover:bg-[var(--paper)]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
