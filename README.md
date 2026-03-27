# KMJZ Daily Updates

Partner communication dashboard for KMJZ Holdings. Sections for Urgent, Major Tasks, Production, and Strategic items with per-section feedback.

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/ZweBXA?referralCode=xsbY63)

Or manually:

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub Repo**
3. Select `kmjz-daily-updates`
4. Add environment variable: `ANTHROPIC_API_KEY` (optional — for AI note parsing)
5. Go to **Settings** → **Networking** → **Generate Domain**

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Express.js + SQLite (better-sqlite3) + Drizzle ORM
- **AI:** Anthropic Claude (optional, for parsing raw notes)

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm start
```
