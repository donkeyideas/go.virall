'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type, style, disabled, ...props }, ref) => {
    return (
      <div style={{ width: '100%' }}>
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          style={{
            display: 'flex',
            width: '100%',
            height: 48,
            borderRadius: 14,
            background: 'var(--input-bg)',
            border: error
              ? '1.5px solid var(--color-bad)'
              : '1px solid var(--input-border)',
            boxShadow: 'var(--input-shadow)',
            padding: '12px 16px',
            font: 'inherit',
            fontSize: 14,
            color: 'var(--fg)',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
            ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--input-focus-border)';
            e.currentTarget.style.boxShadow = 'var(--input-focus-ring)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error
              ? 'var(--color-bad)'
              : 'var(--input-border)';
            e.currentTarget.style.boxShadow = 'var(--input-shadow, none)';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--color-bad)' }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
