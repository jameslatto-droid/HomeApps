# Weekly Workflow App - Quick Start Guide

## ✅ App Successfully Rebuilt!

Your weekly governance workflow app has been completely rebuilt from scratch with all the Google Drive integration you previously worked on.

## 🚀 Next Steps

### 1. Set up Google Cloud Console (Required)

1. Visit: https://console.cloud.google.com/
2. Create/select a project
3. Enable these APIs:
   - Google Drive API
   - Google Sheets API  
   - People API (OAuth)
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Redirect URI: `http://localhost:3000/api/auth/callback`
5. Copy the Client ID and Client Secret

### 2. Configure Environment Variables

1. Copy the example file:
   ```powershell
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add:
   ```env
   SESSION_SECRET=<generate with: openssl rand -base64 32>
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   OPENAI_API_KEY=sk-... (optional, for AI summaries)
   ```

### 3. Run the App

```powershell
npm run dev
```

Then open: http://localhost:3000

## 📋 What Was Built

### Core Features
✅ **Google OAuth Authentication** - Secure login with Google accounts
✅ **Google Drive Integration** - Auto-organize files into weekly folders
✅ **Google Sheets Storage** - Track all governance data in spreadsheets
✅ **Weekly Dashboard** - Progress tracker with quick links
✅ **Data Entry Forms** - Add decisions, risks, datasets, financial items
✅ **File Upload** - Drag-and-drop to weekly Google Drive folders
✅ **Registers View** - Browse all historical governance entries
✅ **AI Summaries** - Generate weekly summaries with OpenAI
✅ **Dark Mode** - Light/dark theme toggle
✅ **Responsive UI** - Beautiful interface with Tailwind CSS

### Google Drive Structure
```
Governance Workflow/
  └── Week 2025-11-18/
      ├── your-files.pdf
      └── ...
```

### Google Sheets Structure
Spreadsheet: "Governance Register"
- **Decisions Sheet**: Status, Owner, Impact
- **Risks Sheet**: Severity, Likelihood, Mitigation
- **Datasets Sheet**: Source, Status, Owner
- **Financial Sheet**: Amount, Category, Status

## 🔧 Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Google APIs (Drive, Sheets, OAuth)
- OpenAI API
- iron-session

## 📚 Documentation

See `README.md` for complete documentation including:
- Full setup instructions
- Architecture details
- API documentation
- Troubleshooting guide

## 🎉 You're Ready!

All the Google Drive API integration work has been restored. Just configure your environment variables and you're good to go!
