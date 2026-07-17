# How It Works

## Manager registration & login

A manager registers with an organization name, their own name, email, and password (`POST /api/auth/register`). This creates an `Organization` and `Manager` document together inside a MongoDB transaction (`src/models/Organization.ts`, `src/models/Manager.ts`) — if either insert fails, both roll back. The password is hashed with bcrypt before storage. On success (and on subsequent logins via `POST /api/auth/login`), a JWT is signed with `jose` (`src/lib/session.ts`) containing `userId`, `userType` (`"manager"` or `"employee"` — see Employee invitation below), `organizationId`, and `email`, and stored in an `httpOnly`, `secure`, `sameSite=lax` cookie valid for 7 days.

`POST /api/auth/logout` clears the cookie. `GET /api/auth/me` returns the current manager (used by server components via `getCurrentManager()` in `src/lib/auth.ts`).

## Route protection

`src/proxy.ts` (Next.js 16's replacement for the older `middleware.ts` convention) intercepts requests to `/dashboard/*`, verifies the session cookie, and redirects to `/login` if it's missing or invalid. It only imports from `src/lib/session.ts` (not `src/lib/auth.ts`), because that file avoids Mongoose — proxy/middleware runs on the Edge runtime, which can't use Node-only modules.

## Forgot password (OTP)

A manager requests an OTP with their registered email (`POST /api/auth/otp/request`). The OTP is a 5-digit code, bcrypt-hashed and stored in Redis under `otp:{email}` with a 90-second TTL (`src/lib/otp.ts`) — that single TTL is both the resend cooldown and the OTP's validity window. The response never reveals whether the email is actually registered.

To complete the reset, the manager submits email + OTP + new password together (`POST /api/auth/otp/reset-password`) rather than verifying the OTP in a separate step. Five wrong attempts locks the email out for 3 minutes (`otp:lock:{email}`).

Emails are sent via Brevo's transactional email API (`src/lib/email.ts`).

## Workspaces

Managers create/rename/trash/restore workspaces scoped to their own organization (`src/models/Workspace.ts`, `src/app/api/workspaces/`). Every id-scoped route (`GET/PATCH/DELETE /api/workspaces/[id]`) checks that the workspace's `organizationId` matches the requesting manager's before doing anything — a workspace belonging to a different organization returns 404 (not 403), so a request can't distinguish "doesn't exist" from "exists but isn't yours."

Deleting a workspace sets `isDeleted`/`deletedAt` rather than removing the document (`DELETE /api/workspaces/[id]`); restoring is a `PATCH { isDeleted: false }` rather than a separate endpoint, since both rename and restore are partial updates to the same resource. `GET /api/workspaces/trash` lists only the soft-deleted ones, powering the `/dashboard/trash` page.

`WorkspaceMember` (`src/models/WorkspaceMember.ts`) exists as a schema already but has no code path that writes to it yet — it stays empty until Phase 2 adds Employees and something can actually be assigned to a workspace. Workspace member counts aren't shown in the UI for the same reason.

## Employee invitation & OAuth sign-in

A manager invites someone to a workspace with `POST /api/workspaces/[id]/invite` (`{email}`). This first checks the org's plan member limit (`src/lib/billing.ts`) against the workspace's current `WorkspaceMember` count. If the email already belongs to an `Employee` in the org, it's assigned directly — no new invite needed, per spec. Otherwise a `src/models/Invitation.ts` record is created (random 32-byte token, 7-day expiry — not specified upstream, a chosen default) and an email goes out via Brevo with a link to `/invite/[token]`.

That page (`src/app/invite/[token]/page.tsx`) is public — no session required — and shows the org/workspace name with "Continue with Google/GitHub" buttons. Those hit `GET /api/oauth/[provider]/start`, which validates the invitation is still pending, signs a short-lived (5 min) `jose` JWT as the OAuth `state` param (carrying `{provider, inviteToken}` — this is the CSRF protection, no cookie or Redis entry needed for it), and redirects to the provider's authorize URL. OAuth itself is hand-rolled (`src/lib/oauth.ts`) rather than a library like Auth.js, specifically so it can plug into the same `createSessionToken`/`setSessionCookie` Manager auth already uses, instead of running two parallel session systems.

`GET /api/oauth/[provider]/callback` verifies the `state`, exchanges the `code` for the provider's profile, and — importantly — checks the OAuth-returned email matches the invitation's email before doing anything else (this isn't explicitly required by the spec, but skipping it would let any Google/GitHub account redeem someone else's invite link). It then re-checks the member limit (defensive, in case two invites were both accepted after the limit was hit), finds-or-creates the `Employee`, creates the `WorkspaceMember`, marks the invitation accepted, and signs the employee in with `userType: "employee"`.

The dashboard, workspace detail page, and Navbar all branch on `session.userType`: a Manager sees every workspace in the org plus create/rename/delete controls; an Employee sees only the workspaces they're an assigned `WorkspaceMember` of, read-only. Manager-initiated unassign, employee self-unassign, and a member-list view are deliberately not built yet (see NOTES.md).

## Pages & Blocknote content

Both Managers (any workspace in their org) and Employees (only workspaces they're a `WorkspaceMember` of) can create and edit pages — `src/lib/workspaces.ts`'s `getAccessibleWorkspace(id, session)` branches on `session.userType` to enforce that, and `src/lib/pages.ts`'s `getAccessiblePage`/`getPageForMutation` build on top of it for page-level routes.

Pages nest via `parentPageId` (`src/models/Page.ts`) — a general tree (any number of children per page), not a chain. A page's actual content lives in a separate `Content` document (`src/models/Content.ts`). Since Phase 4, content is edited exclusively through real-time collaboration (see below) — there's no plain autosave route anymore.

The editor itself (`@blocknote/core` + `@blocknote/react` + `@blocknote/shadcn`) touches `window` during render and can't be server-rendered — `src/components/PageEditorClient.tsx` wraps it in `next/dynamic(..., { ssr: false })` (a plain static import in the Server Component page would 500 with `window is not defined`; `next/dynamic`'s `ssr: false` option also can't be used directly inside a Server Component, hence the separate client-only wrapper file).

Soft-deleting a page cascades to every descendant (`cascadeSoftDelete` in `src/lib/pages.ts`) so a trashed parent never leaves orphaned-but-still-accessible children behind; restoring a page does not cascade back down — a known, documented limitation rather than something solved now. Page trash is scoped per-workspace (`/dashboard/workspaces/[id]/trash`), reachable by anyone with access to that workspace — unlike the global `/dashboard/trash`, which is manager-only and workspace-trash-only.

Favorites (`src/models/Favorite.ts`) use the same `{userId, userType}` pattern as `Message`, so either a Manager or an Employee can favorite a page.

## Real-time collaboration

Page content syncs live via Yjs, through a **standalone WebSocket server** (`server/collaboration.ts`, built on Hocuspocus) — this is a separate long-running Node process from the Next.js app (`npm run dev:collab` locally), since Next.js API routes can't hold persistent connections. It has to be running for the page editor to work at all; there's no non-collaborative fallback.

**Auth**: the session cookie is `httpOnly`, so client JS can't hand it to the WebSocket provider directly. Instead, `PageEditor` first calls `GET /api/pages/[id]/collab-token` (a same-origin fetch — the cookie *is* sent) which checks page access the normal way (`getAccessiblePage`) and signs a 5-minute `jose` JWT (`src/lib/collabToken.ts`) containing `{userId, userType, pageId}`. That token is passed to `HocuspocusProvider`, and the collaboration server's `onAuthenticate` hook verifies it and confirms the `pageId` matches the room being joined.

**Persistence & migration**: `Content.yjsState` (a `Buffer`) is the source of truth once a page has been opened collaboratively. `onLoadDocument` loads it if present; if a page predates Phase 4 (has `blocks` JSON but no `yjsState`), it's bootstrapped transparently on first collaborative open via `@blocknote/server-util`'s `blocksToYXmlFragment` — no bulk migration needed. `onStoreDocument` (debounced by Hocuspocus itself) saves the updated `yjsState` plus a derived `blocks` JSON snapshot, kept for anything that wants plain-JSON reads later without decoding Yjs.

Presence (collaborator cursors, a deterministic color per user) comes along for free from the same `collaboration: {provider, fragment, user}` config Blocknote needs for content sync — no separate infrastructure.

**Module system note**: `server/collaboration.ts` is actually `server/collaboration.mts`. The project has no `"type": "module"` in `package.json`, so a plain `.ts` file run via `tsx` resolves dependencies as CommonJS — which broke `@blocknote/server-util` (a Tiptap ESM/CJS interop bug, `Code.extend is not a function`) at import time. `.mts` forces Node/tsx to treat the file as ESM regardless of the rest of the project, without changing the whole project's module type.

## Inline AI

Selecting text inside a page shows a small floating toolbar (`src/components/InlineAiToolbar.tsx`) with four actions — elaborate, compact, fix grammar, enhance. It's built directly on `BlockNoteEditor`'s own public API (`editor.getSelectedText()`, `editor.onSelectionChange()`, `editor.pasteText()`) and the standard DOM Selection API for positioning the toolbar near the selection — not Blocknote's official `@blocknote/xl-ai` package, which hard-depends on `@blocknote/mantine` and would have reintroduced the exact UI framework Phase 3 avoided, for a feature that's actually just 4 fixed prompts rather than the open-ended chat/tool-calling system that package provides.

Clicking an action sends the selected text to `POST /api/ai/inline` (`{action, text}`), open to any authenticated session (manager or employee) — it's a stateless text transform with no per-page DB read/write, so it doesn't need page-specific access checks. The server (`src/lib/inlineAi.ts`) tries **OpenAI → Gemini → Groq** in order via the Vercel AI SDK's `generateText`, falling through to the next provider on any failure (missing key, bad model, provider outage) until one succeeds or all three have failed. Model IDs are env-configurable (`OPENAI_MODEL`, `GEMINI_MODEL`, `GROQ_MODEL`), not hardcoded.

The result replaces the original selection via `editor.pasteText()`. Known limitation: if the selection changes while the request is in flight, the replacement lands wherever the selection is *when the response arrives*, not the original spot — toolbar buttons are disabled during the request to shrink that window, not eliminate it.

## Search & recently visited

The search bar (`src/components/SearchBar.tsx`) appears in two places, each hitting a different scope: on `/dashboard` it's global (`GET /api/search`) — a Manager searches every workspace/page in the org, an Employee only their assigned workspaces, mirroring the same `session.userType` branch used everywhere else. Inside a workspace it's scoped to that workspace's pages only (`GET /api/workspaces/[id]/search`, reusing `getAccessibleWorkspace`). Both match on **title only** (case-insensitive substring, via a regex-escaped Mongo query — `src/lib/search.ts`'s `escapeRegExp` prevents user input from being interpreted as a regex pattern) — not page content, which lives as Yjs binary since Phase 4 and wasn't asked to be searchable.

Every time `/dashboard/pages/[id]` is opened, `recordVisit` (`src/lib/recentlyVisited.ts`) upserts a `RecentlyVisited` row keyed on `(userId, pageId)`, so revisiting a page just bumps its `visitedAt` instead of creating a duplicate entry. `getRecentlyVisitedPages` (used by both `GET /api/recently-visited` and the `/dashboard/recent` page) fetches a buffer of recent visits, drops any pointing at pages that have since been trashed, and returns the 10 most recent.

## AI assistant widget (RAG)

A fixed bottom-right chat widget (`src/components/AiChatWidgetClient.tsx`, wrapped by the session-checking `AiChatWidget.tsx` — same server-wrapper pattern as `Navbar`) is rendered in `src/app/layout.tsx`, visible on every page but only for a logged-in session. It answers **only from the org's own content** — no outside knowledge, no tool-calling yet (MCP tools are Phase 8).

**Keeping the knowledge base in sync**: every time the collaboration server persists a page's content (`onStoreDocument`, Phase 4), it also calls `reindexPage` (`src/lib/ragIndexing.ts`) — best-effort, wrapped in a try/catch so an indexing failure never blocks the actual content save. `reindexPage` converts the page's Blocknote content to plain text (`@blocknote/server-util`'s `blocksToMarkdownLossy`), splits it into ~1500-character chunks (`src/lib/embeddings.ts`'s `chunkText` — simple fixed-size, no semantic splitter), embeds each chunk (`text-embedding-3-small`), and replaces that page's `KnowledgeChunk` documents. Pages that existed before this phase need a one-time `npm run backfill:embeddings` (their `onStoreDocument` won't refire until their next edit).

**Retrieval**: `POST /api/ai/chat` embeds the user's question and runs a `$vectorSearch` aggregation against `KnowledgeChunk`, pre-filtered by `organizationId` at the Atlas Vector Search index level (`knowledge_chunks_vector_index`, created by `npm run setup:vector-index` — a real MongoDB Atlas Search index, not a Mongoose-level construct). An Employee session gets a further in-app filter down to workspaces they're a member of (`src/lib/rag.ts`'s `retrieveContext`). The retrieved chunks become the system-prompt context for `generateTextWithFallback` (the same OpenAI→Gemini→Groq chain from Phase 5's inline AI, generalized to accept an arbitrary `{system, prompt}` instead of only the four fixed inline-AI actions). Both the user's question and the assistant's reply are persisted to `Message`.

**Module boundary note**: `reindexPage` (in `src/lib/ragIndexing.ts`) must never be imported from `src/app/**` — `@blocknote/server-util` calls `React.createContext` at import time, which Next.js's route/RSC bundler rejects outside a "use client" file, 500ing any route that pulls it in even transitively. `retrieveContext` (in `src/lib/rag.ts`, safe for API routes) is deliberately kept in a separate file from `reindexPage` for exactly this reason.

## Theming

Dark/light mode is hand-rolled (no external theme library): `src/components/ThemeProvider.tsx` holds a React context that toggles a `.dark` class on `<html>` and persists the choice to `localStorage`. An inline script in `src/app/layout.tsx`'s `<head>` applies the stored (or OS-preferred) theme before hydration to avoid a flash of the wrong theme. Tailwind v4's `@custom-variant dark` (in `src/app/globals.css`) makes `dark:` utility classes respond to that class instead of only `prefers-color-scheme`.

## Not implemented yet

MCP tools for the AI assistant (Phase 8 — it's currently Q&A-only, can't take actions like editing or deleting a page) and billing — see the phase-by-phase roadmap in [PRE_BUILD_PLAN.md](PRE_BUILD_PLAN.md). Also not yet built: manager-unassign / employee self-unassign from a workspace, and a workspace member-list view (scope-trimmed out of Phase 2, see NOTES.md).

Production deployment of the collaboration server (a second service alongside the Next.js app) isn't configured — no hosting target has been chosen yet.
