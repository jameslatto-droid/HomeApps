import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <FileSpreadsheet className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Governance Workflow
          </h1>
          <p className="text-xl text-slate-300">
            Weekly project governance workflow management
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">Features</h2>
          <ul className="space-y-4 text-slate-300 mb-8">
            <li className="flex items-start">
              <span className="text-blue-400 mr-3">✓</span>
              <span>Track weekly governance decisions, risks, and datasets</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-3">✓</span>
              <span>Upload files to Google Drive organized by week</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-3">✓</span>
              <span>Store governance data in Google Sheets</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-3">✓</span>
              <span>AI-powered weekly summaries</span>
            </li>
          </ul>

          <Link
            href="/api/auth/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-center"
          >
            Sign in with Google
          </Link>
        </div>

        <p className="text-center text-slate-400 text-sm mt-8">
          Secure authentication powered by Google OAuth
        </p>
      </div>
    </div>
  );
}
