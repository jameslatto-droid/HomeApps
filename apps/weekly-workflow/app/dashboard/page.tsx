import { getSession } from '@/lib/session';
import { GoogleSheetsService, GovernanceEntry } from '@/lib/google-sheets';
import { GoogleDriveService } from '@/lib/google-drive';
import { CheckCircle2, Circle, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getSession();
  
  let weeklyEntries: GovernanceEntry[] = [];
  let driveLink = '';
  let sheetsLink = '';

  try {
    if (session.accessToken) {
      const sheetsService = new GoogleSheetsService(session.accessToken);
      const driveService = new GoogleDriveService(session.accessToken);
      
      // Parallel fetching for faster performance
      [weeklyEntries, driveLink, sheetsLink] = await Promise.all([
        sheetsService.getCurrentWeekEntries(),
        driveService.getWeekFolderLink(),
        sheetsService.getSpreadsheetUrl(),
      ]);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }

  // Weekly checklist items
  const checklist = [
    { id: 'decisions', label: 'Log key decisions', completed: weeklyEntries.some(e => e.type === 'decision') },
    { id: 'risks', label: 'Update risk register', completed: weeklyEntries.some(e => e.type === 'risk') },
    { id: 'datasets', label: 'Document datasets', completed: weeklyEntries.some(e => e.type === 'dataset') },
    { id: 'financial', label: 'Record financial items', completed: weeklyEntries.some(e => e.type === 'financial') },
    { id: 'files', label: 'Upload supporting files', completed: false }, // Would need to check Drive
  ];

  const completedCount = checklist.filter(item => item.completed).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Weekly Governance Dashboard
        </h1>
        <p className="text-muted-foreground">
          Week of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Weekly Progress</h2>
          <span className="text-2xl font-bold text-primary">
            {completedCount}/{checklist.length}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-3 mb-6">
          <div
            className="bg-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}
              <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {driveLink && (
          <a
            href={driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-card-foreground mb-1">Week Folder</h3>
                <p className="text-sm text-muted-foreground">View files in Google Drive</p>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </a>
        )}
        {sheetsLink && (
          <a
            href={sheetsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card border border-border rounded-lg p-6 hover:bg-accent transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-card-foreground mb-1">Governance Register</h3>
                <p className="text-sm text-muted-foreground">View all data in Google Sheets</p>
              </div>
              <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </a>
        )}
      </div>

      {/* Recent Entries */}
      {weeklyEntries.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">This Week's Entries</h2>
          <div className="space-y-3">
            {weeklyEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {entry.type}
                    </span>
                    <span className="text-sm font-semibold text-card-foreground">{entry.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
