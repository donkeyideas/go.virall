import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-[var(--card-background)] border-[var(--card-border)] shadow-[var(--shadow-card)] rounded-[var(--radius-lg)] p-6',
          '[backdrop-filter:var(--card-backdrop)]',
          interactive && 'card-interactive transition-all cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };
