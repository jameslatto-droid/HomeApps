'use client';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-64 bg-muted rounded mb-2"></div>
        <div className="h-4 w-48 bg-muted rounded"></div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="h-6 w-40 bg-muted rounded mb-4"></div>
        <div className="w-full h-3 bg-muted rounded mb-6"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-muted rounded"></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 bg-card border border-border rounded-lg"></div>
        <div className="h-24 bg-card border border-border rounded-lg"></div>
      </div>
    </div>
  );
}
