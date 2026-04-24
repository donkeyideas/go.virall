'use client';

export interface AdminColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

export function AdminTable<T extends object>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data found',
}: {
  columns: AdminColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--admin-surface, #1a1b20)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--admin-muted, #6b6e7b)',
                  borderBottom: '1px solid var(--admin-border, #2a2b33)',
                  background: 'var(--admin-surface-2, #1f2128)',
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '40px 16px',
                  textAlign: 'center',
                  color: 'var(--admin-muted, #6b6e7b)',
                  fontSize: 13,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={(row as Record<string, unknown>).id as string ?? (row as Record<string, unknown>).key as string ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom:
                    i < data.length - 1
                      ? '1px solid var(--admin-border, #2a2b33)'
                      : 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    'var(--admin-surface-2, #1f2128)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '10px 16px',
                      color: 'var(--fg, #e2e4ea)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
