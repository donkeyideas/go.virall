'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[image:var(--btn-primary-bg,none)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[var(--btn-primary-border)] shadow-[var(--shadow-button)] hover:brightness-110 active:brightness-95',
        ghost:
          'bg-transparent text-[var(--fg)] hover:bg-[var(--btn-outline-bg)] active:brightness-95',
        outline:
          'text-[var(--fg)] border border-[var(--btn-outline-border)] bg-[var(--btn-outline-bg)] shadow-[var(--btn-outline-shadow)] hover:bg-[var(--btn-outline-hover)] active:brightness-95',
        pink: 'bg-[var(--color-accent)] text-white hover:brightness-110 active:brightness-95',
        ink: 'bg-[var(--ink)] text-[var(--bg)] hover:brightness-110 active:brightness-95',
        danger:
          'bg-[var(--color-bad)] text-white hover:brightness-110 active:brightness-95',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)] gap-1.5',
        md: 'h-10 px-4 text-sm rounded-[var(--radius-md)] gap-2',
        lg: 'h-12 px-6 text-base rounded-[var(--radius-md)] gap-2.5',
        xl: 'h-14 px-8 text-lg rounded-[var(--radius-lg)] gap-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
