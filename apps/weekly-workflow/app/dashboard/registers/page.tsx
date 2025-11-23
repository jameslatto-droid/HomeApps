import { getSession } from '@/lib/session';
import { GoogleSheetsService, GovernanceEntry } from '@/lib/google-sheets';
import { FileText, AlertTriangle, Database, DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RegistersPage() {
  const session = await getSession();
  
  let decisions: GovernanceEntry[] = [];
  let risks: GovernanceEntry[] = [];
  let datasets: GovernanceEntry[] = [];
  let financial: GovernanceEntry[] = [];

  try {
    if (session.accessToken) {
      const sheetsService = new GoogleSheetsService(session.accessToken);
      
      // Parallel fetching - already optimized
      [decisions, risks, datasets, financial] = await Promise.all([
        sheetsService.getEntries('decision'),
        sheetsService.getEntries('risk'),
        sheetsService.getEntries('dataset'),
        sheetsService.getEntries('financial'),
      ]);
    }
  } catch (error) {
    console.error('Error loading registers:', error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Governance Registers</h1>
        <p className="text-muted-foreground">
          View all governance entries across all weeks
        </p>
      </div>

      {/* Decisions Register */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-card-foreground">
            Decisions ({decisions.length})
          </h2>
        </div>
        <div className="space-y-3">
          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions recorded yet</p>
          ) : (
            decisions.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                  {entry.status && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {entry.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Week: {entry.week}</span>
                  {entry.owner && <span>Owner: {entry.owner}</span>}
                  {entry.impact && <span>Impact: {entry.impact}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Risks Register */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-semibold text-card-foreground">
            Risks ({risks.length})
          </h2>
        </div>
        <div className="space-y-3">
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No risks recorded yet</p>
          ) : (
            risks.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Week: {entry.week}</span>
                  {entry.owner && <span>Owner: {entry.owner}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Datasets Register */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold text-card-foreground">
            Datasets ({datasets.length})
          </h2>
        </div>
        <div className="space-y-3">
          {datasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No datasets recorded yet</p>
          ) : (
            datasets.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                  {entry.status && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                      {entry.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Week: {entry.week}</span>
                  {entry.owner && <span>Owner: {entry.owner}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Financial Register */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-semibold text-card-foreground">
            Financial ({financial.length})
          </h2>
        </div>
        <div className="space-y-3">
          {financial.length === 0 ? (
            <p className="text-sm text-muted-foreground">No financial items recorded yet</p>
          ) : (
            financial.slice(0, 10).map((entry) => (
              <div key={entry.id} className="p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.description}
                    </p>
                  </div>
                  {entry.amount !== undefined && (
                    <span className="text-lg font-bold text-primary">
                      ${entry.amount.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Week: {entry.week}</span>
                  {entry.status && <span>Status: {entry.status}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
