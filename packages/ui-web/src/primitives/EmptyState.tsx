import type { ReactNode } from 'react';
import { cn } from '../utils';

interface EmptyStateProps {
  icon?: ReactNode;
  headline: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

function EmptyState({
  icon,
  headline,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--muted)]">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-[var(--fg)] mb-2">
        {headline}
      </h3>
      <p className="text-sm text-[var(--muted)] max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}

export { EmptyState };
