# Mintza

> From talk to insight.

**[Try it now →](https://endika.github.io/mintza/)**

[![Latest release](https://img.shields.io/github/v/release/Endika/mintza?style=flat-square&color=0066FF&label=release)](https://github.com/Endika/mintza/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Endika/mintza/ci.yml?style=flat-square&label=ci&branch=main)](https://github.com/Endika/mintza/actions/workflows/ci.yml)
[![Last commit](https://img.shields.io/github/last-commit/Endika/mintza?style=flat-square)](https://github.com/Endika/mintza/commits/main)
[![Conventional Commits](https://img.shields.io/badge/conventional_commits-1.0.0-FE5196?style=flat-square)](https://www.conventionalcommits.org)
[![License: MIT](https://img.shields.io/github/license/Endika/mintza?style=flat-square&color=10B981)](./LICENSE)

Mintza is a client-only PWA that records meetings from your microphone, transcribes them with the cloud provider of your choice, and turns the raw transcript into eight kinds of summaries, a sentiment score and a mind map. Everything stays in your browser — no server, no account, no tracking.

## What you can do

- **Record and transcribe.** Hit the mic, talk, stop. Mintza streams the audio to your transcription provider of choice and stitches the result.
- **Eight summary flavors.** Pick the one that fits the meeting and Mintza generates it from the transcript.
- **Sentiment and mind map.** A temperature score for the conversation and an auto-generated mind map you can export.
- **Local history.** Every meeting stays searchable in IndexedDB. The audio itself is never persisted — only the transcript and its derivatives.
- **Bring your own keys.** OpenAI is required; Google, Azure and Anthropic work as optional fallbacks.
- **Take it offline.** Installable PWA. Pin it to your phone or desktop and revisit your meetings without signal.

## How to start

1. Open the [live demo](https://endika.github.io/mintza/).
2. Open **Settings** and paste an [OpenAI API key](https://platform.openai.com/api-keys). Optionally add Google, Azure or Anthropic.
3. Hit the mic, talk through a meeting, stop, and pick the summary you want.

## Install on your device

Open the demo in Chrome, Edge or Safari and use **"Add to Home Screen"** (mobile) or **"Install"** (desktop). You get a full-screen icon, offline access to your history, and automatic updates when a new version ships.

## Privacy

There is no Mintza server. Your API keys, transcripts and summaries live in your own browser. The audio is never persisted — only the transcript and derivatives (summary, statistics, mind map) go to IndexedDB. Audio leaves your browser only when streamed to the transcription provider you configured under your own account. Delete a meeting from the detail page; delete the site from your browser to wipe everything.

---

## For developers

Open-source, MIT licensed. PRs welcome.

**Stack** — TypeScript 5 (strict), vanilla DOM with no framework runtime, Vite, Tailwind CSS v3, Vitest, ESLint + Prettier, release-please for automatic versioning from Conventional Commits.

**Architecture** — Domain-Driven Design across four layers:

```
src/
├── domain/          pure business logic, no external deps
├── application/     use cases that orchestrate domain + infrastructure
├── infrastructure/  AI clients, persistence, browser APIs
└── presentation/    DOM rendering, styles, user interaction
```

**Local dev**

```bash
npm install
npm run dev          # dev server
npm run build        # production build
npm run lint
npm run typecheck
npm run test:run     # tests
```

CI runs lint, typecheck, tests and the production build on every PR.
