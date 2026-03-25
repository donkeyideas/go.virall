"use client";

import { cn } from "@/lib/utils";

export interface PaperHeaderProps {
  dateLine: string;
  title: string;
  accentText?: string;
  tagline?: string;
  className?: string;
}

export function PaperHeader({
  dateLine,
  title,
  accentText,
  tagline,
  className,
}: PaperHeaderProps) {
  function renderTitle() {
    if (!accentText) return <>{title}</>;
    const idx = title.indexOf(accentText);
    if (idx === -1) return <>{title}</>;
    const before = title.slice(0, idx);
    const after = title.slice(idx + accentText.length);
    return (
      <>
        {before}
        <span className="text-editorial-red">{accentText}</span>
        {after}
      </>
    );
  }

  return (
    <header
      className={cn(
        "border-b-4 border-double border-rule-dark bg-surface-card px-4 sm:px-6 pb-4 sm:pb-5 pt-4 sm:pt-6 text-center",
        className,
      )}
    >
      <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
        {dateLine}
      </p>
      <h1 className="font-serif text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-black leading-none tracking-tight text-ink">
        {renderTitle()}
      </h1>
      {tagline && (
        <p className="mt-3 font-serif text-[13px] sm:text-[15px] italic text-ink-muted">
          {tagline}
        </p>
      )}
    </header>
  );
}
