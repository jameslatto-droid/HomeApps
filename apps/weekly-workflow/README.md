# Weekly Governance Workflow App

A Next.js application for managing weekly project governance workflows with Google Drive and Google Sheets integration.

## Features

- 📝 **Governance Tracking**: Record decisions, risks, datasets, and financial items
- ☁️ **Google Drive Integration**: Automatically organize files into weekly folders
- 📊 **Google Sheets Storage**: Store all governance data in structured spreadsheets
- 🤖 **AI Summaries**: Generate weekly summaries using OpenAI
- 🔐 **Google OAuth**: Secure authentication with Google accounts
- 🎨 **Modern UI**: Beautiful, responsive interface with light/dark mode

## Prerequisites

- Node.js 18+ and npm
- Google Cloud Console project with OAuth 2.0 credentials
- OpenAI API key (for AI summaries feature)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
   - Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
   - Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in the values:

```env
# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Add your Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Add your OpenAI API key
OPENAI_API_KEY=sk-...

NODE_ENV=development
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### Weekly Folder Structure

The app automatically creates a folder structure in your Google Drive:

```
Governance Workflow/
  └── Week 2025-11-18/
      ├── uploaded-file-1.pdf
      ├── uploaded-file-2.docx
      └── ...
  └── Week 2025-11-25/
      └── ...
```

### Google Sheets Structure

A "Governance Register" spreadsheet is created with separate sheets:

- **Decisions**: Track governance decisions with status, owner, and impact
- **Risks**: Record risks with severity, likelihood, and mitigation plans
- **Datasets**: Document data sources and their status
- **Financial**: Track financial items with amounts and categories

### Pages

- **Home (`/`)**: Landing page with Google sign-in
- **Dashboard (`/dashboard`)**: Weekly progress tracker with links to Drive and Sheets
- **New Entry (`/dashboard/entry`)**: Form to add decisions, risks, datasets, or financial items
- **Upload (`/dashboard/upload`)**: Drag-and-drop file upload to weekly Drive folder
- **Registers (`/dashboard/registers`)**: View all governance entries across all weeks

### API Routes

- `POST /api/auth/login`: Initiate Google OAuth flow
- `GET /api/auth/callback`: Handle OAuth callback and create session
- `POST /api/auth/logout`: Destroy session and logout
- `POST /api/entries`: Save governance entry to Google Sheets
- `POST /api/upload`: Upload file to Google Drive
- `POST /api/ai/summary`: Generate AI summary of weekly entries

## Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: iron-session with Google OAuth
- **APIs**: googleapis (Drive & Sheets), OpenAI
- **Icons**: lucide-react

### Project Structure

```
apps/weekly-workflow/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   ├── auth/             # Authentication endpoints
│   │   ├── entries/          # Entry management
│   │   ├── upload/           # File upload
│   │   └── ai/summary/       # AI summary generation
│   ├── dashboard/            # Dashboard pages
│   │   ├── entry/            # New entry form
│   │   ├── upload/           # File upload page
│   │   ├── registers/        # View all entries
│   │   ├── layout.tsx        # Dashboard layout
│   │   └── page.tsx          # Dashboard home
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/               # React components
│   ├── theme-provider.tsx    # Theme context
│   └── theme-toggle.tsx      # Dark mode toggle
├── lib/                      # Utility libraries
│   ├── auth.ts               # OAuth utilities
│   ├── session.ts            # Session management
│   ├── google-drive.ts       # Drive API client
│   └── google-sheets.ts      # Sheets API client
└── package.json              # Dependencies
```

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Troubleshooting

### "Unauthorized" Error

- Ensure `.env.local` has correct Google OAuth credentials
- Check that redirect URI matches in Google Cloud Console
- Verify the APIs are enabled in Google Cloud Console

### Session Issues

- Regenerate `SESSION_SECRET`: `openssl rand -base64 32`
- Clear browser cookies and try again

### API Errors

- Check Google Drive/Sheets API quotas in Google Cloud Console
- Verify OpenAI API key is valid and has credits

## Security Notes

- **Never commit `.env.local`** - it contains sensitive credentials
- Use strong `SESSION_SECRET` (32+ random characters)
- Keep Google OAuth credentials secure
- Rotate OpenAI API key periodically

## License

Private project - All rights reserved © 2025

## Support

For issues or questions, contact the development team.
