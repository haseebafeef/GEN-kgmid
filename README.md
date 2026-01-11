# Wikidata Automation Tool

An automated tool to find Google Knowledge Graph IDs (`/g/...` or `/m/...`) for Wikidata items and generate QuickStatements for batch editing.

## Features
- **Upload JSON**: Parses Wikidata SPARQL JSON exports.
- **Auto-Search**: Uses Google Knowledge Graph Search API (Enterprise or Standard).
- **Parallel Processing**: Supports multiple API keys for high-speed concurrent processing.
- **ID Detection**: Distinguishes between Freebase ID (P646) and Google Knowledge Graph ID (P2671).
- **QuickStatements**: Generates ready-to-use CSV/TXT files for Wikidata mass edits.

## Tech Stack
-   **Framework**: Next.js 14
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **API**: Google Knowledge Graph Search API

## Setup Instructions

### 1. Installation
```bash
npm install
```

### 2. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Deployment Guide

### GitHub Setup
1.  Initialize a git repository:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```
2.  Create a new repository on GitHub.
3.  Push your code:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/repo-name.git
    git push -u origin main
    ```

### Vercel Deployment
1.  Go to [Vercel](https://vercel.com) and sign up/login.
2.  Click **"Add New..."** > **"Project"**.
3.  Select your GitHub repository.
4.  **Build Settings**: The default Next.js settings are usually correct.
    -   Framework Preset: `Next.js`
    -   Build Command: `next build`
    -   Output Directory: `.next` (or default)
5.  Click **Deploy**.

**Note**: Since the API Key is entered by the user in the UI, you do **not** need to set any Environment Variables in Vercel for the basic functionality.
