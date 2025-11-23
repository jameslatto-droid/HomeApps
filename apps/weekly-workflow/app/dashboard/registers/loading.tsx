'use client';

export default function RegistersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-64 bg-muted rounded mb-2"></div>
        <div className="h-4 w-48 bg-muted rounded"></div>
      </div>

      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-6">
          <div className="h-6 w-40 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
