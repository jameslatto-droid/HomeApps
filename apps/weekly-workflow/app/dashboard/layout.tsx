import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ThemeProvider } from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';
import { FileSpreadsheet, FileText, FolderOpen, Home, LogOut, Upload } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/');
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="governance-theme">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-blue-900 border-r border-white/10 text-white flex flex-col sticky top-0 h-screen shadow-xl">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">
                  Governance
                </h1>
                <p className="text-[10px] text-slate-300">Workflow Manager</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 group"
            >
              <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Home</span>
            </Link>
            <Link
              href="/dashboard/entry"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 group"
            >
              <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>New Entry</span>
            </Link>
            <Link
              href="/dashboard/registers"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 group"
            >
              <FolderOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Registers</span>
            </Link>
            <Link
              href="/dashboard/upload"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 group"
            >
              <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Upload</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <ThemeToggle />
              <form action="/api/auth/logout" method="POST" className="flex-1">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
            <div className="px-2">
              <div className="text-[10px] text-slate-300 truncate">{session.email}</div>
              <div className="text-[9px] text-slate-400 flex items-center justify-between mt-1">
                <span>v1.0</span>
                <span>© 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/40">
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
