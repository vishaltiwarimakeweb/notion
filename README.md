# Notion Clone

An AI-powered, collaborative B2B multi-tenancy CRUD SaaS — organizations get workspaces, nested pages built from block-based content, real-time collaboration, and an AI assistant. See [docs/PRE_BUILD_PLAN.md](docs/PRE_BUILD_PLAN.md) for the full feature set and architecture, and [docs/PROGRESS.md](docs/PROGRESS.md) for what's currently built.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind CSS, MongoDB (Mongoose), Redis (OTP storage), JWT sessions (`jose`), Brevo (transactional email), Cloudinary (media, planned), Razorpay (billing, planned).

## Getting started

1. Copy `.env.example` to `.env.local` and fill in real values (MongoDB URI, JWT secret, Redis URL, Brevo API key/sender).
2. Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000).

## What's implemented so far (Phases 0–1)

- Manager registration (creates an Organization + Manager) and login, with a JWT session cookie.
- Forgot-password flow via a Redis-backed, rate-limited OTP emailed through Brevo.
- `/dashboard` is gated by `src/proxy.ts` (Next.js's route-protection convention) — unauthenticated visitors are redirected to `/login`.
- Landing page, and a light/dark theme toggle across the app.
- Workspace CRUD, scoped to the manager's own organization: create, rename, trash (soft-delete), and restore, with a dashboard list, a per-workspace settings page, and a trash page.

Pages, real-time collaboration, AI features, and billing are not implemented yet — see the phased roadmap in [docs/PRE_BUILD_PLAN.md](docs/PRE_BUILD_PLAN.md).
