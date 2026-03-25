export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-surface-raised mb-6" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-rule bg-surface-card p-4 h-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border border-rule h-64" />
        <div className="border border-rule h-64" />
      </div>
    </div>
  );
}
