import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-[var(--paper-2)] text-[var(--fg)]',
        primary: 'bg-[var(--color-primary)] text-white',
        good: 'bg-[var(--color-good)] text-[var(--bg)]',
        warn: 'bg-[var(--color-warn)] text-[var(--bg)]',
        bad: 'bg-[var(--color-bad)] text-white',
        accent: 'bg-[var(--color-accent)] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
