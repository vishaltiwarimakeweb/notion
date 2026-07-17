# Notion Clone

An AI-powered, collaborative B2B multi-tenancy CRUD SaaS — organizations get workspaces, nested pages built from block-based content, real-time collaboration, and an AI assistant. See [docs/PRE_BUILD_PLAN.md](docs/PRE_BUILD_PLAN.md) for the full feature set and architecture, and [docs/PROGRESS.md](docs/PROGRESS.md) for what's currently built.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, MongoDB (Mongoose) + MongoDB Atlas Vector Search (RAG), Redis (OTP storage), JWT sessions (`jose`), Brevo (transactional email), Blocknote (`@blocknote/shadcn`) for page content, Yjs + Hocuspocus (standalone WebSocket server) for real-time collaboration, Vercel AI SDK (OpenAI → Gemini → Groq fallback) for inline AI and the RAG assistant, Cloudinary (media, planned), Razorpay (billing, planned).

## Getting started

1. Copy `.env.example` to `.env.local` and fill in real values (MongoDB URI, JWT secret, Redis, Brevo, OAuth, collaboration server port, AI provider keys).
2. Install dependencies, then **once** set up the AI assistant's search index:

```bash
npm install
npm run setup:vector-index    # one-time — creates the Atlas Vector Search index
npm run backfill:embeddings   # one-time — indexes any pages that already exist
```

3. Run **both** dev processes (real-time collaboration needs its own server):

```bash
npm run dev          # Next.js app, in one terminal
npm run dev:collab   # collaboration WebSocket server, in another
```

4. Open [http://localhost:3000](http://localhost:3000).

## What's implemented so far (Phases 0–7)

- Manager registration (creates an Organization + Manager) and login, with a JWT session cookie.
- Forgot-password flow via a Redis-backed, rate-limited OTP emailed through Brevo.
- `/dashboard` is gated by `src/proxy.ts` (Next.js's route-protection convention) — unauthenticated visitors are redirected to `/login`.
- Landing page, and a light/dark theme toggle across the app.
- Workspace CRUD, scoped to the manager's own organization: create, rename, trash (soft-delete), and restore, with a dashboard list, a per-workspace settings page, and a trash page.
- Employee invitation: a manager invites an email to a workspace; the employee accepts via a public link and signs in with Google or GitHub (no password) — see `GOOGLE_CLIENT_ID`/`GITHUB_CLIENT_ID` etc. in `.env.example` to enable the OAuth handshake. Dashboard and workspace pages are read-only for employees, scoped to workspaces they're assigned to.
- Page CRUD with infinitely nestable pages, available to both managers and assigned employees: create, rename, trash (cascades to nested pages), restore, and favorite.
- Real-time collaborative page editing (Blocknote + Yjs) with live cursors — requires `npm run dev:collab` running alongside the Next.js app; see `docs/HOW_IT_WORKS.md` for how auth and persistence work across the two processes.
- Inline AI: select text in a page for elaborate/compact/fix-grammar/enhance actions, backed by an OpenAI → Gemini → Groq fallback chain — see `.env.example` for the provider API keys.
- Search (title-only, scoped to what the current session can access) on the dashboard and inside each workspace, plus a recently-visited pages list.
- AI assistant widget (bottom-right, on every page when logged in): answers questions using only the org's own content (RAG over page content via MongoDB Atlas Vector Search), scoped the same way as everything else — an Employee's questions only draw on workspaces they belong to. Q&A only for now; MCP tool-calling (letting it take actions like editing a page) is a later phase.

Billing is not implemented yet — see the phased roadmap in [docs/PRE_BUILD_PLAN.md](docs/PRE_BUILD_PLAN.md).
