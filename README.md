# MINTZA

**From talk to insight.** Client-only PWA that records meetings from the microphone, transcribes with cloud APIs, generates 8 kinds of summaries, computes sentiment, draws a mind map and keeps a local history.

> 🔴 **Live demo:** https://endika.github.io/mintza/

[![CI](https://github.com/Endika/mintza/actions/workflows/ci.yml/badge.svg)](https://github.com/Endika/mintza/actions/workflows/ci.yml)
[![Release & Deploy](https://github.com/Endika/mintza/actions/workflows/release.yml/badge.svg)](https://github.com/Endika/mintza/actions/workflows/release.yml)
[![GitHub release](https://img.shields.io/github/v/release/Endika/mintza)](https://github.com/Endika/mintza/releases)

## Stack

- TypeScript 5 strict
- Vanilla TS (no framework)
- Vite + Tailwind v3
- Vitest
- DDD with 4 layers: domain / application / infrastructure / presentation

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/mintza/`.

On first launch the app asks you to configure your own API keys (OpenAI is required; Google / Azure / Anthropic are optional fallbacks). Keys are kept in your browser only — there is no MINTZA backend.

## Privacy

- API keys live in `localStorage`, never sent to any MINTZA server (there is no server).
- The audio is **not** persisted. Only the transcription and derivatives (summary, statistics) go to IndexedDB.
- The transcription is sent to the providers you configure (OpenAI etc.) under your own account and consent.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Run Prettier |

## Quality gates

CI runs typecheck, lint, tests and build on every pull request. Semantic-release publishes a versioned tag from the `main` branch and triggers the GitHub Pages deploy.

Dependabot keeps npm and GitHub Actions dependencies up to date.

Conventional Commits are required:

```
feat(scope): short imperative subject
fix(scope): ...
chore(scope): ...
docs: ...
```

## License

MIT.
