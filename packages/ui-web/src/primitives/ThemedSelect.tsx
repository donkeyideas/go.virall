'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type Option = { label: string; value: string };
type OptionGroup = { group: string; options: Option[] };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: (Option | OptionGroup)[];
  name?: string;
  placeholder?: string;
  theme: string;
};

function isGroup(opt: Option | OptionGroup): opt is OptionGroup {
  return 'group' in opt;
}

export function ThemedSelect({ value, onChange, options, name, placeholder, theme }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  // Find display label for current value
  let displayLabel = placeholder ?? 'Select…';
  for (const opt of options) {
    if (isGroup(opt)) {
      const found = opt.options.find((o) => o.value === value);
      if (found) { displayLabel = found.label; break; }
    } else if (opt.value === value) {
      displayLabel = opt.label;
      break;
    }
  }

  // Position dropdown relative to trigger
  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  // Scroll to selected item when opened
  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (active) active.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 38px 0 14px',
    borderRadius: 14,
    fontSize: 14,
    color: 'var(--fg)',
    background: 'var(--input-bg)',
    border: isEditorial
      ? '1.5px solid var(--ink)'
      : `1px solid var(--input-border, rgba(255,255,255,.12))`,
    boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
    outline: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    font: 'inherit',
    position: 'relative',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: pos.width,
    maxHeight: 280,
    overflowY: 'auto',
    zIndex: 99999,
    borderRadius: isEditorial ? 8 : 14,
    padding: '6px 0',
    ...(isEditorial
      ? { background: 'var(--paper)', border: '1.5px solid var(--ink)', boxShadow: '5px 5px 0 var(--ink)' }
      : isNeumorphic
      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-lg)' }
      : { background: 'var(--bg-mid, #120a27)', border: '1px solid var(--line)', boxShadow: '0 20px 60px -10px rgba(0,0,0,.7)', backdropFilter: 'blur(24px)' }),
  };

  const itemBase: React.CSSProperties = {
    padding: '9px 14px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: 'var(--fg)',
  };

  const groupLabelStyle: React.CSSProperties = {
    padding: '10px 14px 4px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    pointerEvents: 'none',
  };

  function renderOption(opt: Option) {
    const isActive = opt.value === value;
    return (
      <div
        key={opt.value}
        data-active={isActive}
        onClick={() => { onChange(opt.value); setOpen(false); }}
        style={{
          ...itemBase,
          fontWeight: isActive ? 600 : 400,
          background: isActive
            ? isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--surface-darker, #c7ccd4)' : 'rgba(139,92,246,.2)'
            : 'transparent',
          color: isActive
            ? isEditorial ? 'var(--paper)' : 'var(--fg)'
            : 'var(--fg)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background =
            isEditorial ? 'var(--paper-2)' : isNeumorphic ? 'var(--surface-darker, #dde2ea)' : 'rgba(255,255,255,.06)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {opt.label}
      </div>
    );
  }

  function handleToggle() {
    if (!open) updatePos();
    setOpen(!open);
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button ref={triggerRef} type="button" onClick={handleToggle} style={triggerStyle}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
            transition: 'transform 0.2s',
          }}
        >
          <path d="M1 1l4 4 4-4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown — portaled to body so it escapes any stacking context */}
      {open && createPortal(
        <div ref={listRef} style={dropdownStyle}>
          {options.map((opt, i) =>
            isGroup(opt) ? (
              <div key={opt.group}>
                {i > 0 && (
                  <div style={{ height: 1, background: isEditorial ? 'var(--rule)' : 'var(--line)', margin: '4px 10px' }} />
                )}
                <div style={groupLabelStyle}>{opt.group}</div>
                {opt.options.map(renderOption)}
              </div>
            ) : (
              renderOption(opt)
            ),
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
