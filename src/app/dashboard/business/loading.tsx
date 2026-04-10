export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
          Loading…
        </p>
      </div>
    </div>
  );
}
