'use client';

export function AdminTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--admin-border, #2a2b33)',
        marginBottom: 24,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? 'var(--fg, #e2e4ea)'
                : 'var(--admin-muted, #6b6e7b)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? '2px solid var(--admin-red, #c0392b)'
                : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
